import { createHash } from 'node:crypto'
import { z } from 'zod'
import rawReleaseManifest from '@/release-manifest.json'
import { envSchema } from '@/server/env'
import { compareSystemVersions, isValidSystemVersion } from './version'

const releaseManifestEnvKeySchema = envSchema.keyof()

const releasePostUpdateTaskSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  required: z.boolean().default(true),
})

export const releaseSeedPolicySchema = z.enum(['none', 'idempotent_bootstrap', 'manual_review'])

export const releaseManifestSchema = z
  .object({
    version: z.string().trim().min(1),
    releaseDate: z.string().date(),
    minSupportedFrom: z.string().trim().min(1),
    requiresMaintenance: z.boolean(),
    requiresBackup: z.boolean(),
    newRequiredEnvKeys: z.array(releaseManifestEnvKeySchema).default([]),
    seedPolicy: releaseSeedPolicySchema,
    postUpdateTasks: z.array(releasePostUpdateTaskSchema).default([]),
    breakingNotes: z.array(z.string().trim().min(1)).default([]),
  })
  .superRefine((manifest, context) => {
    if (!isValidSystemVersion(manifest.version)) {
      context.addIssue({
        code: 'custom',
        message: 'Manifest version must follow the supported PetOS version format.',
        path: ['version'],
      })
    }

    if (!isValidSystemVersion(manifest.minSupportedFrom)) {
      context.addIssue({
        code: 'custom',
        message: 'minSupportedFrom must follow the supported PetOS version format.',
        path: ['minSupportedFrom'],
      })
    }

    if (
      isValidSystemVersion(manifest.version) &&
      isValidSystemVersion(manifest.minSupportedFrom) &&
      compareSystemVersions(manifest.minSupportedFrom, manifest.version) > 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'minSupportedFrom cannot be greater than the release version.',
        path: ['minSupportedFrom'],
      })
    }

    const duplicatedKeys = manifest.newRequiredEnvKeys.filter(
      (key, index) => manifest.newRequiredEnvKeys.indexOf(key) !== index,
    )

    if (duplicatedKeys.length > 0) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate env keys are not allowed in the release manifest: ${duplicatedKeys.join(', ')}.`,
        path: ['newRequiredEnvKeys'],
      })
    }
  })

export type ReleaseManifest = z.infer<typeof releaseManifestSchema>
export type ReleaseManifestEnvKey = z.infer<typeof releaseManifestEnvKeySchema>

export interface ReleaseManifestLoadSuccess {
  hash: string
  manifest: ReleaseManifest
  ok: true
}

export interface ReleaseManifestLoadFailure {
  error: string
  ok: false
}

export type ReleaseManifestLoadResult = ReleaseManifestLoadSuccess | ReleaseManifestLoadFailure

function buildReleaseManifestHash(manifest: ReleaseManifest) {
  return createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
}

export function parseReleaseManifest(rawManifest: unknown): ReleaseManifest {
  return releaseManifestSchema.parse(rawManifest)
}

export function loadEmbeddedReleaseManifest(
  rawManifest: unknown = rawReleaseManifest,
): ReleaseManifestLoadResult {
  try {
    const manifest = parseReleaseManifest(rawManifest)

    return {
      hash: buildReleaseManifestHash(manifest),
      manifest,
      ok: true,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown release manifest error.',
      ok: false,
    }
  }
}

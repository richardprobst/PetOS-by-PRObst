import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const packageVersionSchema = z.object({
  version: z.string().min(1),
})

let cachedBuildVersion: string | undefined
const systemVersionRegex = /^v?(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:[-+].+)?$/

export interface ParsedSystemVersion {
  major: number
  minor: number
  normalized: string
  patch: number
  raw: string
}

export function getBuildVersion() {
  if (!cachedBuildVersion) {
    const packageJsonPath = join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    cachedBuildVersion = packageVersionSchema.parse(packageJson).version
  }

  return cachedBuildVersion
}

export function resetBuildVersionCacheForTests() {
  cachedBuildVersion = undefined
}

export function parseSystemVersion(version: string): ParsedSystemVersion | null {
  const trimmedVersion = version.trim()
  const match = systemVersionRegex.exec(trimmedVersion)

  if (!match?.groups) {
    return null
  }

  const major = Number(match.groups.major)
  const minor = Number(match.groups.minor)
  const patch = Number(match.groups.patch)

  if ([major, minor, patch].some((segment) => Number.isNaN(segment))) {
    return null
  }

  return {
    major,
    minor,
    normalized: `${major}.${minor}.${patch}`,
    patch,
    raw: trimmedVersion,
  }
}

export function isValidSystemVersion(version: string) {
  return parseSystemVersion(version) !== null
}

export function compareSystemVersions(left: string, right: string) {
  const parsedLeft = parseSystemVersion(left)
  const parsedRight = parseSystemVersion(right)

  if (!parsedLeft || !parsedRight) {
    throw new Error('Cannot compare invalid PetOS versions.')
  }

  if (parsedLeft.major !== parsedRight.major) {
    return parsedLeft.major - parsedRight.major
  }

  if (parsedLeft.minor !== parsedRight.minor) {
    return parsedLeft.minor - parsedRight.minor
  }

  return parsedLeft.patch - parsedRight.patch
}

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loadEmbeddedReleaseManifest,
  parseReleaseManifest,
} from '../../../server/system/release-manifest'

test('parseReleaseManifest rejects an invalid embedded manifest', () => {
  assert.throws(
    () =>
      parseReleaseManifest({
        breakingNotes: [],
        minSupportedFrom: '0.2.0',
        newRequiredEnvKeys: [],
        postUpdateTasks: [],
        releaseDate: '2026-04-05',
        requiresBackup: true,
        requiresMaintenance: true,
        seedPolicy: 'none',
      }),
    /version/i,
  )
})

test('loadEmbeddedReleaseManifest returns a hash for a valid manifest', () => {
  const result = loadEmbeddedReleaseManifest({
    breakingNotes: ['release ok'],
    minSupportedFrom: '0.2.0',
    newRequiredEnvKeys: [],
    postUpdateTasks: [],
    releaseDate: '2026-04-05',
    requiresBackup: true,
    requiresMaintenance: true,
    seedPolicy: 'none',
    version: '0.3.0',
  })

  assert.equal(result.ok, true)

  if (!result.ok) {
    throw new Error('Expected a valid manifest result.')
  }

  assert.equal(result.manifest.version, '0.3.0')
  assert.match(result.hash, /^[a-f0-9]{64}$/)
})

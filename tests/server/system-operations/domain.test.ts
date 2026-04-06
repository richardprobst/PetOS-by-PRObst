import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getLifecycleLabel,
  getLifecycleTone,
} from '../../../features/system-operations/domain'

test('getLifecycleTone marks installed as success and retained states as danger', () => {
  assert.equal(getLifecycleTone('INSTALLED'), 'success')
  assert.equal(getLifecycleTone('NOT_INSTALLED'), 'warning')
  assert.equal(getLifecycleTone('MAINTENANCE'), 'danger')
  assert.equal(getLifecycleTone('REPAIR'), 'danger')
})

test('getLifecycleLabel returns stable portuguese labels for runtime states', () => {
  assert.equal(getLifecycleLabel('MAINTENANCE'), 'Manutencao')
  assert.equal(getLifecycleLabel('UPDATE_FAILED'), 'Falha de update')
  assert.equal(getLifecycleLabel('REPAIR'), 'Reparo')
})

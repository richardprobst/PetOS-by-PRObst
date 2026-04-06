import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeAuditDetails } from '../../../server/audit/sanitize'

test('sanitizeAuditDetails redacts sensitive keys recursively', () => {
  const result = sanitizeAuditDetails({
    password: 'secret',
    nested: {
      accessToken: 'abc',
      cookieValue: 'def',
    },
    safe: 'ok',
  }) as {
    password: string
    nested: {
      accessToken: string
      cookieValue: string
    }
    safe: string
  }

  assert.equal(result.password, '[REDACTED]')
  assert.equal(result.nested.accessToken, '[REDACTED]')
  assert.equal(result.nested.cookieValue, '[REDACTED]')
  assert.equal(result.safe, 'ok')
})

test('sanitizeAuditDetails truncates long strings and serializes dates', () => {
  const date = new Date('2026-03-31T12:00:00.000Z')
  const result = sanitizeAuditDetails({
    note: 'x'.repeat(320),
    occurredAt: date,
  }) as {
    note: string
    occurredAt: string
  }

  assert.equal(result.note.length, 303)
  assert.match(result.note, /\.\.\.$/)
  assert.equal(result.occurredAt, date.toISOString())
})

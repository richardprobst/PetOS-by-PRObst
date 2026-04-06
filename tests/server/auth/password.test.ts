import assert from 'node:assert/strict'
import test from 'node:test'
import { hashPassword, verifyPassword } from '../../../server/auth/password'

test('hashPassword gera um hash verificável com salt embutido', async () => {
  const password = 'SenhaSegura123'
  const passwordHash = await hashPassword(password)

  assert.notEqual(passwordHash, password)
  assert.match(passwordHash, /^[0-9a-f]+:[0-9a-f]+$/)
  assert.equal(await verifyPassword(password, passwordHash), true)
})

test('verifyPassword rejeita senha incorreta e hash malformado', async () => {
  const passwordHash = await hashPassword('SenhaSegura123')

  assert.equal(await verifyPassword('SenhaErrada123', passwordHash), false)
  assert.equal(await verifyPassword('SenhaSegura123', 'hash-invalido'), false)
})

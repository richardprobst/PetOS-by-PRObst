import assert from 'node:assert/strict'
import test from 'node:test'
import { writeConfigurationChange } from '../../../features/configuration/audit'

test('writeConfigurationChange records both configuration change and audit trail for ordinary settings', async () => {
  const configurationChanges: unknown[] = []
  const auditLogs: unknown[] = []

  await writeConfigurationChange(
    {
      auditLog: {
        create: async ({ data }) => {
          auditLogs.push(data)
          return data
        },
      },
      configurationChange: {
        create: async ({ data }) => {
          configurationChanges.push(data)
          return data
        },
      },
    },
    {
      afterValue: { value: 'PetOS Pro' },
      beforeValue: { value: 'PetOS' },
      category: 'GENERAL',
      changeType: 'UPDATED',
      changedByUserId: 'user_admin',
      impactLevel: 'MODERATE',
      key: 'tenant.identity.public_name',
      scope: 'TENANT_GLOBAL',
      summary: 'Ajuste do nome publico principal.',
    },
  )

  assert.equal(configurationChanges.length, 1)
  assert.equal(auditLogs.length, 1)
  assert.deepEqual(
    configurationChanges[0],
    {
      afterValue: { value: 'PetOS Pro' },
      beforeValue: { value: 'PetOS' },
      category: 'GENERAL',
      changeType: 'UPDATED',
      changedByUserId: 'user_admin',
      impactLevel: 'MODERATE',
      key: 'tenant.identity.public_name',
      requestId: null,
      scope: 'TENANT_GLOBAL',
      summary: 'Ajuste do nome publico principal.',
      systemSettingId: null,
      unitId: null,
    },
  )
  assert.deepEqual(auditLogs[0], {
    action: 'configuration.updated',
    details: {
      afterValue: { value: 'PetOS Pro' },
      beforeValue: { value: 'PetOS' },
      category: 'GENERAL',
      impactLevel: 'MODERATE',
      key: 'tenant.identity.public_name',
      requestId: null,
      scope: 'TENANT_GLOBAL',
      sensitive: false,
      summary: 'Ajuste do nome publico principal.',
      systemSettingId: null,
    },
    entityId: null,
    entityName: 'SystemSetting',
    unitId: null,
    userId: 'user_admin',
  })
})

test('writeConfigurationChange redacts before and after values when the change is sensitive', async () => {
  const configurationChanges: unknown[] = []
  const auditLogs: unknown[] = []

  await writeConfigurationChange(
    {
      auditLog: {
        create: async ({ data }) => {
          auditLogs.push(data)
          return data
        },
      },
      configurationChange: {
        create: async ({ data }) => {
          configurationChanges.push(data)
          return data
        },
      },
    },
    {
      afterValue: { token: 'new-secret' },
      beforeValue: { token: 'old-secret' },
      category: 'INTEGRATIONS',
      changeType: 'UPDATED',
      changedByUserId: 'user_admin',
      impactLevel: 'CRITICAL',
      key: 'integracoes.smtp.secret',
      scope: 'INTEGRATION_SECRET',
      sensitive: true,
      summary: 'Rotacao de segredo SMTP.',
      unitId: 'unit_local',
    },
  )

  assert.deepEqual(configurationChanges[0], {
    afterValue: { redacted: true },
    beforeValue: { redacted: true },
    category: 'INTEGRATIONS',
    changeType: 'UPDATED',
    changedByUserId: 'user_admin',
    impactLevel: 'CRITICAL',
    key: 'integracoes.smtp.secret',
    requestId: null,
    scope: 'INTEGRATION_SECRET',
    summary: 'Rotacao de segredo SMTP.',
    systemSettingId: null,
    unitId: 'unit_local',
  })
  assert.deepEqual(auditLogs[0], {
    action: 'configuration.updated',
    details: {
      afterValue: { redacted: true },
      beforeValue: { redacted: true },
      category: 'INTEGRATIONS',
      impactLevel: 'CRITICAL',
      key: 'integracoes.smtp.secret',
      requestId: null,
      scope: 'INTEGRATION_SECRET',
      sensitive: true,
      summary: 'Rotacao de segredo SMTP.',
      systemSettingId: null,
    },
    entityId: null,
    entityName: 'SystemSetting',
    unitId: 'unit_local',
    userId: 'user_admin',
  })
})

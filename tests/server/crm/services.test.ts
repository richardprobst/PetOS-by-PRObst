import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  listClientCommunicationPreferences,
  listCrmCampaigns,
  listCrmExecutions,
} from '../../../features/crm/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

const crmActor: AuthenticatedUserData = {
  active: true,
  email: 'crm@petos.app',
  id: 'user_crm_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'CRM Local',
  permissions: ['crm.preferencia_contato.visualizar', 'crm.campanha.visualizar'],
  profiles: ['Gerente'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

test('listClientCommunicationPreferences strips internal user and audit payloads', async () => {
  let capturedUnitId: string | null = null

  replaceMethod(prisma as object, 'clientCommunicationPreference', {
    findMany: async (args: {
      where: { client: { user: { unitId: string } } }
    }) => {
      capturedUnitId = args.where.client.user.unitId

      return [
        {
          client: {
            pets: [
              {
                id: 'pet_1',
                name: 'Thor',
              },
            ],
            user: {
              email: 'tutor@petos.app',
              id: 'client_1',
              name: 'Tutor Local',
              passwordHash: 'secret',
              phone: '11999999999',
            },
          },
          clientId: 'client_1',
          createdAt: new Date('2026-04-13T13:00:00.000Z'),
          emailOptIn: true,
          marketingOptIn: false,
          notes: 'Preferencia registrada no balcão.',
          postServiceOptIn: true,
          reviewOptIn: true,
          source: 'admin_update',
          updatedAt: new Date('2026-04-13T14:00:00.000Z'),
          updatedBy: {
            id: 'admin_1',
            name: 'Admin',
            passwordHash: 'secret',
          },
          whatsappOptIn: true,
        },
      ]
    },
  })

  const preferences = await listClientCommunicationPreferences(crmActor)

  assert.equal(capturedUnitId, 'unit_local')
  assert.deepEqual(preferences[0]?.client, {
    user: {
      id: 'client_1',
      name: 'Tutor Local',
    },
  })
  assert.equal('updatedBy' in (preferences[0] ?? {}), false)
})

test('listCrmCampaigns keeps campaign data but removes rich template, unit and creator payloads', async () => {
  replaceMethod(prisma as object, 'crmCampaign', {
    findMany: async () => [
      {
        _count: {
          executions: 2,
          recipients: 8,
        },
        campaignType: 'SEGMENTED_CAMPAIGN',
        channel: 'WHATSAPP',
        createdAt: new Date('2026-04-13T13:00:00.000Z'),
        createdBy: {
          email: 'crm@petos.app',
          id: 'admin_1',
          name: 'Gestor CRM',
          passwordHash: 'secret',
        },
        createdByUserId: 'admin_1',
        criteria: {
          breeds: ['Shih Tzu'],
          offerName: 'Banho premium',
        },
        description: 'Campanha com oferta segmentada.',
        id: 'campaign_1',
        lastExecutedAt: new Date('2026-04-13T15:00:00.000Z'),
        name: 'Oferta de banho',
        status: 'ACTIVE',
        template: {
          active: true,
          body: 'Mensagem interna',
          channel: 'WHATSAPP',
          id: 'template_1',
          name: 'Oferta ativa',
          subject: null,
        },
        templateId: 'template_1',
        unit: {
          email: 'local@petos.app',
          id: 'unit_local',
          name: 'Unidade Local',
          phone: '1133334444',
        },
        unitId: 'unit_local',
        updatedAt: new Date('2026-04-13T16:00:00.000Z'),
      },
    ],
  })

  const campaigns = await listCrmCampaigns(crmActor, {})

  assert.deepEqual(campaigns[0]?.createdBy, {
    id: 'admin_1',
    name: 'Gestor CRM',
  })
  assert.deepEqual(campaigns[0]?.template, {
    active: true,
    channel: 'WHATSAPP',
    id: 'template_1',
    name: 'Oferta ativa',
  })
  assert.equal('body' in (campaigns[0]?.template ?? {}), false)
  assert.deepEqual(campaigns[0]?.unit, {
    id: 'unit_local',
    name: 'Unidade Local',
  })
  assert.equal('email' in (campaigns[0]?.unit ?? {}), false)
})

test('listCrmExecutions strips recipient prepared payloads and nested internal user fields', async () => {
  let capturedUnitId: string | null = null

  replaceMethod(prisma as object, 'crmCampaignExecution', {
    findMany: async (args: {
      where: { campaign: { unitId: string } }
    }) => {
      capturedUnitId = args.where.campaign.unitId

      return [
        {
          audienceSnapshot: {
            generatedAt: '2026-04-13T17:00:00.000Z',
            preparedCount: 1,
          },
          campaign: {
            campaignType: 'REVIEW_BOOSTER',
            channel: 'WHATSAPP',
            id: 'campaign_1',
            name: 'Review booster',
            status: 'ACTIVE',
            template: {
              active: true,
              body: 'Mensagem preparada',
              channel: 'WHATSAPP',
              id: 'template_1',
              name: 'Review',
              subject: null,
            },
            templateId: 'template_1',
          },
          campaignId: 'campaign_1',
          completedAt: null,
          executedBy: {
            id: 'admin_1',
            name: 'Operador CRM',
            passwordHash: 'secret',
          },
          executedByUserId: 'admin_1',
          executionReason: 'Execucao manual',
          failedCount: 0,
          id: 'execution_1',
          launchedCount: 0,
          preparedCount: 1,
          recipients: [
            {
              appointment: {
                id: 'appointment_1',
                pet: {
                  id: 'pet_1',
                  name: 'Thor',
                },
              },
              appointmentId: 'appointment_1',
              campaignId: 'campaign_1',
              channel: 'WHATSAPP',
              client: {
                user: {
                  email: 'tutor@petos.app',
                  id: 'client_1',
                  name: 'Tutor Local',
                  passwordHash: 'secret',
                },
                userId: 'client_1',
              },
              clientId: 'client_1',
              consentSnapshot: {
                allowedToSend: true,
              },
              createdAt: new Date('2026-04-13T17:01:00.000Z'),
              executionId: 'execution_1',
              id: 'recipient_1',
              launchedAt: null,
              matchSnapshot: {
                offerName: 'Banho premium',
              },
              messageLog: {
                channel: 'WHATSAPP',
                deliveryStatus: 'SENT',
                id: 'log_1',
                messageContent: 'Nao deve sair na listagem.',
                sentAt: new Date('2026-04-13T17:02:00.000Z'),
              },
              messageLogId: 'log_1',
              preparedMessage: 'Mensagem preparada',
              skippedReason: null,
              sourceKey: 'review_booster:appointment:appointment_1',
              status: 'PREPARED',
              updatedAt: new Date('2026-04-13T17:03:00.000Z'),
            },
          ],
          skippedCount: 0,
          startedAt: new Date('2026-04-13T17:00:00.000Z'),
          status: 'PREPARED',
        },
      ]
    },
  })

  const executions = await listCrmExecutions(crmActor, {})
  const recipient = executions[0]?.recipients[0]

  assert.equal(capturedUnitId, 'unit_local')
  assert.deepEqual(executions[0]?.executedBy, {
    id: 'admin_1',
    name: 'Operador CRM',
  })
  assert.deepEqual(executions[0]?.campaign.template, {
    active: true,
    channel: 'WHATSAPP',
    id: 'template_1',
    name: 'Review',
  })
  assert.equal('preparedMessage' in (recipient ?? {}), false)
  assert.equal('matchSnapshot' in (recipient ?? {}), false)
  assert.equal('consentSnapshot' in (recipient ?? {}), false)
  assert.deepEqual(recipient?.client.user, {
    id: 'client_1',
    name: 'Tutor Local',
  })
  assert.equal('messageContent' in (recipient?.messageLog ?? {}), false)
})

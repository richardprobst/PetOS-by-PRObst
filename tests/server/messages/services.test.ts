import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  listMessageLogs,
  listMessageTemplates,
} from '../../../features/messages/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'

const restorers: Array<() => void> = []

const messageActor: AuthenticatedUserData = {
  active: true,
  email: 'comunicacao@petos.app',
  id: 'user_message_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Comunicacao Local',
  permissions: ['template_mensagem.visualizar'],
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

test('listMessageTemplates normalizes available variables and limits unit payload', async () => {
  let capturedUnitId: string | null = null

  replaceMethod(prisma as object, 'messageTemplate', {
    findMany: async (args: { where: { OR: Array<{ unitId: string | null }> } }) => {
      capturedUnitId = args.where.OR[0]?.unitId ?? null

      return [
        {
          active: true,
          availableVariables: ['cliente_nome', 42, null],
          body: 'Corpo do template',
          channel: 'EMAIL',
          id: 'template_1',
          name: 'Confirmacao',
          subject: 'Assunto',
          unit: {
            email: 'local@petos.app',
            id: 'unit_local',
            name: 'Unidade Local',
            phone: '1133334444',
          },
          unitId: 'unit_local',
        },
      ]
    },
  })

  const templates = await listMessageTemplates(messageActor, {})

  assert.equal(capturedUnitId, 'unit_local')
  assert.deepEqual(templates[0]?.availableVariables, ['cliente_nome'])
  assert.deepEqual(templates[0]?.unit, {
    id: 'unit_local',
    name: 'Unidade Local',
  })
  assert.equal('email' in (templates[0]?.unit ?? {}), false)
})

test('listMessageLogs removes nested internal user fields and rich template payloads', async () => {
  let capturedAppointmentUnitId: string | null = null
  let capturedClientUnitId: string | null = null

  replaceMethod(prisma as object, 'messageLog', {
    findMany: async (args: {
      where: {
        OR: [{ appointment: { unitId: string } }, { client: { user: { unitId: string } } }]
      }
    }) => {
      capturedAppointmentUnitId = args.where.OR[0]?.appointment.unitId ?? null
      capturedClientUnitId = args.where.OR[1]?.client.user.unitId ?? null

      return [
        {
          appointment: {
            client: {
              user: {
                email: 'tutor@petos.app',
                id: 'client_1',
                name: 'Tutor Local',
                passwordHash: 'secret',
                phone: '11999999999',
              },
            },
            id: 'appointment_1',
            pet: {
              id: 'pet_1',
              name: 'Thor',
            },
            startAt: new Date('2026-04-13T18:00:00.000Z'),
          },
          appointmentId: 'appointment_1',
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
          deliveryStatus: 'SENT',
          id: 'log_1',
          messageContent: 'Mensagem enviada.',
          sender: {
            email: 'operador@petos.app',
            id: 'admin_1',
            name: 'Operador',
            passwordHash: 'secret',
          },
          senderUserId: 'admin_1',
          sentAt: new Date('2026-04-13T18:05:00.000Z'),
          template: {
            active: true,
            body: 'Nao deve sair no resumo.',
            channel: 'WHATSAPP',
            id: 'template_1',
            name: 'Confirmacao',
            subject: null,
          },
          templateId: 'template_1',
        },
      ]
    },
  })

  const logs = await listMessageLogs(messageActor, {})

  assert.equal(capturedAppointmentUnitId, 'unit_local')
  assert.equal(capturedClientUnitId, 'unit_local')
  assert.deepEqual(logs[0]?.client?.user, {
    id: 'client_1',
    name: 'Tutor Local',
  })
  assert.deepEqual(logs[0]?.appointment?.client.user, {
    id: 'client_1',
    name: 'Tutor Local',
  })
  assert.deepEqual(logs[0]?.sender, {
    id: 'admin_1',
    name: 'Operador',
  })
  assert.deepEqual(logs[0]?.template, {
    active: true,
    channel: 'WHATSAPP',
    id: 'template_1',
    name: 'Confirmacao',
  })
  assert.equal('body' in (logs[0]?.template ?? {}), false)
})

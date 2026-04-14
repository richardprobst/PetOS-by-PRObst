import { Prisma, type MessageChannel } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import {
  assertActorCanAccessLocalUnitRecord,
  assertActorCanAccessOwnershipBinding,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { buildClientOwnershipBinding } from '@/features/clients/ownership'
import {
  buildManualMessageLaunchUrl,
  renderMessageTemplate,
  resolveMessageChannelDestination,
} from '@/features/messages/manual-launch'
import type {
  CreateManualMessageLaunchInput,
  CreateMessageLogInput,
  CreateMessageTemplateInput,
  ListMessageLogsQuery,
  ListMessageTemplatesQuery,
  UpdateMessageTemplateInput,
} from '@/features/messages/schemas'

const messageTemplateDetailsInclude = Prisma.validator<Prisma.MessageTemplateInclude>()({
  unit: true,
})

const messageLogDetailsInclude = Prisma.validator<Prisma.MessageLogInclude>()({
  appointment: {
    include: {
      pet: true,
      client: {
        include: {
          user: true,
        },
      },
    },
  },
  client: {
    include: {
      user: true,
    },
  },
  template: true,
  sender: true,
})

type MessageTemplateDetailsRecord = Prisma.MessageTemplateGetPayload<{
  include: typeof messageTemplateDetailsInclude
}>

type MessageLogDetailsRecord = Prisma.MessageLogGetPayload<{
  include: typeof messageLogDetailsInclude
}>

function normalizeAvailableVariables(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function serializeSafeUserSummary(
  user:
    | {
        id: string
        name: string
      }
    | null
    | undefined,
) {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
  }
}

function serializeRequiredUserSummary(user: { id: string; name: string }) {
  return {
    id: user.id,
    name: user.name,
  }
}

function serializeSafeUnitSummary(
  unit:
    | {
        id: string
        name: string
      }
    | null
    | undefined,
) {
  if (!unit) {
    return null
  }

  return {
    id: unit.id,
    name: unit.name,
  }
}

function serializeMessageTemplate(template: MessageTemplateDetailsRecord) {
  return {
    active: template.active,
    availableVariables: normalizeAvailableVariables(template.availableVariables),
    body: template.body,
    channel: template.channel,
    id: template.id,
    name: template.name,
    subject: template.subject,
    unit: serializeSafeUnitSummary(template.unit),
    unitId: template.unitId,
  }
}

function serializeMessageTemplateSummary(
  template:
    | {
        active: boolean
        channel: MessageChannel
        id: string
        name: string
      }
    | null
    | undefined,
) {
  if (!template) {
    return null
  }

  return {
    active: template.active,
    channel: template.channel,
    id: template.id,
    name: template.name,
  }
}

function serializeMessageLog(log: MessageLogDetailsRecord) {
  return {
    appointment: log.appointment
      ? {
          client: {
            user: serializeRequiredUserSummary(log.appointment.client.user),
          },
          id: log.appointment.id,
          pet: log.appointment.pet
            ? {
                id: log.appointment.pet.id,
                name: log.appointment.pet.name,
              }
            : null,
          startAt: log.appointment.startAt,
        }
      : null,
    appointmentId: log.appointmentId,
    channel: log.channel,
    client: log.client
      ? {
          user: serializeRequiredUserSummary(log.client.user),
          userId: log.client.userId,
        }
      : null,
    clientId: log.clientId,
    deliveryStatus: log.deliveryStatus,
    id: log.id,
    messageContent: log.messageContent,
    sender: serializeSafeUserSummary(log.sender),
    senderUserId: log.senderUserId,
    sentAt: log.sentAt,
    template: serializeMessageTemplateSummary(log.template),
    templateId: log.templateId,
  }
}

export function resolveMessageReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId ?? null)
}

export function assertActorCanReadMessageRecordInScope(
  actor: AuthenticatedUserData,
  recordUnitId: string,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  assertActorCanAccessLocalUnitRecord(actor, recordUnitId, options)
}

export function assertActorCanReadMessageTemplateInScope(
  actor: AuthenticatedUserData,
  templateUnitId: string | null,
  options?: {
    requestedUnitId?: string | null
    sessionActiveUnitId?: string | null
  },
) {
  if (!templateUnitId) {
    return
  }

  assertActorCanReadMessageRecordInScope(actor, templateUnitId, options)
}

async function getMessageTemplateOrThrow(actor: AuthenticatedUserData, templateId: string) {
  const template = await prisma.messageTemplate.findUnique({
    where: {
      id: templateId,
    },
    include: messageTemplateDetailsInclude,
  })

  if (!template) {
    throw new AppError('NOT_FOUND', 404, 'Message template not found.')
  }

  assertActorCanReadMessageTemplateInScope(actor, template.unitId, {
    requestedUnitId: template.unitId,
  })

  return template
}

async function assertMessageLogContext(actor: AuthenticatedUserData, input: CreateMessageLogInput) {
  const [appointment, client, template] = await Promise.all([
    input.appointmentId
      ? prisma.appointment.findUnique({
          where: {
            id: input.appointmentId,
          },
          include: {
            pet: true,
            client: {
              include: {
                user: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    input.clientId
      ? prisma.client.findUnique({
          where: {
            userId: input.clientId,
          },
          include: {
            user: true,
          },
        })
      : Promise.resolve(null),
    input.templateId
      ? prisma.messageTemplate.findUnique({
          where: {
            id: input.templateId,
          },
          include: messageTemplateDetailsInclude,
        })
      : Promise.resolve(null),
  ])

  if (input.appointmentId && !appointment) {
    throw new AppError('NOT_FOUND', 404, 'Appointment not found for message log.')
  }

  if (input.clientId && !client) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for message log.')
  }

  if (input.templateId && !template) {
    throw new AppError('NOT_FOUND', 404, 'Message template not found for message log.')
  }

  if (appointment) {
    assertActorCanReadMessageRecordInScope(actor, appointment.unitId)
  }

  if (client?.user.unitId) {
    assertActorCanAccessOwnershipBinding(
      actor,
      buildClientOwnershipBinding(client.user.unitId),
      {
        requestedUnitId: client.user.unitId,
      },
    )
  }

  if (template) {
    assertActorCanReadMessageTemplateInScope(actor, template.unitId, {
      requestedUnitId: template.unitId,
    })
  }

  if (appointment && client && appointment.clientId !== client.userId) {
    throw new AppError(
      'CONFLICT',
      409,
      'The selected appointment does not belong to the selected client.',
    )
  }

  if (template && template.channel !== input.channel) {
    throw new AppError(
      'CONFLICT',
      409,
      'The selected message template channel does not match the message log channel.',
    )
  }

  return {
    appointment,
    client: client ?? appointment?.client ?? null,
    template,
  }
}

function buildMessageTemplateContext(context: Awaited<ReturnType<typeof assertMessageLogContext>>) {
  return {
    clientName: context.client?.user.name ?? context.appointment?.client.user.name ?? null,
    petName: context.appointment?.pet.name ?? null,
    appointmentStartAt: context.appointment?.startAt ?? null,
  }
}

function resolveManualMessageContent(
  context: Awaited<ReturnType<typeof assertMessageLogContext>>,
  input: CreateManualMessageLaunchInput,
) {
  if (input.messageContent) {
    return input.messageContent
  }

  if (context.template) {
    return renderMessageTemplate(context.template.body, buildMessageTemplateContext(context))
  }

  throw new AppError(
    'BAD_REQUEST',
    400,
    'Provide manual message content or select a template.',
  )
}

function resolveManualMessageSubject(
  context: Awaited<ReturnType<typeof assertMessageLogContext>>,
  channel: CreateManualMessageLaunchInput['channel'],
) {
  if (channel !== 'EMAIL') {
    return undefined
  }

  if (context.template?.subject) {
    return renderMessageTemplate(context.template.subject, buildMessageTemplateContext(context))
  }

  return 'Atualizacao do atendimento PetOS'
}

function resolveManualMessageDestination(
  context: Awaited<ReturnType<typeof assertMessageLogContext>>,
  channel: CreateManualMessageLaunchInput['channel'],
) {
  const user = context.client?.user ?? context.appointment?.client.user ?? null

  if (!user) {
    throw new AppError('CONFLICT', 409, 'Client context is required for manual communication.')
  }

  return resolveMessageChannelDestination({
    channel,
    email: user.email,
    phone: user.phone,
  })
}

export async function listMessageTemplates(
  actor: AuthenticatedUserData,
  query: ListMessageTemplatesQuery,
) {
  const scopedUnitId = resolveMessageReadUnitId(actor, query.unitId ?? null)

  const templates = await prisma.messageTemplate.findMany({
    where: {
      OR: [{ unitId: scopedUnitId }, { unitId: null }],
      ...(query.search
        ? {
            name: {
              contains: query.search,
            },
          }
        : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    },
    include: messageTemplateDetailsInclude,
    orderBy: {
      name: 'asc',
    },
  })

  return templates.map(serializeMessageTemplate)
}

export async function createMessageTemplate(
  actor: AuthenticatedUserData,
  input: CreateMessageTemplateInput,
) {
  const unitId = resolveScopedUnitId(actor, input.unitId ?? null)

  const template = await prisma.$transaction(async (tx) => {
    const template = await tx.messageTemplate.create({
      data: {
        unitId,
        name: input.name,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
        availableVariables:
          input.availableVariables !== undefined ? input.availableVariables : Prisma.JsonNull,
        active: input.active ?? true,
      },
      include: messageTemplateDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'message_template.create',
      entityName: 'MessageTemplate',
      entityId: template.id,
      details: {
        channel: template.channel,
      },
    })

    return template
  })

  return serializeMessageTemplate(template)
}

export async function updateMessageTemplate(
  actor: AuthenticatedUserData,
  templateId: string,
  input: UpdateMessageTemplateInput,
) {
  const existingTemplate = await getMessageTemplateOrThrow(actor, templateId)
  const unitId =
    input.unitId === undefined && existingTemplate.unitId === null
      ? null
      : resolveScopedUnitId(actor, input.unitId ?? existingTemplate.unitId ?? null)

  const template = await prisma.$transaction(async (tx) => {
    const template = await tx.messageTemplate.update({
      where: {
        id: templateId,
      },
      data: {
        unitId,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.availableVariables !== undefined
          ? { availableVariables: input.availableVariables }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: messageTemplateDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'message_template.update',
      entityName: 'MessageTemplate',
      entityId: templateId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return template
  })

  return serializeMessageTemplate(template)
}

export async function listMessageLogs(actor: AuthenticatedUserData, query: ListMessageLogsQuery) {
  const scopedUnitId = resolveMessageReadUnitId(actor, query.unitId ?? null)

  const logs = await prisma.messageLog.findMany({
    where: {
      ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.deliveryStatus ? { deliveryStatus: query.deliveryStatus } : {}),
      OR: [
        {
          appointment: {
            unitId: scopedUnitId,
          },
        },
        {
          client: {
            user: {
              unitId: scopedUnitId,
            },
          },
        },
      ],
    },
    include: messageLogDetailsInclude,
    orderBy: {
      sentAt: 'desc',
    },
  })

  return logs.map(serializeMessageLog)
}

export async function createMessageLog(actor: AuthenticatedUserData, input: CreateMessageLogInput) {
  const context = await assertMessageLogContext(actor, input)
  const unitId = resolveScopedUnitId(
    actor,
    context.appointment?.unitId ??
      context.client?.user.unitId ??
      context.template?.unitId ??
      null,
  )

  const log = await prisma.$transaction(async (tx) => {
    const log = await tx.messageLog.create({
      data: {
        appointmentId: context.appointment?.id ?? null,
        clientId: context.client?.userId ?? null,
        templateId: context.template?.id ?? null,
        senderUserId: actor.id,
        channel: input.channel,
        messageContent: input.messageContent,
        sentAt: input.sentAt ?? new Date(),
        deliveryStatus: input.deliveryStatus ?? 'SENT',
      },
      include: messageLogDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'message_log.create',
      entityName: 'MessageLog',
      entityId: log.id,
      details: {
        channel: log.channel,
        appointmentId: log.appointmentId,
        clientId: log.clientId,
      },
    })

    return log
  })

  return serializeMessageLog(log)
}

export async function launchManualMessage(
  actor: AuthenticatedUserData,
  input: CreateManualMessageLaunchInput,
) {
  const context = await assertMessageLogContext(actor, {
    ...input,
    messageContent: input.messageContent ?? 'template-only',
  })
  const unitId = resolveScopedUnitId(
    actor,
    context.appointment?.unitId ??
      context.client?.user.unitId ??
      context.template?.unitId ??
      null,
  )
  const messageContent = resolveManualMessageContent(context, input)
  const subject = resolveManualMessageSubject(context, input.channel)
  const destination = resolveManualMessageDestination(context, input.channel)
  const launchUrl = buildManualMessageLaunchUrl({
    channel: input.channel,
    destination,
    messageContent,
    subject,
  })

  const log = await prisma.$transaction(async (tx) => {
    const messageLog = await tx.messageLog.create({
      data: {
        appointmentId: context.appointment?.id ?? null,
        clientId: context.client?.userId ?? null,
        templateId: context.template?.id ?? null,
        senderUserId: actor.id,
        channel: input.channel,
        messageContent,
        sentAt: new Date(),
        deliveryStatus: 'SENT',
      },
      include: messageLogDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'message_log.launch',
      entityName: 'MessageLog',
      entityId: messageLog.id,
      details: {
        channel: messageLog.channel,
        appointmentId: messageLog.appointmentId,
        clientId: messageLog.clientId,
      },
    })

    return messageLog
  })

  return {
    log: serializeMessageLog(log),
    launchUrl,
  }
}

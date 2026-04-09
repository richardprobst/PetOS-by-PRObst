import {
  CrmCampaignExecutionStatus,
  CrmCampaignRecipientStatus,
  CrmCampaignStatus,
  Prisma,
  type MessageChannel,
  type PetSizeCategory,
} from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog } from '@/server/audit/logging'
import {
  assertActorCanAccessLocalUnitRecord,
  resolveScopedUnitId,
} from '@/server/authorization/scope'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { operationalStatusIds } from '@/features/appointments/constants'
import { derivePetSizeCategory } from '@/features/appointments/domain'
import {
  buildCrmRecipientSourceKey,
  canExecuteCrmContact,
  deriveClientInactivityDays,
  matchesCrmCampaignCriteria,
  shouldPreparePostServiceTrigger,
  shouldPrepareReviewBooster,
  type CommunicationPreferenceSnapshot,
  type CrmCampaignCriteria,
  type CrmClientProfile,
} from '@/features/crm/domain'
import type {
  CreateCrmCampaignInput,
  ListCrmCampaignsQuery,
  ListCrmExecutionsQuery,
  PrepareCrmCampaignExecutionInput,
  UpdateCrmCampaignInput,
  UpsertClientCommunicationPreferenceInput,
} from '@/features/crm/schemas'
import {
  buildManualMessageLaunchUrl,
  renderMessageTemplate,
  resolveMessageChannelDestination,
} from '@/features/messages/manual-launch'

const communicationPreferenceDetailsInclude =
  Prisma.validator<Prisma.ClientCommunicationPreferenceInclude>()({
    client: {
      include: {
        user: true,
        pets: true,
      },
    },
    updatedBy: true,
  })

const crmCampaignDetailsInclude = Prisma.validator<Prisma.CrmCampaignInclude>()({
  template: true,
  unit: true,
  createdBy: true,
  _count: {
    select: {
      executions: true,
      recipients: true,
    },
  },
})

const crmCampaignExecutionDetailsInclude =
  Prisma.validator<Prisma.CrmCampaignExecutionInclude>()({
    campaign: {
      include: {
        template: true,
      },
    },
    executedBy: true,
    recipients: {
      include: {
        appointment: {
          include: {
            pet: true,
          },
        },
        client: {
          include: {
            user: true,
          },
        },
        messageLog: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    },
  })

const crmClientAudienceInclude = Prisma.validator<Prisma.ClientInclude>()({
  user: true,
  pets: true,
  communicationPreference: true,
  appointments: {
    include: {
      pet: true,
      services: {
        include: {
          service: true,
        },
      },
    },
    orderBy: {
      startAt: 'desc',
    },
  },
})

const crmCompletedAppointmentInclude = Prisma.validator<Prisma.AppointmentInclude>()({
  pet: true,
  client: {
    include: {
      user: true,
      pets: true,
      communicationPreference: true,
    },
  },
  services: {
    include: {
      service: true,
    },
  },
})

const crmRecipientLaunchInclude = Prisma.validator<Prisma.CrmCampaignRecipientInclude>()({
  appointment: {
    include: {
      pet: true,
      services: {
        include: {
          service: true,
        },
      },
    },
  },
  campaign: {
    include: {
      template: true,
      unit: true,
    },
  },
  client: {
    include: {
      user: true,
      communicationPreference: true,
      pets: true,
    },
  },
  execution: true,
  messageLog: true,
})

const inactiveDaysSettingKey = 'crm.inatividade_dias_padrao'
const reviewDelaySettingKey = 'crm.review_booster_atraso_horas_padrao'
const postServiceDelaySettingKey = 'crm.pos_servico_atraso_horas_padrao'

type CrmCampaignRecord = Prisma.CrmCampaignGetPayload<{
  include: typeof crmCampaignDetailsInclude
}>

type CrmClientAudienceRecord = Prisma.ClientGetPayload<{
  include: typeof crmClientAudienceInclude
}>

type CrmCompletedAppointmentRecord = Prisma.AppointmentGetPayload<{
  include: typeof crmCompletedAppointmentInclude
}>

type CrmRecipientLaunchRecord = Prisma.CrmCampaignRecipientGetPayload<{
  include: typeof crmRecipientLaunchInclude
}>

interface PreparedRecipientInput {
  appointmentId?: string | null
  channel: MessageChannel
  clientId: string
  consentSnapshot: Record<string, unknown>
  matchSnapshot: Record<string, unknown>
  preparedMessage: string
  skippedReason?: string
  sourceKey: string
  status: CrmCampaignRecipientStatus
}

interface BuiltClientProfile {
  inactivityDays: number | null
  lastCompletedAt: Date | null
  lastServiceName: string | null
  petName: string | null
  profile: CrmClientProfile
}

type CrmScopeQuery = {
  unitId?: string | null
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return typeof value === 'number' ? value : Number(value)
}

function toJsonObject(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function toPetSizeCategories(values: unknown) {
  if (!Array.isArray(values)) {
    return [] as PetSizeCategory[]
  }

  return values.filter((value): value is PetSizeCategory => typeof value === 'string') as PetSizeCategory[]
}

function toBreedList(values: unknown) {
  if (!Array.isArray(values)) {
    return [] as string[]
  }

  return values.filter((value): value is string => typeof value === 'string')
}

function toDate(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

async function getUnitSettingNumber(unitId: string, key: string, fallbackValue: number) {
  const setting = await prisma.unitSetting.findUnique({
    where: {
      unitId_key: {
        key,
        unitId,
      },
    },
    select: {
      value: true,
    },
  })

  const parsed = Number(setting?.value)
  return Number.isFinite(parsed) ? parsed : fallbackValue
}

function getCommunicationPreferenceSnapshot(preference: {
  emailOptIn: boolean
  marketingOptIn: boolean
  postServiceOptIn: boolean
  reviewOptIn: boolean
  whatsappOptIn: boolean
} | null): CommunicationPreferenceSnapshot {
  return {
    emailOptIn: preference?.emailOptIn ?? false,
    marketingOptIn: preference?.marketingOptIn ?? false,
    postServiceOptIn: preference?.postServiceOptIn ?? false,
    reviewOptIn: preference?.reviewOptIn ?? false,
    whatsappOptIn: preference?.whatsappOptIn ?? false,
  }
}

function deriveLastServiceName(appointment: {
  services: Array<{ service: { name: string } }>
}) {
  return appointment.services.map((service) => service.service.name).join(', ')
}

function buildCampaignCriteriaSnapshot(criteria: Prisma.JsonValue | null | undefined): CrmCampaignCriteria {
  const objectValue = toJsonObject(criteria)

  return {
    breeds: toBreedList(objectValue.breeds),
    inactivityDays:
      typeof objectValue.inactivityDays === 'number' ? objectValue.inactivityDays : undefined,
    minimumCompletedAppointments:
      typeof objectValue.minimumCompletedAppointments === 'number'
        ? objectValue.minimumCompletedAppointments
        : undefined,
    offerName: typeof objectValue.offerName === 'string' ? objectValue.offerName : undefined,
    onlyClientsWithoutFutureAppointments:
      typeof objectValue.onlyClientsWithoutFutureAppointments === 'boolean'
        ? objectValue.onlyClientsWithoutFutureAppointments
        : undefined,
    petSizeCategories: toPetSizeCategories(objectValue.petSizeCategories),
    postServiceDelayHours:
      typeof objectValue.postServiceDelayHours === 'number'
        ? objectValue.postServiceDelayHours
        : undefined,
    reviewDelayHours:
      typeof objectValue.reviewDelayHours === 'number' ? objectValue.reviewDelayHours : undefined,
  }
}

export function resolveCrmReadUnitId(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  return resolveScopedUnitId(actor, requestedUnitId)
}

export function assertActorCanReadCrmResourceInScope(
  actor: AuthenticatedUserData,
  recordUnitId: string,
  options?: CrmScopeQuery,
) {
  assertActorCanAccessLocalUnitRecord(actor, recordUnitId, {
    requestedUnitId: options?.unitId,
  })
}

function assertActorCanUseClient(actor: AuthenticatedUserData, unitId: string | null | undefined) {
  if (!unitId) {
    return
  }

  assertActorCanReadCrmResourceInScope(actor, unitId, {
    unitId,
  })
}

async function getCrmCampaignOrThrow(actor: AuthenticatedUserData, campaignId: string) {
  const campaign = await prisma.crmCampaign.findUnique({
    where: {
      id: campaignId,
    },
    include: crmCampaignDetailsInclude,
  })

  if (!campaign) {
    throw new AppError('NOT_FOUND', 404, 'CRM campaign not found.')
  }

  assertActorCanUseClient(actor, campaign.unitId)
  return campaign
}

export async function getCrmCampaignDetails(
  actor: AuthenticatedUserData,
  campaignId: string,
  query: CrmScopeQuery = {},
) {
  const campaign = await prisma.crmCampaign.findUnique({
    where: {
      id: campaignId,
    },
    include: crmCampaignDetailsInclude,
  })

  if (!campaign) {
    throw new AppError('NOT_FOUND', 404, 'CRM campaign not found.')
  }

  assertActorCanReadCrmResourceInScope(actor, campaign.unitId, {
    unitId: query.unitId,
  })

  return campaign
}

function buildClientProfile(client: CrmClientAudienceRecord, now: Date): BuiltClientProfile {
  const completedAppointments = client.appointments.filter(
    (appointment) => appointment.operationalStatusId === operationalStatusIds.completed,
  )
  const futureAppointments = client.appointments.filter(
    (appointment) =>
      appointment.startAt > now &&
      appointment.operationalStatusId !== operationalStatusIds.canceled &&
      appointment.operationalStatusId !== operationalStatusIds.noShow,
  )
  const lastCompletedAppointment = completedAppointments[0] ?? null
  const petName = lastCompletedAppointment?.pet.name ?? client.pets[0]?.name ?? null
  const petSizeCategories = Array.from(
    new Set(
      client.pets.map((pet) => derivePetSizeCategory(toNumber(pet.weightKg))),
    ),
  )
  const breeds = Array.from(
    new Set(
      client.pets
        .map((pet) => pet.breed?.trim())
        .filter((breed): breed is string => Boolean(breed)),
    ),
  )
  const lastCompletedAt = lastCompletedAppointment?.endAt ?? lastCompletedAppointment?.startAt ?? null

  return {
    inactivityDays: deriveClientInactivityDays(lastCompletedAt, now),
    lastCompletedAt,
    lastServiceName: lastCompletedAppointment ? deriveLastServiceName(lastCompletedAppointment) : null,
    petName,
    profile: {
      breeds,
      completedAppointmentCount: completedAppointments.length,
      hasFutureAppointment: futureAppointments.length > 0,
      lastCompletedAt,
      petSizeCategories,
    },
  }
}

function buildAppointmentClientProfile(appointment: CrmCompletedAppointmentRecord, now: Date) {
  const petSizeCategories = Array.from(
    new Set(appointment.client.pets.map((pet) => derivePetSizeCategory(toNumber(pet.weightKg)))),
  )
  const breeds = Array.from(
    new Set(
      appointment.client.pets
        .map((pet) => pet.breed?.trim())
        .filter((breed): breed is string => Boolean(breed)),
    ),
  )
  const lastCompletedAt = appointment.endAt ?? appointment.startAt ?? null

  return {
    inactivityDays: deriveClientInactivityDays(lastCompletedAt, now),
    lastCompletedAt,
    lastServiceName: deriveLastServiceName(appointment),
    petName: appointment.pet.name,
    profile: {
      breeds,
      completedAppointmentCount: 1,
      hasFutureAppointment: false,
      lastCompletedAt,
      petSizeCategories,
    },
  } satisfies BuiltClientProfile
}

function buildMessageRenderContext(input: {
  appointmentStartAt?: Date | null
  clientName: string | null
  inactivityDays?: number | null
  lastCompletedAt?: Date | null
  lastServiceName?: string | null
  offerName?: string | null
  petName?: string | null
}) {
  return {
    appointmentStartAt: input.appointmentStartAt ?? null,
    clientName: input.clientName ?? null,
    inactivityDays: input.inactivityDays ?? null,
    lastCompletedAt: input.lastCompletedAt ?? null,
    lastServiceName: input.lastServiceName ?? null,
    offerName: input.offerName ?? null,
    petName: input.petName ?? null,
  }
}

function buildRecipientMatchSnapshot(input: {
  appointmentId?: string | null
  campaignType: string
  criteria: CrmCampaignCriteria
  inactivityDays: number | null
  lastCompletedAt: Date | null
  lastServiceName: string | null
  petName: string | null
  profile: CrmClientProfile
}) {
  return {
    appointmentId: input.appointmentId ?? null,
    breeds: input.profile.breeds,
    campaignType: input.campaignType,
    completedAppointmentCount: input.profile.completedAppointmentCount,
    criteria: input.criteria,
    hasFutureAppointment: input.profile.hasFutureAppointment,
    inactivityDays: input.inactivityDays,
    lastCompletedAt: input.lastCompletedAt?.toISOString() ?? null,
    lastServiceName: input.lastServiceName,
    petName: input.petName,
    petSizeCategories: input.profile.petSizeCategories,
  }
}

function buildConsentSnapshot(
  preference: CommunicationPreferenceSnapshot,
  campaignType: string,
  channel: MessageChannel,
) {
  return {
    ...preference,
    campaignType,
    channel,
    allowedToSend: canExecuteCrmContact(preference, campaignType as never, channel),
  }
}

function buildExecutionAudienceSnapshot(recipients: PreparedRecipientInput[], now: Date) {
  const skippedByReason = recipients.reduce<Record<string, number>>((accumulator, recipient) => {
    if (!recipient.skippedReason) {
      return accumulator
    }

    accumulator[recipient.skippedReason] = (accumulator[recipient.skippedReason] ?? 0) + 1
    return accumulator
  }, {})

  return {
    generatedAt: now.toISOString(),
    preparedCount: recipients.filter((recipient) => recipient.status === CrmCampaignRecipientStatus.PREPARED)
      .length,
    skippedByReason,
    totalRecipients: recipients.length,
  }
}

async function assertActorCanUseTemplate(
  actor: AuthenticatedUserData,
  input: {
    channel: MessageChannel
    templateId: string
    unitId: string
  },
) {
  const template = await prisma.messageTemplate.findUnique({
    where: {
      id: input.templateId,
    },
  })

  if (!template) {
    throw new AppError('NOT_FOUND', 404, 'Message template not found for CRM campaign.')
  }

  if (template.channel !== input.channel) {
    throw new AppError(
      'CONFLICT',
      409,
      'The selected message template channel does not match the CRM campaign channel.',
    )
  }

  if (template.unitId) {
    assertActorCanReadCrmResourceInScope(actor, template.unitId, {
      unitId: template.unitId,
    })
  }

  if (template.unitId && template.unitId !== input.unitId) {
    throw new AppError('CONFLICT', 409, 'The selected message template belongs to another unit.')
  }

  return template
}

async function buildClientBasedRecipients(
  actor: AuthenticatedUserData,
  campaign: CrmCampaignRecord,
  criteria: CrmCampaignCriteria,
  now: Date,
) {
  const template = campaign.template

  if (!template) {
    throw new AppError('CONFLICT', 409, 'CRM campaign requires a template before execution.')
  }

  const clients = await prisma.client.findMany({
    where: {
      user: {
        is: {
          active: true,
          unitId: campaign.unitId,
        },
      },
    },
    include: crmClientAudienceInclude,
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  })

  return clients.flatMap<PreparedRecipientInput>((client) => {
    assertActorCanUseClient(actor, client.user.unitId)

    const builtProfile = buildClientProfile(client, now)

    if (!matchesCrmCampaignCriteria(builtProfile.profile, criteria, now)) {
      return []
    }

    const sourceKey = buildCrmRecipientSourceKey({
      campaignType: campaign.campaignType,
      clientId: client.userId,
    })
    const renderContext = buildMessageRenderContext({
      clientName: client.user.name,
      inactivityDays: builtProfile.inactivityDays,
      lastCompletedAt: builtProfile.lastCompletedAt,
      lastServiceName: builtProfile.lastServiceName,
      offerName: criteria.offerName ?? null,
      petName: builtProfile.petName,
    })
    const preparedMessage = renderMessageTemplate(template.body, renderContext)
    const preferenceSnapshot = getCommunicationPreferenceSnapshot(client.communicationPreference)
    const consentSnapshot = buildConsentSnapshot(
      preferenceSnapshot,
      campaign.campaignType,
      campaign.channel,
    )
    const matchSnapshot = buildRecipientMatchSnapshot({
      campaignType: campaign.campaignType,
      criteria,
      inactivityDays: builtProfile.inactivityDays,
      lastCompletedAt: builtProfile.lastCompletedAt,
      lastServiceName: builtProfile.lastServiceName,
      petName: builtProfile.petName,
      profile: builtProfile.profile,
    })

    if (!canExecuteCrmContact(preferenceSnapshot, campaign.campaignType, campaign.channel)) {
      return [
        {
          channel: campaign.channel,
          clientId: client.userId,
          consentSnapshot,
          matchSnapshot,
          preparedMessage,
          skippedReason: 'Consent does not allow this CRM contact.',
          sourceKey,
          status: CrmCampaignRecipientStatus.SKIPPED,
        },
      ]
    }

    try {
      resolveMessageChannelDestination({
        channel: campaign.channel,
        email: client.user.email,
        phone: client.user.phone,
      })
    } catch (error) {
      return [
        {
          channel: campaign.channel,
          clientId: client.userId,
          consentSnapshot,
          matchSnapshot,
          preparedMessage,
          skippedReason:
            error instanceof AppError ? error.message : 'CRM recipient destination is unavailable.',
          sourceKey,
          status: CrmCampaignRecipientStatus.SKIPPED,
        },
      ]
    }

    return [
      {
        channel: campaign.channel,
        clientId: client.userId,
        consentSnapshot,
        matchSnapshot,
        preparedMessage,
        sourceKey,
        status: CrmCampaignRecipientStatus.PREPARED,
      },
    ]
  })
}

async function buildAppointmentBasedRecipients(
  actor: AuthenticatedUserData,
  campaign: CrmCampaignRecord,
  criteria: CrmCampaignCriteria,
  now: Date,
) {
  const template = campaign.template

  if (!template) {
    throw new AppError('CONFLICT', 409, 'CRM campaign requires a template before execution.')
  }

  const existingRecipients = await prisma.crmCampaignRecipient.findMany({
    where: {
      campaignId: campaign.id,
      status: {
        in: [CrmCampaignRecipientStatus.PREPARED, CrmCampaignRecipientStatus.LAUNCHED],
      },
    },
    select: {
      sourceKey: true,
    },
  })
  const existingSourceKeys = new Set(existingRecipients.map((recipient) => recipient.sourceKey))
  const appointments = await prisma.appointment.findMany({
    where: {
      unitId: campaign.unitId,
      operationalStatusId: operationalStatusIds.completed,
    },
    include: crmCompletedAppointmentInclude,
    orderBy: {
      endAt: 'desc',
    },
  })

  return appointments.flatMap<PreparedRecipientInput>((appointment) => {
    assertActorCanUseClient(actor, appointment.unitId)

    const sourceKey = buildCrmRecipientSourceKey({
      appointmentId: appointment.id,
      campaignType: campaign.campaignType,
      clientId: appointment.clientId,
    })
    const alreadyPrepared = existingSourceKeys.has(sourceKey)
    const delayHours =
      campaign.campaignType === 'REVIEW_BOOSTER'
        ? criteria.reviewDelayHours ?? 24
        : criteria.postServiceDelayHours ?? 6
    const completedAt = appointment.endAt
    const shouldPrepare =
      campaign.campaignType === 'REVIEW_BOOSTER'
        ? shouldPrepareReviewBooster({
            alreadyPrepared,
            completedAt,
            delayHours,
            now,
          })
        : shouldPreparePostServiceTrigger({
            alreadyPrepared,
            completedAt,
            delayHours,
            now,
          })

    if (!shouldPrepare) {
      return []
    }

    const builtProfile = buildAppointmentClientProfile(appointment, now)
    const preferenceSnapshot = getCommunicationPreferenceSnapshot(appointment.client.communicationPreference)
    const consentSnapshot = buildConsentSnapshot(
      preferenceSnapshot,
      campaign.campaignType,
      campaign.channel,
    )
    const matchSnapshot = buildRecipientMatchSnapshot({
      appointmentId: appointment.id,
      campaignType: campaign.campaignType,
      criteria,
      inactivityDays: deriveClientInactivityDays(completedAt, now),
      lastCompletedAt: completedAt,
      lastServiceName: deriveLastServiceName(appointment),
      petName: appointment.pet.name,
      profile: builtProfile.profile,
    })
    const renderContext = buildMessageRenderContext({
      appointmentStartAt: appointment.startAt,
      clientName: appointment.client.user.name,
      inactivityDays: deriveClientInactivityDays(completedAt, now),
      lastCompletedAt: completedAt,
      lastServiceName: deriveLastServiceName(appointment),
      offerName: criteria.offerName ?? null,
      petName: appointment.pet.name,
    })
    const preparedMessage = renderMessageTemplate(template.body, renderContext)

    if (!canExecuteCrmContact(preferenceSnapshot, campaign.campaignType, campaign.channel)) {
      return [
        {
          appointmentId: appointment.id,
          channel: campaign.channel,
          clientId: appointment.clientId,
          consentSnapshot,
          matchSnapshot,
          preparedMessage,
          skippedReason: 'Consent does not allow this CRM contact.',
          sourceKey,
          status: CrmCampaignRecipientStatus.SKIPPED,
        },
      ]
    }

    try {
      resolveMessageChannelDestination({
        channel: campaign.channel,
        email: appointment.client.user.email,
        phone: appointment.client.user.phone,
      })
    } catch (error) {
      return [
        {
          appointmentId: appointment.id,
          channel: campaign.channel,
          clientId: appointment.clientId,
          consentSnapshot,
          matchSnapshot,
          preparedMessage,
          skippedReason:
            error instanceof AppError ? error.message : 'CRM recipient destination is unavailable.',
          sourceKey,
          status: CrmCampaignRecipientStatus.SKIPPED,
        },
      ]
    }

    return [
      {
        appointmentId: appointment.id,
        channel: campaign.channel,
        clientId: appointment.clientId,
        consentSnapshot,
        matchSnapshot,
        preparedMessage,
        sourceKey,
        status: CrmCampaignRecipientStatus.PREPARED,
      },
    ]
  })
}

async function buildCampaignRecipients(
  actor: AuthenticatedUserData,
  campaign: CrmCampaignRecord,
  now: Date,
) {
  const criteria = buildCampaignCriteriaSnapshot(campaign.criteria)

  if (
    campaign.campaignType === 'INACTIVE_RECOVERY' &&
    criteria.inactivityDays === undefined
  ) {
    criteria.inactivityDays = await getUnitSettingNumber(campaign.unitId, inactiveDaysSettingKey, 90)
  }

  if (
    campaign.campaignType === 'REVIEW_BOOSTER' &&
    criteria.reviewDelayHours === undefined
  ) {
    criteria.reviewDelayHours = await getUnitSettingNumber(campaign.unitId, reviewDelaySettingKey, 24)
  }

  if (
    campaign.campaignType === 'POST_SERVICE_TRIGGER' &&
    criteria.postServiceDelayHours === undefined
  ) {
    criteria.postServiceDelayHours = await getUnitSettingNumber(
      campaign.unitId,
      postServiceDelaySettingKey,
      6,
    )
  }

  if (
    campaign.campaignType === 'REVIEW_BOOSTER' ||
    campaign.campaignType === 'POST_SERVICE_TRIGGER'
  ) {
    return buildAppointmentBasedRecipients(actor, campaign, criteria, now)
  }

  return buildClientBasedRecipients(actor, campaign, criteria, now)
}

function buildRecipientLaunchContext(recipient: CrmRecipientLaunchRecord) {
  const matchSnapshot = toJsonObject(recipient.matchSnapshot)

  return buildMessageRenderContext({
    appointmentStartAt: recipient.appointment?.startAt ?? toDate(matchSnapshot.appointmentStartAt),
    clientName: recipient.client.user.name,
    inactivityDays:
      typeof matchSnapshot.inactivityDays === 'number' ? matchSnapshot.inactivityDays : null,
    lastCompletedAt: toDate(matchSnapshot.lastCompletedAt),
    lastServiceName:
      typeof matchSnapshot.lastServiceName === 'string' ? matchSnapshot.lastServiceName : null,
    offerName:
      typeof matchSnapshot.criteria === 'object' &&
      matchSnapshot.criteria &&
      !Array.isArray(matchSnapshot.criteria) &&
      typeof (matchSnapshot.criteria as Record<string, unknown>).offerName === 'string'
        ? ((matchSnapshot.criteria as Record<string, unknown>).offerName as string)
        : null,
    petName:
      recipient.appointment?.pet.name ??
      (typeof matchSnapshot.petName === 'string' ? matchSnapshot.petName : recipient.client.pets[0]?.name ?? null),
  })
}

export async function listClientCommunicationPreferences(actor: AuthenticatedUserData) {
  const unitId = resolveCrmReadUnitId(actor)

  return prisma.clientCommunicationPreference.findMany({
    where: {
      client: {
        user: {
          unitId,
        },
      },
    },
    include: communicationPreferenceDetailsInclude,
    orderBy: {
      client: {
        user: {
          name: 'asc',
        },
      },
    },
  })
}

export async function upsertClientCommunicationPreference(
  actor: AuthenticatedUserData,
  input: UpsertClientCommunicationPreferenceInput,
) {
  const client = await prisma.client.findUnique({
    where: {
      userId: input.clientId,
    },
    include: {
      user: true,
    },
  })

  if (!client) {
    throw new AppError('NOT_FOUND', 404, 'Client not found for communication preferences.')
  }

  assertActorCanUseClient(actor, client.user.unitId)
  const unitId = resolveScopedUnitId(actor, client.user.unitId)

  return prisma.$transaction(async (tx) => {
    const preference = await tx.clientCommunicationPreference.upsert({
      where: {
        clientId: input.clientId,
      },
      update: {
        emailOptIn: input.emailOptIn,
        whatsappOptIn: input.whatsappOptIn,
        marketingOptIn: input.marketingOptIn,
        reviewOptIn: input.reviewOptIn,
        postServiceOptIn: input.postServiceOptIn,
        notes: input.notes ?? null,
        source: input.source ?? 'admin_update',
        updatedByUserId: actor.id,
      },
      create: {
        clientId: input.clientId,
        emailOptIn: input.emailOptIn,
        whatsappOptIn: input.whatsappOptIn,
        marketingOptIn: input.marketingOptIn,
        reviewOptIn: input.reviewOptIn,
        postServiceOptIn: input.postServiceOptIn,
        notes: input.notes ?? null,
        source: input.source ?? 'admin_update',
        updatedByUserId: actor.id,
      },
      include: communicationPreferenceDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'crm.communication_preference.upsert',
      entityName: 'ClientCommunicationPreference',
      entityId: input.clientId,
      details: {
        emailOptIn: input.emailOptIn,
        whatsappOptIn: input.whatsappOptIn,
        marketingOptIn: input.marketingOptIn,
        reviewOptIn: input.reviewOptIn,
        postServiceOptIn: input.postServiceOptIn,
      },
    })

    return preference
  })
}

export async function listCrmCampaigns(
  actor: AuthenticatedUserData,
  query: ListCrmCampaignsQuery,
) {
  const unitId = resolveCrmReadUnitId(actor, query.unitId ?? null)

  return prisma.crmCampaign.findMany({
    where: {
      unitId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { campaignType: query.type } : {}),
    },
    include: crmCampaignDetailsInclude,
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function createCrmCampaign(
  actor: AuthenticatedUserData,
  input: CreateCrmCampaignInput,
) {
  const unitId = resolveScopedUnitId(actor, null)
  await assertActorCanUseTemplate(actor, {
    channel: input.channel,
    templateId: input.templateId,
    unitId,
  })

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.crmCampaign.create({
      data: {
        unitId,
        templateId: input.templateId,
        createdByUserId: actor.id,
        name: input.name,
        description: input.description ?? null,
        campaignType: input.type,
        channel: input.channel,
        status: input.status ?? CrmCampaignStatus.DRAFT,
        criteria: input.criteria,
      },
      include: crmCampaignDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId,
      userId: actor.id,
      action: 'crm.campaign.create',
      entityName: 'CrmCampaign',
      entityId: campaign.id,
      details: {
        campaignType: campaign.campaignType,
        channel: campaign.channel,
        status: campaign.status,
      },
    })

    return campaign
  })
}

export async function updateCrmCampaign(
  actor: AuthenticatedUserData,
  campaignId: string,
  input: UpdateCrmCampaignInput,
) {
  const existingCampaign = await getCrmCampaignOrThrow(actor, campaignId)
  const effectiveChannel = input.channel ?? existingCampaign.channel
  const effectiveTemplateId = input.templateId ?? existingCampaign.templateId

  if (!effectiveTemplateId) {
    throw new AppError('UNPROCESSABLE_ENTITY', 422, 'CRM campaign must keep a message template.')
  }

  await assertActorCanUseTemplate(actor, {
    channel: effectiveChannel,
    templateId: effectiveTemplateId,
    unitId: existingCampaign.unitId,
  })

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.crmCampaign.update({
      where: {
        id: campaignId,
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.type !== undefined ? { campaignType: input.type } : {}),
        ...(input.channel !== undefined ? { channel: input.channel } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.criteria !== undefined ? { criteria: input.criteria } : {}),
        ...(input.templateId !== undefined ? { templateId: input.templateId } : {}),
      },
      include: crmCampaignDetailsInclude,
    })

    await writeAuditLog(tx, {
      unitId: existingCampaign.unitId,
      userId: actor.id,
      action: 'crm.campaign.update',
      entityName: 'CrmCampaign',
      entityId: campaignId,
      details: {
        changedFields: Object.keys(input),
      },
    })

    return campaign
  })
}

export async function listCrmExecutions(
  actor: AuthenticatedUserData,
  query: ListCrmExecutionsQuery,
) {
  const unitId = resolveCrmReadUnitId(actor, query.unitId ?? null)

  return prisma.crmCampaignExecution.findMany({
    where: {
      campaign: {
        unitId,
        ...(query.campaignId ? { id: query.campaignId } : {}),
      },
      ...(query.recipientStatus
        ? {
            recipients: {
              some: {
                status: query.recipientStatus,
              },
            },
          }
        : {}),
    },
    include: crmCampaignExecutionDetailsInclude,
    orderBy: {
      startedAt: 'desc',
    },
    take: 10,
  })
}

export async function prepareCrmCampaignExecution(
  actor: AuthenticatedUserData,
  input: PrepareCrmCampaignExecutionInput,
) {
  const campaign = await getCrmCampaignOrThrow(actor, input.campaignId)

  if (campaign.status === CrmCampaignStatus.ARCHIVED) {
    throw new AppError('CONFLICT', 409, 'Archived CRM campaigns cannot be executed.')
  }

  if (!campaign.templateId || !campaign.template) {
    throw new AppError('CONFLICT', 409, 'CRM campaign needs a template before execution.')
  }

  const now = new Date()
  const recipients = await buildCampaignRecipients(actor, campaign, now)
  const preparedCount = recipients.filter(
    (recipient) => recipient.status === CrmCampaignRecipientStatus.PREPARED,
  ).length
  const skippedCount = recipients.filter(
    (recipient) => recipient.status === CrmCampaignRecipientStatus.SKIPPED,
  ).length

  const execution = await prisma.$transaction(async (tx) => {
    const createdExecution = await tx.crmCampaignExecution.create({
      data: {
        campaignId: campaign.id,
        executedByUserId: actor.id,
        status:
          preparedCount > 0
            ? CrmCampaignExecutionStatus.PREPARED
            : CrmCampaignExecutionStatus.COMPLETED,
        executionReason: input.reason ?? null,
        audienceSnapshot: buildExecutionAudienceSnapshot(recipients, now),
        preparedCount,
        skippedCount,
        completedAt: preparedCount > 0 ? null : now,
      },
    })

    if (recipients.length > 0) {
      await tx.crmCampaignRecipient.createMany({
        data: recipients.map((recipient) => ({
          appointmentId: recipient.appointmentId ?? null,
          campaignId: campaign.id,
          channel: recipient.channel,
          clientId: recipient.clientId,
          consentSnapshot: recipient.consentSnapshot as Prisma.InputJsonValue,
          executionId: createdExecution.id,
          matchSnapshot: recipient.matchSnapshot as Prisma.InputJsonValue,
          preparedMessage: recipient.preparedMessage,
          skippedReason: recipient.skippedReason ?? null,
          sourceKey: recipient.sourceKey,
          status: recipient.status,
        })),
      })
    }

    await tx.crmCampaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        lastExecutedAt: now,
      },
    })

    await writeAuditLog(tx, {
      unitId: campaign.unitId,
      userId: actor.id,
      action: 'crm.campaign.prepare_execution',
      entityName: 'CrmCampaignExecution',
      entityId: createdExecution.id,
      details: {
        campaignId: campaign.id,
        preparedCount,
        skippedCount,
      },
    })

    return createdExecution
  })

  return prisma.crmCampaignExecution.findUniqueOrThrow({
    where: {
      id: execution.id,
    },
    include: crmCampaignExecutionDetailsInclude,
  })
}

export async function launchCrmCampaignRecipient(actor: AuthenticatedUserData, recipientId: string) {
  const recipient = await prisma.crmCampaignRecipient.findUnique({
    where: {
      id: recipientId,
    },
    include: crmRecipientLaunchInclude,
  })

  if (!recipient) {
    throw new AppError('NOT_FOUND', 404, 'CRM recipient not found.')
  }

  assertActorCanUseClient(actor, recipient.campaign.unitId)

  if (recipient.status !== CrmCampaignRecipientStatus.PREPARED) {
    throw new AppError('CONFLICT', 409, 'Only prepared CRM recipients can be launched.')
  }

  if (!recipient.campaign.template) {
    throw new AppError('CONFLICT', 409, 'CRM campaign template is missing for this recipient.')
  }

  const destination = resolveMessageChannelDestination({
    channel: recipient.channel,
    email: recipient.client.user.email,
    phone: recipient.client.user.phone,
  })
  const launchContext = buildRecipientLaunchContext(recipient)
  const subject =
    recipient.channel === 'EMAIL' && recipient.campaign.template.subject
      ? renderMessageTemplate(recipient.campaign.template.subject, launchContext)
      : undefined
  const launchUrl = buildManualMessageLaunchUrl({
    channel: recipient.channel,
    destination,
    messageContent: recipient.preparedMessage,
    subject,
  })
  const launchedAt = new Date()

  const messageLog = await prisma.$transaction(async (tx) => {
    const createdLog = await tx.messageLog.create({
      data: {
        appointmentId: recipient.appointmentId ?? null,
        channel: recipient.channel,
        clientId: recipient.clientId,
        messageContent: recipient.preparedMessage,
        senderUserId: actor.id,
        sentAt: launchedAt,
        deliveryStatus: 'SENT',
        templateId: recipient.campaign.templateId ?? null,
      },
    })

    await tx.crmCampaignRecipient.update({
      where: {
        id: recipient.id,
      },
      data: {
        launchedAt,
        messageLogId: createdLog.id,
        skippedReason: null,
        status: CrmCampaignRecipientStatus.LAUNCHED,
      },
    })

    const remainingPreparedCount = await tx.crmCampaignRecipient.count({
      where: {
        executionId: recipient.executionId,
        status: CrmCampaignRecipientStatus.PREPARED,
        id: {
          not: recipient.id,
        },
      },
    })

    await tx.crmCampaignExecution.update({
      where: {
        id: recipient.executionId,
      },
      data: {
        launchedCount: {
          increment: 1,
        },
        ...(remainingPreparedCount === 0
          ? {
              completedAt: launchedAt,
              status: CrmCampaignExecutionStatus.COMPLETED,
            }
          : {}),
      },
    })

    await writeAuditLog(tx, {
      unitId: recipient.campaign.unitId,
      userId: actor.id,
      action: 'crm.recipient.launch',
      entityName: 'CrmCampaignRecipient',
      entityId: recipient.id,
      details: {
        campaignId: recipient.campaignId,
        executionId: recipient.executionId,
        messageLogId: createdLog.id,
      },
    })

    return createdLog
  })

  return {
    launchUrl,
    messageLog,
  }
}

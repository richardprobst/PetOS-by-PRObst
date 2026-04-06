import { PetSizeCategory } from '@prisma/client'

export interface CommunicationPreferenceSnapshot {
  emailOptIn: boolean
  marketingOptIn: boolean
  postServiceOptIn: boolean
  reviewOptIn: boolean
  whatsappOptIn: boolean
}

export interface CrmCampaignCriteria {
  breeds?: string[]
  inactivityDays?: number
  minimumCompletedAppointments?: number
  offerName?: string
  onlyClientsWithoutFutureAppointments?: boolean
  petSizeCategories?: PetSizeCategory[]
  postServiceDelayHours?: number
  reviewDelayHours?: number
}

export interface CrmClientProfile {
  breeds: string[]
  completedAppointmentCount: number
  hasFutureAppointment: boolean
  lastCompletedAt: Date | null
  petSizeCategories: PetSizeCategory[]
}

type CrmCampaignType =
  | 'REVIEW_BOOSTER'
  | 'SEGMENTED_CAMPAIGN'
  | 'INACTIVE_RECOVERY'
  | 'PROFILE_OFFER'
  | 'POST_SERVICE_TRIGGER'

function normalizeBreed(value: string) {
  return value.trim().toLowerCase()
}

export function deriveClientInactivityDays(lastCompletedAt: Date | null, now: Date) {
  if (!lastCompletedAt) {
    return null
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24
  return Math.max(0, Math.floor((now.getTime() - lastCompletedAt.getTime()) / millisecondsPerDay))
}

export function isChannelOptedIn(
  preference: CommunicationPreferenceSnapshot,
  channel: 'EMAIL' | 'WHATSAPP',
) {
  return channel === 'EMAIL' ? preference.emailOptIn : preference.whatsappOptIn
}

export function canExecuteCrmContact(
  preference: CommunicationPreferenceSnapshot,
  campaignType: CrmCampaignType,
  channel: 'EMAIL' | 'WHATSAPP',
) {
  if (!isChannelOptedIn(preference, channel)) {
    return false
  }

  if (campaignType === 'REVIEW_BOOSTER') {
    return preference.reviewOptIn
  }

  if (campaignType === 'POST_SERVICE_TRIGGER') {
    return preference.postServiceOptIn
  }

  return preference.marketingOptIn
}

export function matchesCrmCampaignCriteria(
  profile: CrmClientProfile,
  criteria: CrmCampaignCriteria,
  now: Date,
) {
  if (
    criteria.minimumCompletedAppointments !== undefined &&
    profile.completedAppointmentCount < criteria.minimumCompletedAppointments
  ) {
    return false
  }

  if (
    criteria.onlyClientsWithoutFutureAppointments &&
    profile.hasFutureAppointment
  ) {
    return false
  }

  if (criteria.petSizeCategories && criteria.petSizeCategories.length > 0) {
    const profileCategories = new Set(profile.petSizeCategories)
    const hasMatchingCategory = criteria.petSizeCategories.some((category) =>
      profileCategories.has(category),
    )

    if (!hasMatchingCategory) {
      return false
    }
  }

  if (criteria.breeds && criteria.breeds.length > 0) {
    const profileBreeds = new Set(profile.breeds.map(normalizeBreed))
    const hasMatchingBreed = criteria.breeds.some((breed) => profileBreeds.has(normalizeBreed(breed)))

    if (!hasMatchingBreed) {
      return false
    }
  }

  if (criteria.inactivityDays !== undefined) {
    const inactivityDays = deriveClientInactivityDays(profile.lastCompletedAt, now)

    if (inactivityDays === null || inactivityDays < criteria.inactivityDays) {
      return false
    }
  }

  return true
}

export function shouldPrepareReviewBooster(params: {
  alreadyPrepared: boolean
  completedAt: Date
  delayHours: number
  now: Date
}) {
  if (params.alreadyPrepared) {
    return false
  }

  return params.completedAt.getTime() <= params.now.getTime() - params.delayHours * 60 * 60 * 1000
}

export function shouldPreparePostServiceTrigger(params: {
  alreadyPrepared: boolean
  completedAt: Date
  delayHours: number
  now: Date
}) {
  if (params.alreadyPrepared) {
    return false
  }

  return params.completedAt.getTime() <= params.now.getTime() - params.delayHours * 60 * 60 * 1000
}

export function buildCrmRecipientSourceKey(input: {
  appointmentId?: string | null
  campaignType: CrmCampaignType
  clientId: string
}) {
  if (input.appointmentId) {
    return `${input.campaignType.toLowerCase()}:appointment:${input.appointmentId}`
  }

  return `${input.campaignType.toLowerCase()}:client:${input.clientId}`
}

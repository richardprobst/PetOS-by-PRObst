import type {
  TutorAssistantAppointmentDraft,
  TutorAssistantIntent,
  TutorAssistantMissingSlot,
} from './schemas'

export interface TutorAssistantPetOption {
  id: string
  name: string
}

export interface TutorAssistantServiceOption {
  id: string
  name: string
}

export interface TutorAssistantScheduleDraftInput {
  now?: Date
  pets: TutorAssistantPetOption[]
  services: TutorAssistantServiceOption[]
  transcript: string
}

const HELP_KEYWORDS = ['ajuda', 'comandos', 'o que voce faz']
const SCHEDULE_KEYWORDS = ['agendar', 'marcar', 'reservar']
const UPCOMING_KEYWORDS = ['proximo', 'agenda', 'agendamentos', 'horarios']
const FINANCE_KEYWORDS = ['financeiro', 'credito', 'deposito', 'reembolso']
const WAITLIST_KEYWORDS = ['waitlist', 'lista de espera']
const DOCUMENT_KEYWORDS = ['documento', 'documentos', 'assinatura', 'assinar', 'termo']

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}:/\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAny(text: string, keywords: readonly string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)))
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + days)
  return next
}

function resolveIntent(normalizedTranscript: string): TutorAssistantIntent {
  if (normalizedTranscript.length === 0 || includesAny(normalizedTranscript, HELP_KEYWORDS)) {
    return 'HELP'
  }

  if (includesAny(normalizedTranscript, SCHEDULE_KEYWORDS)) {
    return 'SCHEDULE_APPOINTMENT'
  }

  if (includesAny(normalizedTranscript, FINANCE_KEYWORDS)) {
    return 'QUERY_FINANCE_SUMMARY'
  }

  if (includesAny(normalizedTranscript, WAITLIST_KEYWORDS)) {
    return 'QUERY_WAITLIST_STATUS'
  }

  if (includesAny(normalizedTranscript, DOCUMENT_KEYWORDS)) {
    return 'QUERY_PENDING_DOCUMENTS'
  }

  if (includesAny(normalizedTranscript, UPCOMING_KEYWORDS)) {
    return 'QUERY_UPCOMING_APPOINTMENTS'
  }

  return 'UNKNOWN'
}

function matchPet(normalizedTranscript: string, pets: TutorAssistantPetOption[]) {
  return [...pets]
    .sort((left, right) => right.name.length - left.name.length)
    .find((pet) => normalizedTranscript.includes(normalizeText(pet.name)))
}

function serviceNameMatchesTranscript(normalizedTranscript: string, serviceName: string) {
  const normalizedService = normalizeText(serviceName)

  if (normalizedTranscript.includes(normalizedService)) {
    return true
  }

  const significantWords = normalizedService
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length >= 4)

  return significantWords.length > 0
    ? significantWords.every((word) => normalizedTranscript.includes(word))
    : false
}

function matchServices(normalizedTranscript: string, services: TutorAssistantServiceOption[]) {
  return services.filter((service) => serviceNameMatchesTranscript(normalizedTranscript, service.name))
}

function parseDateReference(normalizedTranscript: string, now: Date) {
  if (normalizedTranscript.includes('depois de amanha')) {
    return addDays(now, 2)
  }

  if (normalizedTranscript.includes('amanha')) {
    return addDays(now, 1)
  }

  if (normalizedTranscript.includes('hoje')) {
    return addDays(now, 0)
  }

  const explicitDateMatch = normalizedTranscript.match(
    /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
  )

  if (!explicitDateMatch) {
    return null
  }

  const day = Number(explicitDateMatch[1])
  const month = Number(explicitDateMatch[2])
  const rawYear = explicitDateMatch[3]
  const currentYear = now.getFullYear()
  const year =
    rawYear === undefined
      ? currentYear
      : rawYear.length === 2
        ? 2000 + Number(rawYear)
        : Number(rawYear)

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    day < 1 ||
    month < 1 ||
    month > 12
  ) {
    return null
  }

  const parsedDate = new Date(year, month - 1, day)

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null
  }

  parsedDate.setHours(0, 0, 0, 0)
  return parsedDate
}

function parseTimeReference(normalizedTranscript: string) {
  const explicitTimePatterns = [
    /(?:as|para as|pelas)\s*(\d{1,2})(?::(\d{2}))?\s*(?:h|hora|horas)?\b/u,
    /\b(\d{1,2})h(?:(\d{2}))?\b/u,
    /\b(\d{1,2}):(\d{2})\b/u,
  ]

  for (const pattern of explicitTimePatterns) {
    const match = normalizedTranscript.match(pattern)

    if (!match) {
      continue
    }

    const hours = Number(match[1])
    const minutes = match[2] ? Number(match[2]) : 0

    if (
      Number.isInteger(hours) &&
      Number.isInteger(minutes) &&
      hours >= 0 &&
      hours <= 23 &&
      minutes >= 0 &&
      minutes <= 59
    ) {
      return { hours, minutes }
    }
  }

  return null
}

function combineDateAndTime(
  date: Date | null,
  time: { hours: number; minutes: number } | null,
) {
  if (!date || !time) {
    return null
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.hours,
    time.minutes,
    0,
    0,
  )
}

function buildSummary(input: {
  matchedPet: TutorAssistantPetOption | undefined
  matchedServices: TutorAssistantServiceOption[]
  startAt: Date | null
}) {
  const serviceLabel =
    input.matchedServices.length > 0
      ? input.matchedServices.map((service) => service.name).join(', ')
      : 'servico ainda nao identificado'
  const petLabel = input.matchedPet?.name ?? 'pet ainda nao identificado'
  const startAtLabel = input.startAt
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(input.startAt)
    : 'horario ainda incompleto'

  return `${serviceLabel} para ${petLabel} em ${startAtLabel}.`
}

function resolveMissingSlots(input: {
  matchedPet: TutorAssistantPetOption | undefined
  matchedServices: TutorAssistantServiceOption[]
  parsedDate: Date | null
  parsedTime: { hours: number; minutes: number } | null
}): TutorAssistantMissingSlot[] {
  const missing: TutorAssistantMissingSlot[] = []

  if (!input.matchedPet) {
    missing.push('PET')
  }

  if (input.matchedServices.length === 0) {
    missing.push('SERVICE')
  }

  if (!input.parsedDate) {
    missing.push('DATE')
  }

  if (!input.parsedTime) {
    missing.push('TIME')
  }

  return missing
}

export function buildTutorAssistantHelpReply() {
  return [
    'Posso ajudar com consultas e com o agendamento assistido do portal.',
    'Exemplos: "quais sao meus proximos agendamentos", "como esta meu financeiro", "como esta minha waitlist" ou "quero agendar banho para Thor amanha as 14h".',
  ].join(' ')
}

export function interpretTutorAssistantTranscript(transcript: string): TutorAssistantIntent {
  return resolveIntent(normalizeText(transcript))
}

export function buildTutorAssistantScheduleDraft(
  input: TutorAssistantScheduleDraftInput,
): TutorAssistantAppointmentDraft {
  const normalizedTranscript = normalizeText(input.transcript)
  const now = input.now ?? new Date()
  const matchedPet = matchPet(normalizedTranscript, input.pets)
  const matchedServices = matchServices(normalizedTranscript, input.services)
  const parsedDate = parseDateReference(normalizedTranscript, now)
  const parsedTime = parseTimeReference(normalizedTranscript)
  const startAt = combineDateAndTime(parsedDate, parsedTime)

  return {
    assistantSummary: buildSummary({
      matchedPet,
      matchedServices,
      startAt,
    }),
    clientNotes: null,
    missingSlots: resolveMissingSlots({
      matchedPet,
      matchedServices,
      parsedDate,
      parsedTime,
    }),
    petId: matchedPet?.id ?? null,
    petName: matchedPet?.name ?? null,
    serviceIds: matchedServices.map((service) => service.id),
    serviceNames: matchedServices.map((service) => service.name),
    sourceTranscript: input.transcript.trim(),
    startAt,
  }
}

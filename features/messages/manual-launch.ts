import { MessageChannel } from '@prisma/client'
import { AppError } from '@/server/http/errors'
import { formatDateTime } from '@/lib/formatters'

const templateVariablePattern = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi

interface MessageTemplateContext {
  clientName?: string | null
  inactivityDays?: number | null
  lastCompletedAt?: Date | string | null
  lastServiceName?: string | null
  offerName?: string | null
  petName?: string | null
  appointmentStartAt?: Date | string | null
}

function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, '')
}

export function normalizeWhatsAppDestination(phone: string) {
  const digits = normalizePhoneDigits(phone)

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  if (digits.length >= 12 && digits.length <= 13) {
    return digits
  }

  throw new AppError(
    'CONFLICT',
    409,
    'Client phone is invalid for WhatsApp Web launch.',
  )
}

export function renderMessageTemplate(templateBody: string, context: MessageTemplateContext) {
  const variables: Record<string, string> = {
    cliente_nome: context.clientName ?? '',
    dias_inativo:
      context.inactivityDays !== null && context.inactivityDays !== undefined
        ? String(context.inactivityDays)
        : '',
    ultima_visita: context.lastCompletedAt ? formatDateTime(context.lastCompletedAt) : '',
    ultimo_servico: context.lastServiceName ?? '',
    oferta_nome: context.offerName ?? '',
    pet_nome: context.petName ?? '',
    horario: context.appointmentStartAt ? formatDateTime(context.appointmentStartAt) : '',
  }

  return templateBody.replace(templateVariablePattern, (_match, variableName: string) => {
    return variables[variableName.toLowerCase()] ?? ''
  })
}

export function resolveMessageChannelDestination(input: {
  channel: MessageChannel
  email?: string | null
  phone?: string | null
}) {
  if (input.channel === 'WHATSAPP') {
    if (!input.phone) {
      throw new AppError(
        'CONFLICT',
        409,
        'Client phone is required to open WhatsApp Web.',
      )
    }

    return input.phone
  }

  if (!input.email) {
    throw new AppError('CONFLICT', 409, 'Client email is required to open the email channel.')
  }

  return input.email
}

export function buildManualMessageLaunchUrl(input: {
  channel: MessageChannel
  destination: string
  messageContent: string
  subject?: string
}) {
  if (input.channel === 'WHATSAPP') {
    return `https://wa.me/${normalizeWhatsAppDestination(input.destination)}?text=${encodeURIComponent(input.messageContent)}`
  }

  const query = new URLSearchParams({
    subject: input.subject ?? 'Atualizacao do atendimento PetOS',
    body: input.messageContent,
  })

  return `mailto:${input.destination}?${query.toString()}`
}

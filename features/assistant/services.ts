import { randomUUID } from 'node:crypto'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAiExecutionAuditLogs } from '@/server/audit/ai'
import { assertPermission } from '@/server/authorization/access-control'
import { getEnv } from '@/server/env'
import { prisma } from '@/server/db/prisma'
import { AppError } from '@/server/http/errors'
import { createAiCompletedOutcome, createAiInferenceRequest } from '@/features/ai/domain'
import {
  completeAiInferenceExecution,
  runAiInferenceExecution,
  startAiInferenceExecution,
} from '@/features/ai/execution'
import { isDocumentSignaturePendingForTutor } from '@/features/documents/services'
import { listServices } from '@/features/services/services'
import { getTutorPortalOverview, createTutorAppointment } from '@/features/tutor/services'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import {
  buildTutorAssistantHelpReply,
  buildTutorAssistantScheduleDraft,
  interpretTutorAssistantTranscript,
} from './domain'
import {
  tutorAssistantApiResponseSchema,
  type TutorAssistantApiResponse,
  type TutorAssistantAppointmentDraft,
  type TutorAssistantChannel,
  type TutorAssistantConfirmRequest,
  type TutorAssistantInterpretRequest,
  type TutorAssistantIntent,
} from './schemas'

type AssistantEnvironment = {
  AI_ENABLED: string | undefined
  AI_IMAGE_ANALYSIS_ENABLED: string | undefined
  AI_PREDICTIVE_INSIGHTS_ENABLED: string | undefined
  AI_VIRTUAL_ASSISTANT_ENABLED: string | undefined
  AI_IMAGE_ANALYSIS_BASE_QUOTA: string | undefined
  AI_PREDICTIVE_INSIGHTS_BASE_QUOTA: string | undefined
  AI_VIRTUAL_ASSISTANT_BASE_QUOTA: string | undefined
}

function getAssistantEnvironment(): AssistantEnvironment {
  const environment = getEnv()

  return {
    AI_ENABLED: environment.AI_ENABLED,
    AI_IMAGE_ANALYSIS_ENABLED: environment.AI_IMAGE_ANALYSIS_ENABLED,
    AI_IMAGE_ANALYSIS_BASE_QUOTA: environment.AI_IMAGE_ANALYSIS_BASE_QUOTA,
    AI_PREDICTIVE_INSIGHTS_ENABLED: environment.AI_PREDICTIVE_INSIGHTS_ENABLED,
    AI_PREDICTIVE_INSIGHTS_BASE_QUOTA:
      environment.AI_PREDICTIVE_INSIGHTS_BASE_QUOTA,
    AI_VIRTUAL_ASSISTANT_ENABLED: environment.AI_VIRTUAL_ASSISTANT_ENABLED,
    AI_VIRTUAL_ASSISTANT_BASE_QUOTA: environment.AI_VIRTUAL_ASSISTANT_BASE_QUOTA,
  }
}

function createVirtualAssistantOperationalMetadata() {
  return {
    cost: {
      costClass: 'LOW' as const,
      estimateLabel: 'deterministic-tutor-assistant',
      metadataOrigin: 'ESTIMATED' as const,
      status: 'ESTIMATED' as const,
    },
    model: {
      modelId: 'voice-assistant-ptbr-v1',
      modelStatus: 'DECLARED' as const,
    },
    provider: {
      contractVersion: 'phase4-assistant-foundation',
      providerId: 'internal-deterministic-assistant',
      providerStatus: 'DECLARED' as const,
    },
  }
}

function buildInferenceKey(intent: TutorAssistantIntent, mode: 'interpret' | 'confirm') {
  switch (intent) {
    case 'SCHEDULE_APPOINTMENT':
      return `voice.tutor.schedule.${mode}.v1`
    case 'QUERY_UPCOMING_APPOINTMENTS':
      return `voice.tutor.query.upcoming.${mode}.v1`
    case 'QUERY_FINANCE_SUMMARY':
      return `voice.tutor.query.finance.${mode}.v1`
    case 'QUERY_WAITLIST_STATUS':
      return `voice.tutor.query.waitlist.${mode}.v1`
    case 'QUERY_PENDING_DOCUMENTS':
      return `voice.tutor.query.documents.${mode}.v1`
    case 'HELP':
      return `voice.tutor.help.${mode}.v1`
    case 'UNKNOWN':
      return `voice.tutor.unknown.${mode}.v1`
  }
}

function createInputSummary(channel: TutorAssistantChannel, transcript: string) {
  const words = transcript
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0).length

  return `Tutor voice assistant ${channel.toLowerCase()} request with ${words} token(s).`
}

async function completeAssistantEnvelope(input: {
  actor: AuthenticatedUserData
  channel: TutorAssistantChannel
  intent: TutorAssistantIntent
  mode: 'interpret' | 'confirm'
  references?: Array<{ kind: string; value: string }>
  reply: string
  transcript: string
}) {
  const request = createAiInferenceRequest({
    inferenceKey: buildInferenceKey(input.intent, input.mode),
    inputSummary: createInputSummary(input.channel, input.transcript),
    module: 'VIRTUAL_ASSISTANT',
    origin: 'SERVER_ACTION',
    references: input.references ?? [],
    requestedAt: new Date(),
    requestedByUserId: input.actor.id,
    requestId: `voice_assistant_${randomUUID()}`,
    subject: {
      entityId: input.actor.id,
      entityName: 'Tutor',
    },
    unitId: input.actor.unitId,
  })
  const envelope = startAiInferenceExecution(request, {
    consent: {
      origin: 'NOT_PROVIDED',
      purpose: 'VOICE_ASSISTANT_TUTOR',
      scope: 'CLIENT',
    },
    environment: getAssistantEnvironment(),
    executionMode: 'IMMEDIATE',
    operationalMetadata: createVirtualAssistantOperationalMetadata(),
  })

  if (envelope.status === 'BLOCKED' || envelope.status === 'FAILED') {
    await writeAiExecutionAuditLogs(prisma, {
      actor: input.actor,
      envelope,
    })

    return envelope
  }

  const runningEnvelope = runAiInferenceExecution(envelope)
  const completedEnvelope = completeAiInferenceExecution(
    runningEnvelope,
    createAiCompletedOutcome(request, {
      interpretedResult: {
        humanReviewRequired: false,
        recommendations: [],
        signals: [
          {
            key: 'assistant_channel',
            label: 'Canal',
            value: input.channel,
          },
          {
            key: 'assistant_intent',
            label: 'Intencao',
            value: input.intent,
          },
        ],
        summary: input.reply,
      },
    }),
  )

  await writeAiExecutionAuditLogs(prisma, {
    actor: input.actor,
    envelope: completedEnvelope,
  })

  return completedEnvelope
}

function buildBlockedResponse(
  intent: TutorAssistantIntent,
  envelope: Awaited<ReturnType<typeof completeAssistantEnvelope>>,
) {
  const reply =
    envelope.outcome?.status === 'COMPLETED'
      ? envelope.outcome.interpretedResult.summary
      : envelope.outcome?.error.message ??
        'O assistente virtual nao esta disponivel neste momento.'

  return tutorAssistantApiResponseSchema.parse({
    appointmentId: null,
    appointmentStartAt: null,
    draft: null,
    envelopeStatus: envelope.status,
    intent,
    reply,
    status: 'BLOCKED',
  })
}

function buildInterpretResponse(input: {
  draft: TutorAssistantAppointmentDraft | null
  envelope: Awaited<ReturnType<typeof completeAssistantEnvelope>>
  intent: TutorAssistantIntent
  reply: string
  status: TutorAssistantApiResponse['status']
}) {
  return tutorAssistantApiResponseSchema.parse({
    appointmentId: null,
    appointmentStartAt: null,
    draft: input.draft,
    envelopeStatus: input.envelope.status,
    intent: input.intent,
    reply: input.reply,
    status: input.status,
  })
}

function buildUpcomingReply(
  appointments: Awaited<ReturnType<typeof getTutorPortalOverview>>['appointmentTimeline']['upcoming'],
) {
  if (appointments.length === 0) {
    return 'Voce nao tem proximos agendamentos cadastrados no portal.'
  }

  const summary = appointments.slice(0, 3).map((appointment) => {
    return `${appointment.pet.name} em ${formatDateTime(appointment.startAt)} (${appointment.operationalStatus.name}).`
  })

  return `Seus proximos agendamentos: ${summary.join(' ')}`
}

function buildFinanceReply(
  finance: Awaited<ReturnType<typeof getTutorPortalOverview>>['finance'],
) {
  return [
    `Financeiro proprio do portal: depositos pendentes ${formatCurrency(finance.summary.pendingDepositAmount)},`,
    `creditos disponiveis ${formatCurrency(finance.summary.availableCreditAmount)}`,
    `e reembolsos concluidos ${formatCurrency(finance.summary.completedRefundAmount)}.`,
  ].join(' ')
}

function buildWaitlistReply(
  waitlistEntries: Awaited<ReturnType<typeof getTutorPortalOverview>>['waitlistEntries'],
) {
  const pendingEntries = waitlistEntries.filter((entry) => entry.status === 'PENDING')

  if (pendingEntries.length === 0) {
    return 'Voce nao tem entradas pendentes na waitlist.'
  }

  const details = pendingEntries.slice(0, 2).map((entry) => {
    return `${entry.pet.name} para ${entry.desiredService.name} entre ${formatDateTime(entry.preferredStartAt)} e ${formatDateTime(entry.preferredEndAt)}.`
  })

  return `Voce tem ${pendingEntries.length} entrada(s) pendente(s) na waitlist. ${details.join(' ')}`
}

function buildPendingDocumentsReply(
  portal: Awaited<ReturnType<typeof getTutorPortalOverview>>,
  tutor: AuthenticatedUserData,
) {
  const pendingSignatureCount = portal.documents.filter((document) =>
    isDocumentSignaturePendingForTutor(tutor, document),
  ).length

  if (pendingSignatureCount === 0) {
    return 'Nao ha documentos pendentes de assinatura no seu portal.'
  }

  return `Existem ${pendingSignatureCount} documento(s) aguardando sua assinatura no portal.`
}

function buildScheduleReply(draft: TutorAssistantAppointmentDraft) {
  if (draft.missingSlots.length === 0) {
    return `Montei um rascunho de agendamento: ${draft.assistantSummary} Revise os campos e confirme a criacao quando quiser.`
  }

  const labels: Record<TutorAssistantAppointmentDraft['missingSlots'][number], string> = {
    DATE: 'data',
    PET: 'pet',
    SERVICE: 'servico',
    TIME: 'horario',
  }

  const missingLabel = draft.missingSlots.map((slot) => labels[slot]).join(', ')
  return `Entendi que voce quer agendar um atendimento, mas ainda faltam ${missingLabel}. Complete os campos abaixo e confirme pelo portal.`
}

function buildUnknownReply() {
  return [
    'Ainda nao consegui interpretar esse pedido com seguranca.',
    'Voce pode pedir proximos agendamentos, financeiro, waitlist, documentos pendentes ou dizer algo como "quero agendar banho para Thor amanha as 14h".',
  ].join(' ')
}

export async function interpretTutorAssistantRequest(
  tutor: AuthenticatedUserData,
  input: TutorAssistantInterpretRequest,
): Promise<TutorAssistantApiResponse> {
  assertPermission(tutor, 'portal_tutor.acessar')
  const intent = interpretTutorAssistantTranscript(input.transcript)

  if (intent === 'HELP') {
    const reply = buildTutorAssistantHelpReply()
    const envelope = await completeAssistantEnvelope({
      actor: tutor,
      channel: input.channel,
      intent,
      reply,
      transcript: input.transcript,
      mode: 'interpret',
    })

    if (envelope.status !== 'COMPLETED') {
      return buildBlockedResponse(intent, envelope)
    }

    return buildInterpretResponse({
      draft: null,
      envelope,
      intent,
      reply,
      status: 'ANSWERED',
    })
  }

  if (intent === 'UNKNOWN') {
    const reply = buildUnknownReply()
    const envelope = await completeAssistantEnvelope({
      actor: tutor,
      channel: input.channel,
      intent,
      reply,
      transcript: input.transcript,
      mode: 'interpret',
    })

    if (envelope.status !== 'COMPLETED') {
      return buildBlockedResponse(intent, envelope)
    }

    return buildInterpretResponse({
      draft: null,
      envelope,
      intent,
      reply,
      status: 'NEEDS_CLARIFICATION',
    })
  }

  if (intent === 'SCHEDULE_APPOINTMENT') {
    assertPermission(tutor, 'agendamento.criar_proprio')
    const [portal, services] = await Promise.all([
      getTutorPortalOverview(tutor),
      listServices(tutor, { active: true }),
    ])
    const draft = buildTutorAssistantScheduleDraft({
      now: new Date(),
      pets: portal.dashboard.pets.map((pet) => ({
        id: pet.id,
        name: pet.name,
      })),
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
      })),
      transcript: input.transcript,
    })
    const reply = buildScheduleReply(draft)
    const references = [
      ...(draft.petId ? [{ kind: 'pet', value: draft.petId }] : []),
      ...draft.serviceIds.map((serviceId) => ({ kind: 'service', value: serviceId })),
    ]
    const envelope = await completeAssistantEnvelope({
      actor: tutor,
      channel: input.channel,
      intent,
      references,
      reply,
      transcript: input.transcript,
      mode: 'interpret',
    })

    if (envelope.status !== 'COMPLETED') {
      return buildBlockedResponse(intent, envelope)
    }

    return buildInterpretResponse({
      draft,
      envelope,
      intent,
      reply,
      status:
        draft.missingSlots.length === 0
          ? 'NEEDS_CONFIRMATION'
          : 'NEEDS_CLARIFICATION',
    })
  }

  const portal = await getTutorPortalOverview(tutor)
  let reply = ''

  switch (intent) {
    case 'QUERY_UPCOMING_APPOINTMENTS':
      assertPermission(tutor, 'agendamento.visualizar_proprio')
      reply = buildUpcomingReply(portal.appointmentTimeline.upcoming)
      break
    case 'QUERY_FINANCE_SUMMARY':
      assertPermission(tutor, 'financeiro.visualizar_proprio')
      reply = buildFinanceReply(portal.finance)
      break
    case 'QUERY_WAITLIST_STATUS':
      assertPermission(tutor, 'agenda.waitlist.visualizar_proprio')
      reply = buildWaitlistReply(portal.waitlistEntries)
      break
    case 'QUERY_PENDING_DOCUMENTS':
      assertPermission(tutor, 'documento.visualizar_proprio')
      reply = buildPendingDocumentsReply(portal, tutor)
      break
    default:
      throw new AppError('BAD_REQUEST', 400, 'Unsupported tutor assistant intent.')
  }

  const envelope = await completeAssistantEnvelope({
    actor: tutor,
    channel: input.channel,
    intent,
    reply,
    transcript: input.transcript,
    mode: 'interpret',
  })

  if (envelope.status !== 'COMPLETED') {
    return buildBlockedResponse(intent, envelope)
  }

  return buildInterpretResponse({
    draft: null,
    envelope,
    intent,
    reply,
    status: 'ANSWERED',
  })
}

export async function confirmTutorAssistantDraft(
  tutor: AuthenticatedUserData,
  input: TutorAssistantConfirmRequest,
): Promise<TutorAssistantApiResponse> {
  assertPermission(tutor, 'agendamento.criar_proprio')

  const appointment = await createTutorAppointment(tutor, {
    clientNotes:
      input.draft.clientNotes ??
      'Solicitado pelo assistente virtual do tutor.',
    endAt: undefined,
    petId: input.draft.petId,
    serviceIds: input.draft.serviceIds,
    startAt: input.draft.startAt,
  })

  const reply = `Agendamento criado para ${appointment.pet.name} em ${formatDateTime(appointment.startAt)}.`
  const envelope = await completeAssistantEnvelope({
    actor: tutor,
    channel: 'TEXT',
    intent: 'SCHEDULE_APPOINTMENT',
    references: [
      { kind: 'appointment', value: appointment.id },
      { kind: 'pet', value: appointment.petId },
      ...appointment.services.map((serviceItem) => ({
        kind: 'service',
        value: serviceItem.serviceId,
      })),
    ],
    reply,
    transcript: input.draft.sourceTranscript,
    mode: 'confirm',
  })

  if (envelope.status !== 'COMPLETED') {
    return buildBlockedResponse('SCHEDULE_APPOINTMENT', envelope)
  }

  return tutorAssistantApiResponseSchema.parse({
    appointmentId: appointment.id,
    appointmentStartAt: appointment.startAt,
    draft: input.draft,
    envelopeStatus: envelope.status,
    intent: 'SCHEDULE_APPOINTMENT',
    reply,
    status: 'ANSWERED',
  })
}

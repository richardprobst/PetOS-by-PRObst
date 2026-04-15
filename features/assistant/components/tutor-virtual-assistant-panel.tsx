'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  TutorAssistantApiResponse,
  TutorAssistantAppointmentDraft,
  TutorAssistantUsageSnapshot,
} from '@/features/assistant/schemas'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { FormField } from '@/components/ui/form-field'
import { StatusBadge } from '@/components/ui/status-badge'

interface TutorVirtualAssistantPanelProps {
  pets: Array<{
    id: string
    name: string
  }>
  services: Array<{
    id: string
    name: string
  }>
  usageSnapshot: TutorAssistantUsageSnapshot
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: {
    transcript: string
  }
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start(): void
  stop(): void
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
}

function toDateTimeLocalValue(value: Date | string | null) {
  if (!value) {
    return ''
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function setMissingSlot(
  slots: TutorAssistantAppointmentDraft['missingSlots'],
  slot: TutorAssistantAppointmentDraft['missingSlots'][number],
  present: boolean,
) {
  if (present) {
    return slots.filter((entry) => entry !== slot)
  }

  return slots.includes(slot) ? slots : [...slots, slot]
}

function getInteractionStatusTone(
  status: TutorAssistantApiResponse['status'] | null | undefined,
) {
  if (status === 'ANSWERED') {
    return 'success' as const
  }

  if (status === 'BLOCKED') {
    return 'danger' as const
  }

  if (status === 'NEEDS_CONFIRMATION') {
    return 'info' as const
  }

  return 'warning' as const
}

export function TutorVirtualAssistantPanel({
  pets,
  services,
  usageSnapshot,
}: TutorVirtualAssistantPanelProps) {
  const router = useRouter()
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState<TutorAssistantApiResponse | null>(null)
  const [draft, setDraft] = useState<TutorAssistantAppointmentDraft | null>(null)
  const [assistantUsageSnapshot, setAssistantUsageSnapshot] =
    useState<TutorAssistantUsageSnapshot>(usageSnapshot)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const speechRecognitionSupported =
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  useEffect(() => {
    setAssistantUsageSnapshot(usageSnapshot)
  }, [usageSnapshot])

  useEffect(() => {
    if (
      !autoSpeak ||
      !response?.reply ||
      typeof window === 'undefined' ||
      !window.speechSynthesis
    ) {
      return
    }

    const utterance = new SpeechSynthesisUtterance(response.reply)
    utterance.lang = 'pt-BR'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)

    return () => {
      window.speechSynthesis.cancel()
    }
  }, [autoSpeak, response?.reply])

  function updateDraft(nextDraft: TutorAssistantAppointmentDraft | null) {
    setDraft(nextDraft)
    setResponse((current) =>
      current
        ? {
            ...current,
            draft: nextDraft,
          }
        : current,
    )
  }

  async function submitInterpretRequest(channel: 'TEXT' | 'VOICE') {
    const normalizedTranscript = transcript.trim()

    if (!normalizedTranscript) {
      setErrorMessage('Digite ou dite um pedido antes de enviar ao assistente.')
      return
    }

    setIsPending(true)
    setErrorMessage(null)

    try {
      const request = await fetch('/api/tutor/virtual-assistant', {
        body: JSON.stringify({
          input: {
            channel,
            transcript: normalizedTranscript,
          },
          mode: 'INTERPRET',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await request.json()) as TutorAssistantApiResponse | { error?: { message?: string } }

      if (!request.ok) {
        throw new Error(payload && 'error' in payload ? payload.error?.message : 'Falha ao consultar o assistente.')
      }

      setResponse(payload as TutorAssistantApiResponse)
      updateDraft((payload as TutorAssistantApiResponse).draft)
      setAssistantUsageSnapshot(
        (payload as TutorAssistantApiResponse).usageSnapshot ?? usageSnapshot,
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao consultar o assistente.')
    } finally {
      setIsPending(false)
    }
  }

  async function confirmDraft() {
    if (!draft?.petId || draft.serviceIds.length === 0 || !draft.startAt) {
      setErrorMessage('Preencha pet, servico e horario antes de confirmar o atendimento.')
      return
    }

    setIsPending(true)
    setErrorMessage(null)

    try {
      const request = await fetch('/api/tutor/virtual-assistant', {
        body: JSON.stringify({
          input: {
            draft,
          },
          mode: 'CONFIRM',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })
      const payload = (await request.json()) as TutorAssistantApiResponse | { error?: { message?: string } }

      if (!request.ok) {
        throw new Error(payload && 'error' in payload ? payload.error?.message : 'Falha ao confirmar o atendimento.')
      }

      setResponse(payload as TutorAssistantApiResponse)
      updateDraft((payload as TutorAssistantApiResponse).draft)
      setAssistantUsageSnapshot(
        (payload as TutorAssistantApiResponse).usageSnapshot ?? usageSnapshot,
      )
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao confirmar o atendimento.')
    } finally {
      setIsPending(false)
    }
  }

  function toggleListening() {
    if (!speechRecognitionSupported || typeof window === 'undefined') {
      setErrorMessage('O navegador atual nao oferece reconhecimento de voz compativel.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognitionConstructor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionConstructor) {
      setErrorMessage('O navegador atual nao oferece reconhecimento de voz compativel.')
      return
    }

    const recognition = new SpeechRecognitionConstructor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'pt-BR'
    recognition.onerror = (event) => {
      setIsListening(false)
      setErrorMessage(`Falha no reconhecimento de voz: ${event.error}.`)
    }
    recognition.onend = () => {
      setIsListening(false)
    }
    recognition.onresult = (event) => {
      const nextTranscript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join(' ')
        .trim()

      if (nextTranscript) {
        setTranscript(nextTranscript)
      }
    }

    recognitionRef.current = recognition
    setErrorMessage(null)
    setIsListening(true)
    recognition.start()
  }

  return (
    <section className="surface-panel rounded-[1.75rem] p-6" id="assistente-virtual">
      <p className="section-label">Assistente virtual</p>
      <p className="mt-4 text-lg font-semibold text-[color:var(--foreground)]">
        Interacao por voz para consultas e agendamento assistido.
      </p>
      <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
        Este recorte e conservador: o audio nao sobe para o servidor, o backend continua
        como autoridade do agendamento e nenhuma criacao acontece sem confirmacao explicita.
      </p>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <FormField
            description='Exemplos: "quais sao meus proximos agendamentos" ou "quero agendar banho para Thor amanha as 14h".'
            label="Pedido do tutor"
          >
            <textarea
              className="ui-input min-h-32"
              onChange={(event) => setTranscript(event.target.value)}
              value={transcript}
            />
          </FormField>

          <div className="flex flex-wrap gap-3">
            <button
              className="ui-button-primary"
              disabled={isPending}
              onClick={() => {
                void submitInterpretRequest('TEXT')
              }}
              type="button"
            >
              {isPending ? 'Consultando...' : 'Enviar ao assistente'}
            </button>
            <button
              className="ui-button-secondary"
              onClick={toggleListening}
              type="button"
            >
              {isListening ? 'Parar gravacao' : 'Ditar comando'}
            </button>
          </div>

          <label className="flex items-center gap-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
            <input
              checked={autoSpeak}
              onChange={(event) => setAutoSpeak(event.target.checked)}
              type="checkbox"
            />
            Ler a resposta em voz alta quando o navegador suportar.
          </label>

          {!speechRecognitionSupported ? (
            <FeedbackMessage
              description="O navegador atual nao expoe uma API compativel de reconhecimento de voz. O assistente continua funcionando por texto."
              title="Voz indisponivel no navegador"
              tone="warning"
            />
          ) : null}

          {errorMessage ? (
            <FeedbackMessage description={errorMessage} title="Assistente virtual" tone="error" />
          ) : null}
        </div>

        <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
            Estado atual
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone="info">{response?.intentLabel ?? 'Aguardando pedido'}</StatusBadge>
            <StatusBadge tone={getInteractionStatusTone(response?.status)}>
              {response?.statusLabel ?? 'Pronto'}
            </StatusBadge>
          </div>

          <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
            {response?.reply ??
              'O assistente responde consultas do portal e monta rascunhos de agendamento para confirmacao posterior.'}
          </p>

          {response?.appointmentId ? (
            <p className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">
              Atendimento confirmado: {response.appointmentId}
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                Ultimos 7 dias
              </p>
              <p className="mt-3 text-2xl font-semibold text-[color:var(--foreground)]">
                {assistantUsageSnapshot.summary.totalLast7Days}
              </p>
              <p className="mt-2 text-xs leading-5 text-[color:var(--foreground-soft)]">
                {assistantUsageSnapshot.summary.totalLast30Days} interacao(oes) nos ultimos 30 dias
              </p>
            </article>

            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                Confirmacoes e bloqueios
              </p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]">
                {assistantUsageSnapshot.summary.confirmationsLast30Days} rascunho(s) prontos para confirmar
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                {assistantUsageSnapshot.summary.blockedLast30Days} bloqueio(s) e {assistantUsageSnapshot.summary.needsClarificationLast30Days} pedido(s) para esclarecer
              </p>
            </article>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
              Historico minimo
            </p>
            {assistantUsageSnapshot.recentInteractions.length > 0 ? (
              <div className="mt-3 space-y-3">
                {assistantUsageSnapshot.recentInteractions.map((interaction) => (
                  <article
                    className="rounded-[1rem] border border-[color:var(--line)] bg-white/70 p-3"
                    key={`${interaction.inferenceKey}:${interaction.occurredAt.toISOString()}`}
                  >
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={getInteractionStatusTone(interaction.status)}>
                        {interaction.statusLabel}
                      </StatusBadge>
                      <StatusBadge tone="info">{interaction.intentLabel}</StatusBadge>
                      {interaction.channel ? (
                        <StatusBadge tone="neutral">
                          {interaction.channelLabel ?? interaction.channel}
                        </StatusBadge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[color:var(--foreground-soft)]">
                      {new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(interaction.occurredAt)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                      {interaction.replyPreview ??
                        'Interacao registrada sem resumo adicional no recorte atual.'}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Ainda nao ha interacoes registradas para este portal.
              </p>
            )}
          </div>
        </div>
      </div>

      {draft ? (
        <div className="mt-6 rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 p-5">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            Rascunho assistido de agendamento
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            {draft.assistantSummary}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField label="Pet">
              <select
                className="ui-input"
                onChange={(event) => {
                  const pet = pets.find((entry) => entry.id === event.target.value) ?? null
                  updateDraft(
                    draft
                      ? {
                          ...draft,
                          petId: pet?.id ?? null,
                          petName: pet?.name ?? null,
                          missingSlots: setMissingSlot(
                            draft.missingSlots,
                            'PET',
                            Boolean(pet),
                          ),
                        }
                      : draft,
                  )
                }}
                value={draft.petId ?? ''}
              >
                <option value="">Selecione</option>
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Horario">
              <input
                className="ui-input"
                onChange={(event) => {
                  const nextValue = event.target.value
                  updateDraft(
                    draft
                      ? {
                          ...draft,
                          missingSlots: setMissingSlot(
                            setMissingSlot(
                              draft.missingSlots,
                              'DATE',
                              Boolean(nextValue),
                            ),
                            'TIME',
                            Boolean(nextValue),
                          ),
                          startAt: nextValue ? new Date(nextValue) : null,
                        }
                      : draft,
                  )
                }}
                type="datetime-local"
                value={toDateTimeLocalValue(draft.startAt)}
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField
              description="Segure Ctrl para selecionar mais de um servico."
              label="Servicos"
            >
              <select
                className="ui-input min-h-28"
                multiple
              onChange={(event) => {
                const selectedIds = Array.from(event.target.selectedOptions).map(
                  (option) => option.value,
                )
                const selectedServices = services.filter((service) =>
                  selectedIds.includes(service.id),
                )
                updateDraft(
                  draft
                    ? {
                        ...draft,
                        missingSlots: setMissingSlot(
                          draft.missingSlots,
                          'SERVICE',
                          selectedServices.length > 0,
                        ),
                        serviceIds: selectedServices.map((service) => service.id),
                        serviceNames: selectedServices.map((service) => service.name),
                      }
                    : draft,
                )
              }}
              value={draft.serviceIds}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
              </select>
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Observacoes para o atendimento">
              <textarea
                className="ui-input min-h-24"
                onChange={(event) => {
                  updateDraft(
                    draft
                      ? {
                          ...draft,
                          clientNotes: event.target.value.trim() || null,
                        }
                      : draft,
                  )
                }}
                value={draft.clientNotes ?? ''}
              />
            </FormField>
          </div>

          {draft.missingSlots.length > 0 ? (
            <FeedbackMessage
              className="mt-4"
              description={`Ainda faltam ${draft.missingSlots.join(', ')} antes da confirmacao.`}
              title="Campos pendentes"
              tone="warning"
            />
          ) : (
            <FeedbackMessage
              className="mt-4"
              description="O assistente montou um rascunho completo. A criacao continua sujeita a validacao de disponibilidade e ownership no servidor."
              title="Pronto para confirmar"
              tone="success"
            />
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="ui-button-primary"
              disabled={isPending || draft.missingSlots.length > 0}
              onClick={() => {
                void confirmDraft()
              }}
              type="button"
            >
              {isPending ? 'Confirmando...' : 'Confirmar atendimento'}
            </button>
            <button
              className="ui-button-secondary"
              onClick={() => updateDraft(null)}
              type="button"
            >
              Limpar rascunho
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

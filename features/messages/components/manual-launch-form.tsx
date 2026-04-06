'use client'

import { useActionState, useEffect, useRef } from 'react'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { FormField } from '@/components/ui/form-field'
import { initialManualMessageLaunchState } from '@/features/messages/action-state'
import { launchManualMessageAction } from '@/features/messages/actions'

interface ManualLaunchTemplateOption {
  id: string
  name: string
}

interface ManualLaunchClientOption {
  id: string
  name: string
}

interface ManualLaunchAppointmentOption {
  id: string
  label: string
}

interface ManualLaunchFormProps {
  templates: ManualLaunchTemplateOption[]
  clients: ManualLaunchClientOption[]
  appointments: ManualLaunchAppointmentOption[]
}

export function ManualLaunchForm({
  templates,
  clients,
  appointments,
}: ManualLaunchFormProps) {
  const [state, formAction, isPending] = useActionState(
    launchManualMessageAction,
    initialManualMessageLaunchState,
  )
  const lastOpenedUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (state.status !== 'success' || !state.launchUrl || lastOpenedUrlRef.current === state.launchUrl) {
      return
    }

    lastOpenedUrlRef.current = state.launchUrl
    window.open(state.launchUrl, '_blank', 'noopener,noreferrer')
  }, [state])

  return (
    <form action={formAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
      <FormField label="Canal do envio">
        <select className="ui-input" defaultValue="WHATSAPP" name="channel">
          <option value="WHATSAPP">WhatsApp Web</option>
          <option value="EMAIL">E-mail</option>
        </select>
      </FormField>
      <FormField label="Template base">
        <select className="ui-input" name="templateId">
          <option value="">Sem template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </FormField>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Tutor">
          <select className="ui-input" name="clientId">
            <option value="">Opcional</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Agendamento">
          <select className="ui-input" name="appointmentId">
            <option value="">Opcional</option>
            {appointments.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField
        label="Mensagem"
        description="Se o campo ficar vazio e houver um template selecionado, o servidor renderiza as variaveis e abre o canal manual."
      >
        <textarea className="ui-input min-h-28" name="messageContent" />
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Preparando envio...' : 'Registrar e abrir canal'}
        </button>
        <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
          O PetOS registra o historico e abre o WhatsApp Web ou o cliente de e-mail sem automatizar disparos.
        </p>
      </div>

      {state.status === 'success' ? (
        <FeedbackMessage
          description={state.message ?? 'O canal manual foi preparado com sucesso.'}
          title="Canal pronto para envio"
          tone="success"
        />
      ) : null}

      {state.status === 'error' ? (
        <FeedbackMessage
          description={state.message ?? 'Nao foi possivel preparar a comunicacao manual.'}
          title="Falha ao preparar envio"
          tone="error"
        />
      ) : null}

      {state.status === 'success' && state.launchUrl ? (
        <a className="ui-link text-sm font-semibold" href={state.launchUrl} rel="noreferrer" target="_blank">
          Abrir o canal novamente
        </a>
      ) : null}
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { FormField } from '@/components/ui/form-field'
import {
  initialInstallerAccessState,
} from '@/features/installer/action-state'
import { startInstallerSessionAction } from '@/features/installer/actions'

export function InstallerAccessForm() {
  const [state, formAction, isPending] = useActionState(
    startInstallerSessionAction,
    initialInstallerAccessState,
  )

  return (
    <form action={formAction} className="surface-panel rounded-[1.75rem] p-6 space-y-5">
      <div className="space-y-2">
        <p className="section-label">Acesso ao setup</p>
        <h2 className="text-2xl font-semibold text-[color:var(--foreground)]">
          Liberar a sessao segura do instalador
        </h2>
        <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
          Informe o token de bootstrap configurado no ambiente. O PetOS so abre o wizard de
          setup quando esse token bate com o gating server-side do ambiente atual.
        </p>
      </div>

      <FormField
        label="Token de bootstrap"
        description="Use o token forte configurado em INSTALLER_BOOTSTRAP_TOKEN. Ele nao sera exibido novamente na interface."
      >
        <input
          className="ui-input"
          autoComplete="off"
          name="bootstrapToken"
          placeholder="Cole o token de bootstrap"
          type="password"
        />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Validando acesso...' : 'Abrir wizard'}
        </button>
        <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
          A sessao aberta aqui e temporaria e fica restrita ao fluxo de setup.
        </p>
      </div>

      {state.status === 'error' ? (
        <FeedbackMessage
          description={state.message ?? 'Nao foi possivel abrir a sessao do instalador.'}
          title="Acesso negado"
          tone="error"
        />
      ) : null}
    </form>
  )
}

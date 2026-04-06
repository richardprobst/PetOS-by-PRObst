'use client'

import { useActionState } from 'react'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { FormField } from '@/components/ui/form-field'
import {
  initialInstallerDraftValidationState,
  type InstallerDraftSummary,
} from '@/features/installer/action-state'
import { validateInstallerDraftAction } from '@/features/installer/actions'

interface InstallerSetupDraftFormProps {
  defaults: {
    adminEmail?: string
    adminName?: string
    companyName: string
    unitEmail?: string
    unitName: string
    unitPhone?: string
    unitTimezone: string
  }
}

function DraftSummary({ summary }: { summary: InstallerDraftSummary }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/70 p-5">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Resumo validado</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            <p>
              <strong className="text-[color:var(--foreground)]">Empresa:</strong>{' '}
              {summary.organization.companyName}
            </p>
            <p>
              <strong className="text-[color:var(--foreground)]">Unidade:</strong>{' '}
              {summary.organization.unitName}
            </p>
            <p>
              <strong className="text-[color:var(--foreground)]">Fuso:</strong>{' '}
              {summary.organization.unitTimezone}
            </p>
            {summary.organization.unitEmail ? (
              <p>
                <strong className="text-[color:var(--foreground)]">E-mail da unidade:</strong>{' '}
                {summary.organization.unitEmail}
              </p>
            ) : null}
            {summary.organization.unitPhone ? (
              <p>
                <strong className="text-[color:var(--foreground)]">Telefone da unidade:</strong>{' '}
                {summary.organization.unitPhone}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            <p>
              <strong className="text-[color:var(--foreground)]">Admin inicial:</strong>{' '}
              {summary.admin.name}
            </p>
            <p>
              <strong className="text-[color:var(--foreground)]">E-mail admin:</strong>{' '}
              {summary.admin.email}
            </p>
            <p>
              <strong className="text-[color:var(--foreground)]">APP_URL:</strong>{' '}
              {summary.environment.appUrl}
            </p>
            <p>
              <strong className="text-[color:var(--foreground)]">NEXTAUTH_URL:</strong>{' '}
              {summary.environment.nextAuthUrl}
            </p>
            <p>
              <strong className="text-[color:var(--foreground)]">Banco:</strong>{' '}
              {summary.environment.databaseHost}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/70 p-5">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">Ambiente e observacoes</p>
        <div className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
          <p>
            <strong className="text-[color:var(--foreground)]">Storage:</strong>{' '}
            {summary.environment.storageMode}
          </p>
          <p>
            <strong className="text-[color:var(--foreground)]">E-mail:</strong>{' '}
            {summary.environment.emailMode}
          </p>
        </div>

        {summary.warnings.length > 0 ? (
          <div className="mt-4 space-y-3">
            {summary.warnings.map((warning) => (
              <FeedbackMessage
                description={warning}
                key={warning}
                title="Ponto para revisar"
                tone="warning"
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function InstallerSetupDraftForm({ defaults }: InstallerSetupDraftFormProps) {
  const [state, formAction, isPending] = useActionState(
    validateInstallerDraftAction,
    initialInstallerDraftValidationState,
  )

  return (
    <div className="space-y-5">
      <form action={formAction} className="surface-panel rounded-[1.75rem] p-6 space-y-5">
        <div className="space-y-2">
          <p className="section-label">Draft do setup</p>
          <h2 className="text-2xl font-semibold text-[color:var(--foreground)]">
            Revisar configuracao inicial antes do finalize
          </h2>
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
            O servidor valida o draft inicial e, depois da revisao, pode concluir a instalacao com
            bootstrap base, admin inicial e lock definitivo do modo setup.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Empresa">
            <input className="ui-input" defaultValue={defaults.companyName} name="companyName" />
          </FormField>
          <FormField label="Unidade inicial">
            <input className="ui-input" defaultValue={defaults.unitName} name="unitName" />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Fuso horario">
            <input className="ui-input" defaultValue={defaults.unitTimezone} name="unitTimezone" />
          </FormField>
          <FormField label="E-mail da unidade" description="Opcional nesta fase do wizard.">
            <input className="ui-input" defaultValue={defaults.unitEmail} name="unitEmail" type="email" />
          </FormField>
          <FormField label="Telefone da unidade" description="Opcional nesta fase do wizard.">
            <input className="ui-input" defaultValue={defaults.unitPhone} name="unitPhone" />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Nome do admin inicial">
            <input className="ui-input" defaultValue={defaults.adminName} name="adminName" />
          </FormField>
          <FormField label="E-mail do admin inicial">
            <input className="ui-input" defaultValue={defaults.adminEmail} name="adminEmail" type="email" />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Senha do admin">
            <input className="ui-input" name="adminPassword" type="password" />
          </FormField>
          <FormField label="Confirmacao da senha">
            <input className="ui-input" name="adminPasswordConfirmation" type="password" />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            name="intent"
            type="submit"
            value="validate"
          >
            {isPending ? 'Validando draft...' : 'Validar configuracao inicial'}
          </button>
          {state.status === 'success' && state.summary ? (
            <button
              className="ui-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isPending}
              name="intent"
              type="submit"
              value="finalize"
            >
              {isPending ? 'Instalando ambiente...' : 'Executar instalacao inicial'}
            </button>
          ) : null}
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
            O draft so pode ser finalizado depois da validacao. A instalacao inicial trava o modo
            setup ao concluir.
          </p>
        </div>

        {state.status === 'error' ? (
          <FeedbackMessage
            description={state.message ?? 'Nao foi possivel validar o draft inicial.'}
            title="Falha ao validar setup"
            tone="error"
          />
        ) : null}

        {state.status === 'success' ? (
          <FeedbackMessage
            description={state.message ?? 'O draft do setup foi validado com sucesso.'}
            title="Draft validado"
            tone="success"
          />
        ) : null}
      </form>

      {state.status === 'success' && state.summary ? <DraftSummary summary={state.summary} /> : null}
    </div>
  )
}

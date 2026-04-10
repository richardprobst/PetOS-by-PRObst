import { DataTable } from '@/components/ui/data-table'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  canEditConfigurationFoundation,
  canReadConfigurationFoundation,
  getConfigurationFoundationSnapshot,
} from '@/features/configuration/services'
import { requireInternalAreaUser } from '@/server/authorization/guards'

export const dynamic = 'force-dynamic'

function getStorageTone(value: 'AVAILABLE' | 'MIGRATION_PENDING') {
  return value === 'AVAILABLE' ? 'success' : 'warning'
}

function getEntryTone(
  value: 'CONFIGURED' | 'ENV_LOCKED' | 'MIGRATION_PENDING' | 'MISSING',
) {
  switch (value) {
    case 'CONFIGURED':
      return 'success' as const
    case 'ENV_LOCKED':
      return 'info' as const
    case 'MIGRATION_PENDING':
      return 'warning' as const
    case 'MISSING':
      return 'danger' as const
  }
}

function getImpactTone(value: string) {
  switch (value) {
    case 'CRITICAL':
      return 'danger' as const
    case 'HIGH':
      return 'warning' as const
    case 'MODERATE':
      return 'info' as const
    case 'LOW':
      return 'neutral' as const
    default:
      return 'neutral' as const
  }
}

export default async function ConfigurationAdminPage() {
  const actor = await requireInternalAreaUser('/admin/configuracoes')
  const canRead = canReadConfigurationFoundation(actor)

  if (!canRead) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Configuracoes"
          title="Centro administrativo de configuracoes"
          description="A Fase 5 abre o modulo central de configuracoes e white label, mas o perfil atual ainda nao possui permissao para ler esta superficie."
        />
        <FeedbackMessage
          title="Acesso restrito"
          description="Para ler esta superficie, o perfil precisa de uma permissao de configuracao central ou de um papel administrativo alto equivalente."
          tone="warning"
        />
      </div>
    )
  }

  const snapshot = await getConfigurationFoundationSnapshot(actor)
  const canEdit = canEditConfigurationFoundation(actor)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuracoes"
        title="Fundacao central da Fase 5 para configuracoes, governanca e white label."
        description="Este primeiro corte abre a leitura consolidada do modulo, centralizando referencias de ambiente, settings por unidade e configuracao sistemica ainda sem editor completo."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="surface-panel rounded-[1.5rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
            Entradas mapeadas
          </p>
          <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
            {snapshot.summary.totalEntries}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            {snapshot.summary.configuredEntries} configuradas / {snapshot.summary.missingEntries} pendentes
          </p>
        </article>

        <article className="surface-panel rounded-[1.5rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
            Editaveis
          </p>
          <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
            {snapshot.summary.editableEntries}
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            edicao {canEdit ? 'habilitada para o perfil atual' : 'ainda bloqueada para o perfil atual'}
          </p>
        </article>

        <article className="surface-panel rounded-[1.5rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
            Storage sistemico
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone={getStorageTone(snapshot.storage.systemSettings)}>
              system settings {snapshot.storage.systemSettings}
            </StatusBadge>
            <StatusBadge tone={getStorageTone(snapshot.storage.configurationChanges)}>
              change log {snapshot.storage.configurationChanges}
            </StatusBadge>
          </div>
        </article>

        <article className="surface-panel rounded-[1.5rem] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
            Escopo atual
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone={snapshot.multiUnit.status === 'RESOLVED' ? 'success' : 'warning'}>
              {snapshot.multiUnit.status}
            </StatusBadge>
            {snapshot.multiUnit.contextType ? (
              <StatusBadge tone={snapshot.multiUnit.contextType === 'GLOBAL_AUTHORIZED' ? 'warning' : 'info'}>
                {snapshot.multiUnit.contextType}
              </StatusBadge>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            unidade diagnostica {snapshot.multiUnit.diagnosticUnitId ?? 'nao resolvida'}
          </p>
        </article>
      </div>

      <FeedbackMessage
        title="Fase 5 aberta em modo fundacional"
        description="Este modulo ja funciona como ponto unico de leitura administrativa. Segredos continuam fora da leitura comum, o backend segue como autoridade e o white label ainda nao foi publicado no runtime."
        tone="info"
      />

      <section className="surface-panel rounded-[1.75rem] p-6">
        <p className="section-label">Resumo por categoria</p>
        <DataTable
          className="mt-4"
          columns={[
            {
              id: 'category',
              header: 'Categoria',
              render: (row) => row.categoryLabel,
            },
            {
              id: 'coverage',
              header: 'Cobertura',
              render: (row) => (
                <span>
                  {row.configuredEntries}/{row.totalEntries}
                </span>
              ),
            },
            {
              id: 'editable',
              header: 'Editaveis',
              render: (row) => row.editableEntries,
            },
            {
              id: 'missing',
              header: 'Pendentes',
              render: (row) => row.missingEntries,
            },
            {
              id: 'critical',
              header: 'Criticas',
              render: (row) => row.criticalEntries,
            },
          ]}
          rows={snapshot.categories}
        />
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <p className="section-label">Resumo por escopo</p>
        <DataTable
          className="mt-4"
          columns={[
            {
              id: 'scope',
              header: 'Escopo',
              render: (row) => row.scopeLabel,
            },
            {
              id: 'coverage',
              header: 'Cobertura',
              render: (row) => (
                <span>
                  {row.configuredEntries}/{row.totalEntries}
                </span>
              ),
            },
            {
              id: 'editable',
              header: 'Editaveis',
              render: (row) => row.editableEntries,
            },
            {
              id: 'missing',
              header: 'Pendentes',
              render: (row) => row.missingEntries,
            },
          ]}
          rows={snapshot.scopes}
        />
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <p className="section-label">Entradas mapeadas na fundacao</p>
        <DataTable
          className="mt-4"
          columns={[
            {
              id: 'entry',
              header: 'Entrada',
              render: (row) => (
                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">{row.label}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                    {row.key}
                  </p>
                </div>
              ),
            },
            {
              id: 'scope',
              header: 'Escopo',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="info">{row.scopeLabel}</StatusBadge>
                  <StatusBadge tone="neutral">{row.categoryLabel}</StatusBadge>
                </div>
              ),
            },
            {
              id: 'source',
              header: 'Fonte',
              render: (row) => (
                <div className="space-y-2">
                  <StatusBadge tone={row.source === 'ENVIRONMENT' ? 'info' : 'success'}>
                    {row.source}
                  </StatusBadge>
                  <StatusBadge tone={getEntryTone(row.state)}>{row.state}</StatusBadge>
                </div>
              ),
            },
            {
              id: 'value',
              header: 'Valor atual',
              render: (row) => row.currentValue ?? 'nao configurado',
            },
          ]}
          rows={snapshot.entries}
        />
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <p className="section-label">Trilha recente de mudancas</p>
        {snapshot.recentChanges.length > 0 ? (
          <DataTable
            className="mt-4"
            columns={[
              {
                id: 'key',
                header: 'Entrada',
                render: (row) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{row.key}</p>
                    <p className="text-sm text-[color:var(--foreground-soft)]">
                      {row.summary ?? 'Sem resumo registrado'}
                    </p>
                  </div>
                ),
              },
              {
                id: 'scope',
                header: 'Escopo',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone="info">{row.scopeLabel}</StatusBadge>
                    <StatusBadge tone="neutral">{row.categoryLabel}</StatusBadge>
                  </div>
                ),
              },
              {
                id: 'impact',
                header: 'Impacto',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={getImpactTone(row.impactLevel)}>{row.impactLevel}</StatusBadge>
                    <StatusBadge tone="neutral">{row.changeType}</StatusBadge>
                  </div>
                ),
              },
              {
                id: 'changedAt',
                header: 'Data',
                render: (row) => row.changedAt.toLocaleString('pt-BR'),
              },
            ]}
            rows={snapshot.recentChanges}
          />
        ) : (
          <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
            Nenhuma mudanca de configuracao central foi registrada ainda. A trilha sera preenchida conforme os proximos blocos abrirem edicao, publish e rollback.
          </p>
        )}
      </section>
    </div>
  )
}

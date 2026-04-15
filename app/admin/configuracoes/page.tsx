import type { CSSProperties } from 'react'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  brandAssetRoleLabels,
  domainBindingStatusLabels,
  domainSurfaceLabels,
} from '@/features/branding/domain'
import { buildBrandCssVariables, getBrandBodyClassName } from '@/features/branding/services'
import {
  decideConfigurationApprovalAction,
  requestConfigurationPublishAction,
  rollbackConfigurationPublishAction,
  rotateIntegrationSecretAction,
  saveAiAdministrativeConfigurationAction,
  saveBrandAssetAction,
  saveDomainBindingAction,
  saveGeneralConfigurationAction,
  saveIntegrationConnectionAction,
  saveTenantBrandingAction,
  saveUnitBrandingAction,
  saveUnitConfigurationAction,
  testIntegrationConnectionAction,
} from '@/features/configuration/actions'
import { getConfigurationCenterSnapshot } from '@/features/configuration/management'
import {
  canReadConfigurationFoundation,
  type ConfigurationFoundationEntrySnapshot,
} from '@/features/configuration/services'
import {
  assistantExperienceModeLabels,
  assistantExperienceModes,
} from '@/features/configuration/domain'
import {
  integrationCatalog,
  integrationConnectionStatusLabels,
  integrationProviderKeys,
} from '@/features/integrations-admin/domain'
import { formatDateTime } from '@/lib/formatters'
import { requireInternalAreaUser } from '@/server/authorization/guards'

export const dynamic = 'force-dynamic'

interface ConfigurationAdminPageProps {
  searchParams: Promise<{
    message?: string
    status?: string
    unitId?: string
  }>
}

const integrationStatusOptions = ['CONFIGURED', 'READY', 'DISABLED', 'ERROR'] as const

function getStorageTone(value: 'AVAILABLE' | 'MIGRATION_PENDING') {
  return value === 'AVAILABLE' ? 'success' : 'warning'
}

function getStorageStatusLabel(value: 'AVAILABLE' | 'MIGRATION_PENDING') {
  return value === 'AVAILABLE' ? 'pronto' : 'migration pendente'
}

function getEntryValue(entries: ConfigurationFoundationEntrySnapshot[], key: string) {
  return entries.find((entry) => entry.key === key)?.currentValue ?? ''
}

function getDriftTone(value: 'ALIGNED' | 'DRIFTED' | 'ENV_DISABLED') {
  return value === 'ALIGNED' ? 'success' : value === 'ENV_DISABLED' ? 'warning' : 'danger'
}

function getHealthTone(value: string) {
  switch (value) {
    case 'READY':
      return 'success' as const
    case 'PENDING_VALIDATION':
    case 'WARNING':
      return 'warning' as const
    case 'NOT_CONFIGURED':
      return 'neutral' as const
    default:
      return 'danger' as const
  }
}

function prettifyJson(value: unknown) {
  if (!value) {
    return ''
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

export default async function ConfigurationAdminPage({
  searchParams,
}: ConfigurationAdminPageProps) {
  const actor = await requireInternalAreaUser('/admin/configuracoes')
  const params = await searchParams

  if (!canReadConfigurationFoundation(actor)) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Configuracoes"
          title="Centro administrativo de configuracoes"
          description="Esta superficie centraliza parametros operacionais, integracoes e white label, mas o perfil atual nao possui permissao para leitura."
        />
        <FeedbackMessage
          title="Acesso restrito"
          description="Solicite permissao de configuracao central para abrir esta area."
          tone="warning"
        />
      </div>
    )
  }

  const snapshot = await getConfigurationCenterSnapshot(actor, params.unitId ?? null)
  const selectedUnitId = snapshot.selectedUnit.id ?? snapshot.unitOptions[0]?.id ?? null
  const selectedUnitName = snapshot.selectedUnit.name ?? 'Sem unidade selecionada'
  const liveRuntime = snapshot.branding.liveRuntime
  const unitBranding =
    selectedUnitId && snapshot.branding.serializableLiveState
      ? snapshot.branding.serializableLiveState.unitBrandings.find((entry) => entry.unitId === selectedUnitId) ?? null
      : null
  const unitThemeOverrides =
    unitBranding?.themeOverridesJson && typeof unitBranding.themeOverridesJson === 'object'
      ? (unitBranding.themeOverridesJson as Record<string, string | undefined>)
      : {}

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuracoes"
        title="Centro unificado de configuracoes, integracoes e white label."
        description="A Fase 5 fecha o modulo administrativo que concentra configuracoes gerais, ajustes por unidade, administracao da IA, segredos operacionais, branding e publicacao governada."
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Resumo da fase</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone={snapshot.foundation.multiUnit.status === 'RESOLVED' ? 'success' : 'warning'}>
              {snapshot.foundation.multiUnit.statusLabel}
            </StatusBadge>
            <StatusBadge tone={getStorageTone(snapshot.foundation.storage.systemSettings)}>
              configuracao central {getStorageStatusLabel(snapshot.foundation.storage.systemSettings)}
            </StatusBadge>
            <StatusBadge tone={getStorageTone(snapshot.integrations.storage.secrets)}>
              segredos {getStorageStatusLabel(snapshot.integrations.storage.secrets)}
            </StatusBadge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">Entradas</p>
              <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                {snapshot.foundation.summary.totalEntries}
              </p>
            </article>
            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">Unidade</p>
              <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">{selectedUnitName}</p>
            </article>
            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">Drift</p>
              <p className="mt-3 text-lg font-semibold text-[color:var(--foreground)]">
                {snapshot.publishing.driftDetected ? 'Alteracoes pendentes' : 'Sem drift'}
              </p>
            </article>
          </div>
        </div>

        <form action="/admin/configuracoes" className="surface-panel rounded-[1.75rem] p-6" method="get">
          <p className="section-label">Contexto da unidade</p>
          <FormField label="Unidade ativa para ajustes locais">
            <select className="ui-input" defaultValue={selectedUnitId ?? ''} name="unitId">
              {snapshot.unitOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </FormField>
          <button className="ui-button-secondary mt-4" type="submit">
            Trocar contexto
          </button>
        </form>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6" id="geral">
        <p className="section-label">Configuracoes gerais</p>
        <form action={saveGeneralConfigurationAction} className="mt-6 space-y-4">
          <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Razao social">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.generalSettings, 'tenant.identity.company_name')} name="companyName" />
            </FormField>
            <FormField label="Nome publico">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.generalSettings, 'tenant.identity.public_name')} name="publicName" />
            </FormField>
            <FormField label="E-mail de suporte">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.generalSettings, 'tenant.contact.support_email')} name="supportEmail" type="email" />
            </FormField>
            <FormField label="Telefone de suporte">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.generalSettings, 'tenant.contact.support_phone')} name="supportPhone" />
            </FormField>
          </div>
          <button className="ui-button-primary" type="submit">Salvar configuracoes gerais</button>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]" id="unidades">
        <form action={saveUnitConfigurationAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
          <input name="unitId" type="hidden" value={selectedUnitId ?? ''} />
          <p className="section-label">Ajustes da unidade</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Cancelamento (h)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'agenda.cancelamento_antecedencia_horas')} name="cancellationWindowHours" type="number" />
            </FormField>
            <FormField label="Reagendamento (h)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'agenda.reagendamento_antecedencia_horas')} name="rescheduleWindowHours" type="number" />
            </FormField>
            <FormField label="No-show (min)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'agenda.tolerancia_no_show_minutos')} name="noShowToleranceMinutes" type="number" />
            </FormField>
            <FormField label="Pre-check-in (h)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'agenda.pre_check_in_antecedencia_horas')} name="preCheckInWindowHours" type="number" />
            </FormField>
            <FormField label="CRM inatividade (dias)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'crm.inatividade_dias_padrao')} name="crmInactivityDays" type="number" />
            </FormField>
            <FormField label="Deposito expira (min)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'financeiro.deposito_expiracao_minutos_padrao')} name="depositExpirationMinutes" type="number" />
            </FormField>
            <FormField label="Credito expira (dias)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'financeiro.credito_validade_dias_padrao')} name="clientCreditExpirationDays" type="number" />
            </FormField>
            <FormField label="Eventos integracao (dias)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'integracoes.eventos_retencao_dias')} name="integrationRetentionDays" type="number" />
            </FormField>
            <FormField label="Review booster (h)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'crm.review_booster_atraso_horas_padrao')} name="crmReviewDelayHours" type="number" />
            </FormField>
            <FormField label="Pos-servico CRM (h)">
              <input className="ui-input" defaultValue={getEntryValue(snapshot.unitSettings, 'crm.pos_servico_atraso_horas_padrao')} name="crmPostServiceDelayHours" type="number" />
            </FormField>
          </div>
          <button className="ui-button-primary" disabled={!selectedUnitId} type="submit">Salvar ajustes da unidade</button>
        </form>

        <form action={saveAiAdministrativeConfigurationAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4" id="ia">
          <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
          <p className="section-label">Administracao da IA</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.aiAdministrative.modules.map((module) => (
              <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4" key={module.key}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[color:var(--foreground)]">{module.label}</p>
                  <StatusBadge tone={getDriftTone(module.drift)}>{module.driftLabel}</StatusBadge>
                </div>
                <FormField label="Desejo administrativo">
                  <select className="ui-input" defaultValue={module.desiredEnabled === 'false' ? 'false' : 'true'} name={module.key === 'IMAGE_ANALYSIS' ? 'imageAnalysisDesiredEnabled' : module.key === 'PREDICTIVE_INSIGHTS' ? 'predictiveDesiredEnabled' : 'assistantDesiredEnabled'}>
                    <option value="true">Habilitado</option>
                    <option value="false">Desabilitado</option>
                  </select>
                </FormField>
                <FormField label="Quota desejada">
                  <input className="ui-input" defaultValue={module.desiredQuota ?? ''} name={module.key === 'IMAGE_ANALYSIS' ? 'imageAnalysisDesiredQuota' : module.key === 'PREDICTIVE_INSIGHTS' ? 'predictiveDesiredQuota' : 'assistantDesiredQuota'} type="number" />
                </FormField>
              </article>
            ))}
          </div>
          <FormField label="Modo do assistente do tutor">
            <select className="ui-input" defaultValue={getEntryValue(snapshot.foundation.entries, 'portal.tutor.assistant_experience_mode')} name="assistantExperienceMode">
              {assistantExperienceModes.map((mode) => (
                <option key={mode} value={mode}>
                  {assistantExperienceModeLabels[mode]}
                </option>
              ))}
            </select>
          </FormField>
          <button className="ui-button-primary" type="submit">Salvar governanca da IA</button>
        </form>
      </section>

      <section className="space-y-6" id="integracoes">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Integracoes e segredos</p>
          <DataTable
            className="mt-4"
            columns={[
              {
                id: 'providerKey',
                header: 'Provider',
                render: (row) => (
                  <div>
                    <p className="font-medium text-[color:var(--foreground)]">{row.displayName}</p>
                    <p className="text-xs text-[color:var(--foreground-soft)]">{row.providerKey}</p>
                  </div>
                ),
              },
              { id: 'scope', header: 'Escopo', render: (row) => row.scopeSummary },
              {
                id: 'healthStatus',
                header: 'Saude',
                render: (row) => (
                  <StatusBadge tone={getHealthTone(row.healthStatus)}>
                    {row.healthStatusLabel}
                  </StatusBadge>
                ),
              },
              { id: 'status', header: 'Status', render: (row) => row.statusLabel },
              { id: 'lastTestedAt', header: 'Ultimo teste', render: (row) => (row.lastTestedAt ? formatDateTime(row.lastTestedAt) : 'nunca') },
            ]}
            rows={snapshot.integrations.connections}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form action={saveIntegrationConnectionAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
            <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
            <p className="section-label">Criar ou atualizar conexao</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Provider">
                <select className="ui-input" defaultValue="STRIPE" name="providerKey">
                  {integrationProviderKeys.map((providerKey) => <option key={providerKey} value={providerKey}>{integrationCatalog[providerKey].defaultDisplayName}</option>)}
                </select>
              </FormField>
              <FormField label="Connection ID existente">
                <select className="ui-input" defaultValue="" name="connectionId">
                  <option value="">Criar nova ou upsert por provider/escopo</option>
                  {snapshot.integrations.connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.displayName} - {connection.scopeSummary}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Escopo">
                <select className="ui-input" defaultValue={selectedUnitId ? 'UNIT' : 'SYSTEM_GLOBAL'} name="scope">
                  <option value="SYSTEM_GLOBAL">Global</option>
                  <option value="UNIT">Unidade</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select className="ui-input" defaultValue="CONFIGURED" name="status">
                  {integrationStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {integrationConnectionStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <input name="unitId" type="hidden" value={selectedUnitId ?? ''} />
            <FormField label="Nome exibido">
              <input className="ui-input" name="displayName" placeholder="Ex.: Stripe principal" />
            </FormField>
            <FormField label="Configuracao funcional em JSON">
              <textarea className="ui-input min-h-32 font-mono text-sm" name="config.baseUrl" placeholder='Preencha os campos "config.*" abaixo ou deixe em branco.' />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="config.publicKey"><input className="ui-input" name="config.publicKey" /></FormField>
              <FormField label="config.publishableKey"><input className="ui-input" name="config.publishableKey" /></FormField>
              <FormField label="config.issuerCode"><input className="ui-input" name="config.issuerCode" /></FormField>
              <FormField label="config.host"><input className="ui-input" name="config.host" /></FormField>
              <FormField label="config.port"><input className="ui-input" name="config.port" /></FormField>
              <FormField label="config.fromEmail"><input className="ui-input" name="config.fromEmail" /></FormField>
            </div>
            <button className="ui-button-primary" type="submit">Salvar conexao</button>
          </form>

          <div className="grid gap-6">
            <form action={rotateIntegrationSecretAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
              <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
              <p className="section-label">Rotacionar segredo</p>
              <FormField label="Conexao">
                <select className="ui-input" defaultValue="" name="connectionId">
                  <option value="">Selecione</option>
                  {snapshot.integrations.connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.displayName} - {connection.scopeSummary}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Chave do segredo">
                <input className="ui-input" name="secretKey" placeholder="Ex.: secretKey, webhookSecret, apiToken" />
              </FormField>
              <FormField label="Valor do segredo">
                <input className="ui-input" name="secretValue" type="password" />
              </FormField>
              <button className="ui-button-secondary" type="submit">Rotacionar segredo</button>
            </form>

            <form action={testIntegrationConnectionAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
              <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
              <p className="section-label">Testar conexao</p>
              <FormField label="Conexao">
                <select className="ui-input" defaultValue="" name="connectionId">
                  <option value="">Selecione</option>
                  {snapshot.integrations.connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.displayName} - {connection.scopeSummary}
                    </option>
                  ))}
                </select>
              </FormField>
              <button className="ui-button-secondary" type="submit">Executar teste</button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]" id="white-label">
        <div className={`${getBrandBodyClassName(liveRuntime)} surface-panel rounded-[1.75rem] p-6`} style={buildBrandCssVariables(liveRuntime) as CSSProperties}>
          <p className="section-label">Preview live do white label</p>
          <h3 className="mt-4 text-3xl font-semibold text-[color:var(--foreground)]">{liveRuntime.identity.publicName}</h3>
          <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">{liveRuntime.copy.publicTagline}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">Login</p>
              <p className="mt-2 font-semibold text-[color:var(--foreground)]">{liveRuntime.copy.loginHeadline}</p>
              <p className="mt-2 text-sm text-[color:var(--foreground-soft)]">{liveRuntime.copy.loginDescription}</p>
            </article>
            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">Tutor</p>
              <p className="mt-2 font-semibold text-[color:var(--foreground)]">{liveRuntime.copy.tutorHeadline}</p>
              <p className="mt-2 text-sm text-[color:var(--foreground-soft)]">{liveRuntime.copy.tutorDescription}</p>
            </article>
          </div>
        </div>

        <form action={saveTenantBrandingAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
          <p className="section-label">White label do tenant</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome publico"><input className="ui-input" defaultValue={liveRuntime.identity.publicName} name="publicName" /></FormField>
            <FormField label="Nome curto"><input className="ui-input" defaultValue={liveRuntime.identity.shortName} name="shortName" /></FormField>
            <FormField label="Nome juridico"><input className="ui-input" defaultValue={liveRuntime.identity.legalName} name="legalName" /></FormField>
            <FormField label="Dominio principal"><input className="ui-input" defaultValue={liveRuntime.identity.primaryDomain ?? ''} name="primaryDomain" /></FormField>
            <FormField label="Suporte e-mail"><input className="ui-input" defaultValue={liveRuntime.identity.supportEmail ?? ''} name="supportEmail" type="email" /></FormField>
            <FormField label="Suporte telefone"><input className="ui-input" defaultValue={liveRuntime.identity.supportPhone ?? ''} name="supportPhone" /></FormField>
          </div>
          <FormField label="Tagline"><textarea className="ui-input min-h-24" defaultValue={liveRuntime.copy.publicTagline} name="publicTagline" /></FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Headline login"><input className="ui-input" defaultValue={liveRuntime.copy.loginHeadline} name="loginHeadline" /></FormField>
            <FormField label="Headline tutor"><input className="ui-input" defaultValue={liveRuntime.copy.tutorHeadline} name="tutorHeadline" /></FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Primaria"><input className="ui-input" defaultValue={liveRuntime.theme.primaryColor} name="primaryColor" type="color" /></FormField>
            <FormField label="Secundaria"><input className="ui-input" defaultValue={liveRuntime.theme.secondaryColor} name="secondaryColor" type="color" /></FormField>
            <FormField label="Foreground"><input className="ui-input" defaultValue={liveRuntime.theme.foregroundColor} name="foregroundColor" type="color" /></FormField>
            <FormField label="Muted"><input className="ui-input" defaultValue={liveRuntime.theme.mutedColor} name="mutedColor" type="color" /></FormField>
            <FormField label="Background"><input className="ui-input" defaultValue={liveRuntime.theme.backgroundColor} name="backgroundColor" type="color" /></FormField>
            <FormField label="Background forte"><input className="ui-input" defaultValue={liveRuntime.theme.backgroundStrongColor} name="backgroundStrongColor" type="color" /></FormField>
            <FormField label="Surface"><input className="ui-input" defaultValue={liveRuntime.theme.surfaceColor} name="surfaceColor" type="color" /></FormField>
            <FormField label="Fonte">
              <select className="ui-input" defaultValue={liveRuntime.theme.fontPreset} name="fontPreset">
                <option value="MANROPE">Manrope</option>
                <option value="SYSTEM">System</option>
                <option value="SERIF">Serif</option>
                <option value="FRIENDLY">Friendly</option>
              </select>
            </FormField>
          </div>
          <input name="radiusScale" type="hidden" value={liveRuntime.theme.radiusScale} />
          <input name="loginDescription" type="hidden" value={liveRuntime.copy.loginDescription} />
          <input name="tutorDescription" type="hidden" value={liveRuntime.copy.tutorDescription} />
          <input name="reportCardHeaderText" type="hidden" value={liveRuntime.copy.reportCardHeaderText} />
          <input name="reportCardFooterText" type="hidden" value={liveRuntime.copy.reportCardFooterText} />
          <input name="emailSignatureName" type="hidden" value={liveRuntime.copy.emailSignatureName} />
          <input name="emailFooterText" type="hidden" value={liveRuntime.copy.emailFooterText} />
          <button className="ui-button-primary" type="submit">Salvar white label do tenant</button>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]" id="white-label-unidade">
        <form action={saveUnitBrandingAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
          <input name="unitId" type="hidden" value={selectedUnitId ?? ''} />
          <p className="section-label">Override de unidade</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome publico override"><input className="ui-input" defaultValue={unitBranding?.publicNameOverride ?? ''} name="publicNameOverride" /></FormField>
            <FormField label="Nome curto override"><input className="ui-input" defaultValue={unitBranding?.shortNameOverride ?? ''} name="shortNameOverride" /></FormField>
            <FormField label="Headline login override"><input className="ui-input" defaultValue={unitBranding?.loginHeadlineOverride ?? ''} name="loginHeadlineOverride" /></FormField>
            <FormField label="Headline tutor override"><input className="ui-input" defaultValue={unitBranding?.tutorHeadlineOverride ?? ''} name="tutorHeadlineOverride" /></FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Primaria override"><input className="ui-input" defaultValue={unitThemeOverrides.primaryColor ?? ''} name="primaryColorOverride" type="color" /></FormField>
            <FormField label="Secundaria override"><input className="ui-input" defaultValue={unitThemeOverrides.secondaryColor ?? ''} name="secondaryColorOverride" type="color" /></FormField>
            <FormField label="Background override"><input className="ui-input" defaultValue={unitThemeOverrides.backgroundColor ?? ''} name="backgroundColorOverride" type="color" /></FormField>
            <FormField label="Surface override"><input className="ui-input" defaultValue={unitThemeOverrides.surfaceColor ?? ''} name="surfaceColorOverride" type="color" /></FormField>
          </div>
          <input name="loginDescriptionOverride" type="hidden" value={unitBranding?.loginDescriptionOverride ?? ''} />
          <input name="tutorDescriptionOverride" type="hidden" value={unitBranding?.tutorDescriptionOverride ?? ''} />
          <input name="reportCardHeaderOverride" type="hidden" value={unitBranding?.reportCardHeaderOverride ?? ''} />
          <input name="reportCardFooterOverride" type="hidden" value={unitBranding?.reportCardFooterOverride ?? ''} />
          <input name="emailSignatureNameOverride" type="hidden" value={unitBranding?.emailSignatureNameOverride ?? ''} />
          <input name="emailFooterTextOverride" type="hidden" value={unitBranding?.emailFooterTextOverride ?? ''} />
          <input name="supportEmailOverride" type="hidden" value={unitBranding?.supportEmailOverride ?? ''} />
          <input name="supportPhoneOverride" type="hidden" value={unitBranding?.supportPhoneOverride ?? ''} />
          <button className="ui-button-primary" disabled={!selectedUnitId} type="submit">Salvar override da unidade</button>
        </form>

        <div className="space-y-6">
          <div className="surface-panel rounded-[1.75rem] p-6" id="assets">
            <p className="section-label">Assets de marca</p>
            <DataTable
              className="mt-4"
              columns={[
                { id: 'role', header: 'Papel', render: (row) => brandAssetRoleLabels[row.role] },
                { id: 'scope', header: 'Escopo', render: (row) => row.scopeSummary },
                { id: 'assetUrl', header: 'URL', render: (row) => row.assetUrl },
              ]}
              rows={snapshot.branding.serializableLiveState?.brandAssets ?? []}
            />
            <form action={saveBrandAssetAction} className="mt-6 space-y-4">
              <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
              <FormField label="Asset ID existente">
                <input className="ui-input" name="assetId" placeholder="Opcional para atualizar um asset existente" />
              </FormField>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Papel">
                  <select className="ui-input" defaultValue="LOGO_PRIMARY" name="role">
                    {(Object.keys(brandAssetRoleLabels) as Array<keyof typeof brandAssetRoleLabels>).map((role) => (
                      <option key={role} value={role}>{brandAssetRoleLabels[role]}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Escopo">
                  <select className="ui-input" defaultValue={selectedUnitId ? 'UNIT' : 'TENANT'} name="assetScope">
                    <option value="TENANT">Tenant</option>
                    <option value="UNIT">Unidade</option>
                  </select>
                </FormField>
              </div>
              <input name="unitId" type="hidden" value={selectedUnitId ?? ''} />
              <FormField label="URL do asset"><input className="ui-input" name="assetUrl" /></FormField>
              <FormField label="Rotulo"><input className="ui-input" name="label" /></FormField>
              <FormField label="Texto alternativo"><input className="ui-input" name="altText" /></FormField>
              <label className="flex items-center gap-3 text-sm text-[color:var(--foreground-soft)]"><input defaultChecked name="active" type="checkbox" />Ativo</label>
              <button className="ui-button-secondary" type="submit">Salvar asset</button>
            </form>
          </div>

          <div className="surface-panel rounded-[1.75rem] p-6" id="dominios">
            <p className="section-label">Dominios e bindings</p>
            <DataTable
              className="mt-4"
              columns={[
                { id: 'hostname', header: 'Hostname', render: (row) => row.hostname },
                { id: 'surface', header: 'Superficie', render: (row) => domainSurfaceLabels[row.surface] },
                { id: 'status', header: 'Status', render: (row) => domainBindingStatusLabels[row.status] },
                { id: 'scope', header: 'Escopo', render: (row) => row.scopeSummary },
              ]}
              rows={snapshot.branding.serializableLiveState?.domainBindings ?? []}
            />
            <form action={saveDomainBindingAction} className="mt-6 space-y-4">
              <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
              <FormField label="Binding ID existente"><input className="ui-input" name="domainBindingId" /></FormField>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Hostname"><input className="ui-input" name="hostname" /></FormField>
                <FormField label="Escopo">
                  <select className="ui-input" defaultValue={selectedUnitId ? 'UNIT' : 'TENANT'} name="domainScope">
                    <option value="TENANT">Tenant</option>
                    <option value="UNIT">Unidade</option>
                  </select>
                </FormField>
                <FormField label="Superficie">
                  <select className="ui-input" defaultValue="PUBLIC_SITE" name="surface">
                    {Object.entries(domainSurfaceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select className="ui-input" defaultValue="PENDING" name="status">
                    {Object.entries(domainBindingStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </FormField>
              </div>
              <input name="unitId" type="hidden" value={selectedUnitId ?? ''} />
              <FormField label="Notas"><input className="ui-input" name="notes" /></FormField>
              <label className="flex items-center gap-3 text-sm text-[color:var(--foreground-soft)]"><input name="isPrimary" type="checkbox" />Marcar como primario</label>
              <button className="ui-button-secondary" type="submit">Salvar binding</button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]" id="publicacao">
        <form action={requestConfigurationPublishAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
          <p className="section-label">Publicacao governada</p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={snapshot.publishing.driftDetected ? 'warning' : 'success'}>
              {snapshot.publishing.driftDetected ? 'alteracoes pendentes' : 'sem drift'}
            </StatusBadge>
            <StatusBadge tone={snapshot.publishing.approvalRequired ? 'warning' : 'info'}>
              {snapshot.publishing.approvalRequired ? 'aprovacao critica ativa' : 'aprovacao direta'}
            </StatusBadge>
          </div>
          <FormField label="Resumo da publicacao"><textarea className="ui-input min-h-24" name="summary" /></FormField>
          <button className="ui-button-primary" type="submit">Solicitar publicacao</button>
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Snapshot live atual</p>
          <pre className="mt-4 max-h-[28rem] overflow-auto rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--background-strong)] p-4 text-xs text-[color:var(--foreground-soft)]">
            {prettifyJson(snapshot.publishing.currentLiveSnapshot)}
          </pre>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="surface-panel rounded-[1.75rem] p-6" id="aprovacoes">
          <p className="section-label">Aprovacoes pendentes</p>
          <div className="mt-4 space-y-4">
            {snapshot.publishing.pendingApprovals.length > 0 ? snapshot.publishing.pendingApprovals.map((approval) => (
              <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/60 p-4" key={approval.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[color:var(--foreground)]">{approval.summary ?? 'Sem resumo'}</p>
                  <StatusBadge tone={approval.impactLevel === 'CRITICAL' ? 'danger' : 'warning'}>
                    {approval.impactLevelLabel}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm text-[color:var(--foreground-soft)]">{formatDateTime(approval.createdAt)}</p>
                <form action={decideConfigurationApprovalAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_180px]">
                  <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
                  <input name="approvalId" type="hidden" value={approval.id} />
                  <FormField label="Justificativa"><input className="ui-input" name="reason" /></FormField>
                  <div className="grid gap-2">
                    <button className="ui-button-secondary" name="decision" type="submit" value="APPROVED">Aprovar</button>
                    <button className="ui-button-secondary" name="decision" type="submit" value="REJECTED">Rejeitar</button>
                    <button className="ui-button-secondary" name="decision" type="submit" value="CANCELED">Cancelar</button>
                  </div>
                </form>
              </article>
            )) : <FeedbackMessage title="Nenhuma aprovacao pendente" description="Nao ha itens aguardando decisao neste momento." tone="success" />}
          </div>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6" id="historico-publicacao">
          <p className="section-label">Historico e rollback</p>
          <DataTable
            className="mt-4"
            columns={[
              { id: 'version', header: 'Versao', render: (row) => row.version },
              { id: 'summary', header: 'Resumo', render: (row) => row.summary ?? 'Sem resumo' },
              { id: 'createdAt', header: 'Criado em', render: (row) => formatDateTime(row.createdAt) },
            ]}
            rows={snapshot.publishing.publishHistory}
          />
          <form action={rollbackConfigurationPublishAction} className="mt-6 space-y-4">
            <input name="selectedUnitId" type="hidden" value={selectedUnitId ?? ''} />
            <FormField label="Versao a republicar">
              <select className="ui-input" defaultValue="" name="publishId">
                <option value="">Selecione</option>
                {snapshot.publishing.publishHistory.map((publish) => <option key={publish.id} value={publish.id}>Versao {publish.version}</option>)}
              </select>
            </FormField>
            <FormField label="Resumo do rollback"><input className="ui-input" name="summary" /></FormField>
            <button className="ui-button-secondary" type="submit">Publicar rollback</button>
          </form>
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <p className="section-label">Cobertura da fundacao</p>
        <DataTable
          className="mt-4"
          columns={[
            { id: 'category', header: 'Categoria', render: (row) => row.categoryLabel },
            { id: 'configuredEntries', header: 'Configuradas', render: (row) => `${row.configuredEntries}/${row.totalEntries}` },
            { id: 'editableEntries', header: 'Editaveis', render: (row) => row.editableEntries },
            { id: 'missingEntries', header: 'Pendentes', render: (row) => row.missingEntries },
          ]}
          rows={snapshot.foundation.categories}
        />
      </section>
    </div>
  )
}

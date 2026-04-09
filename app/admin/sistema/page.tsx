import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  canReadAiFoundationDiagnostics,
  getAiFoundationDiagnostics,
} from '@/features/ai/admin-diagnostics'
import { getMultiUnitFoundationDiagnostics } from '@/features/multiunit/admin-diagnostics'
import {
  enterMaintenanceModeAction,
  leaveMaintenanceModeAction,
  openRecoveryIncidentAction,
  resolveRecoveryIncidentAction,
} from '@/features/system-operations/actions'
import {
  getLifecycleLabel,
  getLifecycleTone,
} from '@/features/system-operations/domain'
import { getSystemOperationsOverview } from '@/features/system-operations/services'
import {
  retryUpdateExecutionAction,
  startUpdateExecutionAction,
} from '@/features/updater/actions'
import {
  getUpdateExecutionStatusTone,
  getUpdateRecoveryStateLabel,
  getUpdateRecoveryStateTone,
} from '@/features/updater/domain'
import { getUpdatePreflight } from '@/features/updater/services'
import { listUpdateExecutions } from '@/features/updater/services'
import { hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

export const dynamic = 'force-dynamic'

interface SystemPageProps {
  searchParams: Promise<{
    message?: string
    status?: string
  }>
}

function getRecoveryIncidentTone(status: string) {
  return status === 'RESOLVED' ? 'success' : 'danger'
}

function getPreflightFeedbackTone(status: 'blocking' | 'ok' | 'warning') {
  if (status === 'blocking') {
    return 'error' as const
  }

  if (status === 'warning') {
    return 'warning' as const
  }

  return 'success' as const
}

function getPreflightBadgeTone(status: 'blocking' | 'ok' | 'warning') {
  if (status === 'blocking') {
    return 'danger' as const
  }

  if (status === 'warning') {
    return 'warning' as const
  }

  return 'success' as const
}

function getUpdateExecutionStepTone(
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED',
) {
  switch (status) {
    case 'COMPLETED':
      return 'success' as const
    case 'FAILED':
      return 'danger' as const
    case 'RUNNING':
      return 'info' as const
    case 'SKIPPED':
      return 'warning' as const
    case 'PENDING':
      return 'neutral' as const
  }
}

function getAiDiagnosticTone(value: string | null | undefined) {
  switch (value) {
    case 'ALLOWED':
    case 'ENABLED':
    case 'COMPLETED':
    case 'GRANTED':
    case 'LOCAL':
    case 'RESOLVED':
    case 'AVAILABLE':
      return 'success' as const
    case 'DECLARED':
    case 'ESTIMATED':
    case 'GLOBAL_AUTHORIZED':
    case 'NOT_APPLICABLE':
    case 'QUEUED':
    case 'RUNNING':
      return 'info' as const
    case 'CRITICAL':
    case 'ERROR':
    case 'EXCEEDED':
    case 'FAILED':
    case 'BLOCKED':
    case 'DISABLED':
    case 'INCOMPATIBLE':
    case 'NOT_ELIGIBLE':
    case 'TEMPORARILY_UNAVAILABLE':
    case 'UNRESOLVED':
      return 'danger' as const
    case 'INVALID':
    case 'MISSING':
    case 'NOT_CONFIGURED':
    case 'NOT_EVALUATED':
    case 'WARNING':
      return 'warning' as const
    default:
      return 'neutral' as const
  }
}

export default async function SystemAdminPage({ searchParams }: SystemPageProps) {
  const actor = await requireInternalAreaUser('/admin/sistema')
  const params = await searchParams
  const canOperateMaintenance = hasPermission(actor, 'sistema.manutencao.operar')
  const canOperateRepair = hasPermission(actor, 'sistema.reparo.operar')
  const canOperateUpdate = hasPermission(actor, 'sistema.update.operar')
  const canReadFoundationDiagnostics = canReadAiFoundationDiagnostics(actor)
  const [overview, updatePreflight, updateExecutions, aiDiagnostics, multiUnitDiagnostics] =
    await Promise.all([
      getSystemOperationsOverview(actor),
      canOperateUpdate ? getUpdatePreflight(actor) : Promise.resolve(null),
      canOperateUpdate ? listUpdateExecutions(actor) : Promise.resolve([]),
      canReadFoundationDiagnostics
        ? Promise.resolve(getAiFoundationDiagnostics(actor))
        : Promise.resolve(null),
      canReadFoundationDiagnostics
        ? Promise.resolve(getMultiUnitFoundationDiagnostics(actor))
        : Promise.resolve(null),
    ])
  const openIncidents = overview.recoveryIncidents.filter((incident) => incident.status === 'OPEN')
  const latestUpdateExecution = updateExecutions[0] ?? null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sistema"
        title="Runtime, manutencao, repair e updater core do PetOS."
        description="Este painel cobre os blocos D, E, F e G da frente installer/updater: runtime controlado, preflight bloqueante, execucao auditavel do update e baseline operacional consolidada."
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Runtime atual</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge tone={getLifecycleTone(overview.runtime.lifecycleState)}>
              {getLifecycleLabel(overview.runtime.lifecycleState)}
            </StatusBadge>
            <StatusBadge tone="info">build {overview.runtime.buildVersion}</StatusBadge>
            <StatusBadge tone="info">
              instalado {overview.runtime.currentInstalledVersion ?? 'nao registrado'}
            </StatusBadge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                Lock do instalador
              </p>
              <p className="mt-3 text-sm text-[color:var(--foreground)]">
                {overview.runtime.installerLocked ? 'ativo' : 'livre'}
              </p>
            </article>
            <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                Ultima transicao
              </p>
              <p className="mt-3 text-sm text-[color:var(--foreground)]">
                {overview.runtime.lastTransitionAt
                  ? overview.runtime.lastTransitionAt.toLocaleString('pt-BR')
                  : 'Sem registro persistido'}
              </p>
            </article>
          </div>

          <div className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
            <p>
              <strong className="text-[color:var(--foreground)]">Motivo de manutencao:</strong>{' '}
              {overview.runtime.maintenanceReason ?? 'Nao informado'}
            </p>
            <p>
              <strong className="text-[color:var(--foreground)]">Versao anterior registrada:</strong>{' '}
              {overview.runtime.previousVersion ?? 'Nao registrada'}
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <FeedbackMessage
              description="Maintenance, repair, updater core e execucao controlada do update agora compartilham a mesma base de runtime, locks e auditoria."
              title="Base consolidada"
              tone="info"
            />
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <p className="section-label">Diagnostico minimo da Fase 3</p>
        {canReadFoundationDiagnostics && aiDiagnostics && multiUnitDiagnostics ? (
          <div className="mt-4 space-y-6">
            <FeedbackMessage
              description="Leitura administrativa minima, protegida e somente server-side da fundacao de IA e dos sinais essenciais de multiunidade. Esta superficie nao abre painel final nem operacao completa."
              title="Diagnostico interno protegido"
              tone="info"
            />

            <div className="grid gap-4 md:grid-cols-3">
              {aiDiagnostics.flags.map((flag) => (
                <article
                  className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4"
                  key={flag.flagKey}
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                    {flag.label}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone={getAiDiagnosticTone(flag.status)}>
                      {flag.status}
                    </StatusBadge>
                    <StatusBadge tone="info">
                      {flag.normalizedValue === null ? 'sem valor' : String(flag.normalizedValue)}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                    chave {flag.flagKey}
                    {flag.environmentKey ? ` / env ${flag.environmentKey}` : ''}
                  </p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
              <article className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                  Contexto multiunidade interno
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge tone={getAiDiagnosticTone(multiUnitDiagnostics.session.status)}>
                    {multiUnitDiagnostics.session.status}
                  </StatusBadge>
                  <StatusBadge
                    tone={getAiDiagnosticTone(multiUnitDiagnostics.session.contextType)}
                  >
                    {multiUnitDiagnostics.session.contextType ?? 'sem contexto'}
                  </StatusBadge>
                  <StatusBadge
                    tone={getAiDiagnosticTone(
                      multiUnitDiagnostics.access.failClosed ? 'UNRESOLVED' : 'RESOLVED',
                    )}
                  >
                    {multiUnitDiagnostics.access.failClosed ? 'fail-closed' : 'contexto valido'}
                  </StatusBadge>
                </div>
                <div className="mt-4 space-y-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                  <p>
                    unidade home{' '}
                    <strong className="text-[color:var(--foreground)]">
                      {multiUnitDiagnostics.session.homeUnitId ?? 'nao definida'}
                    </strong>
                  </p>
                  <p>
                    unidade ativa{' '}
                    <strong className="text-[color:var(--foreground)]">
                      {multiUnitDiagnostics.session.activeUnitId ?? 'nao resolvida'}
                    </strong>
                  </p>
                  <p>
                    origem {multiUnitDiagnostics.session.contextOrigin ?? 'nao definida'} /
                    requested {multiUnitDiagnostics.session.requestedUnitId ?? 'nenhuma'}
                  </p>
                  <p>
                    leitura global{' '}
                    {multiUnitDiagnostics.access.hasGlobalReadRole ? 'sim' : 'nao'} / escrita
                    global {multiUnitDiagnostics.access.hasGlobalWriteRole ? 'sim' : 'nao'}
                  </p>
                  <p>
                    escopo local resolvido{' '}
                    {multiUnitDiagnostics.access.hasResolvedLocalScope ? 'sim' : 'nao'}
                  </p>
                  <p>
                    cross-unit solicitado{' '}
                    {multiUnitDiagnostics.session.crossUnitRequested ? 'sim' : 'nao'} / acesso{' '}
                    {multiUnitDiagnostics.session.crossUnitAccess ? 'autorizado' : 'bloqueado'}
                  </p>
                  <p>
                    ownership base{' '}
                    <strong className="text-[color:var(--foreground)]">
                      {multiUnitDiagnostics.ownershipBase?.kind ?? 'indisponivel'}
                    </strong>
                    {' / '}primary{' '}
                    <strong className="text-[color:var(--foreground)]">
                      {multiUnitDiagnostics.ownershipBase?.primaryUnitId ?? 'nao resolvida'}
                    </strong>
                    {' / '}reassign audit{' '}
                    {multiUnitDiagnostics.ownershipBase?.reassignmentAuditRequired
                      ? 'obrigatorio'
                      : 'nao aplicavel'}
                  </p>
                </div>
              </article>

              <article className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                  Lifecycle de referencia
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge tone={getAiDiagnosticTone(aiDiagnostics.lifecycleReference.accepted.status)}>
                    admissao
                  </StatusBadge>
                  <StatusBadge tone={getAiDiagnosticTone(aiDiagnostics.lifecycleReference.queued.status)}>
                    fila logica
                  </StatusBadge>
                  <StatusBadge tone={getAiDiagnosticTone(aiDiagnostics.lifecycleReference.running.status)}>
                    execucao
                  </StatusBadge>
                  <StatusBadge tone={getAiDiagnosticTone(aiDiagnostics.lifecycleReference.completed.status)}>
                    conclusao
                  </StatusBadge>
                  <StatusBadge tone={getAiDiagnosticTone(aiDiagnostics.lifecycleReference.blocked.status)}>
                    bloqueio
                  </StatusBadge>
                  <StatusBadge tone={getAiDiagnosticTone(aiDiagnostics.lifecycleReference.failed.status)}>
                    falha
                  </StatusBadge>
                </div>
                <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
                  Esta sonda usa o mesmo envelope provider-neutral do backend para provar admissao,
                  fila, execucao, bloqueio, falha e conclusao sem provider real, fila externa ou
                  mutacao administrativa.
                </p>
              </article>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {multiUnitDiagnostics.probes.map((probe) => (
                <article
                  className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/45 p-4"
                  key={probe.key}
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                    {probe.label}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone={getAiDiagnosticTone(probe.allowed ? 'ALLOWED' : 'BLOCKED')}>
                      {probe.allowed ? 'ALLOWED' : 'BLOCKED'}
                    </StatusBadge>
                    <StatusBadge tone={getAiDiagnosticTone(probe.accessMode)}>
                      {probe.accessMode}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                    motivo{' '}
                    <strong className="text-[color:var(--foreground)]">{probe.reasonCode}</strong>
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                    unidade alvo {probe.requestedUnitId ?? 'sessao atual'} / ownership{' '}
                    {probe.ownershipKind ?? 'sem binding'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                    contexto {probe.contextStatus}
                    {probe.contextType ? ` / ${probe.contextType}` : ''}
                  </p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {aiDiagnostics.modules.map((moduleDiagnostic) => (
                <article
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 p-5"
                  key={moduleDiagnostic.module}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="info">{moduleDiagnostic.module}</StatusBadge>
                    <StatusBadge tone={getAiDiagnosticTone(moduleDiagnostic.current.status)}>
                      {moduleDiagnostic.current.status}
                    </StatusBadge>
                    <StatusBadge tone={getAiDiagnosticTone(moduleDiagnostic.current.policyReasonCode)}>
                      {moduleDiagnostic.current.policyReasonCode ?? 'sem policy'}
                    </StatusBadge>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                      <p>
                        gating {moduleDiagnostic.current.gateReasonCode ?? 'nao avaliado'} / quota{' '}
                        {moduleDiagnostic.current.moduleQuota?.status ?? 'nao avaliada'}
                      </p>
                      <p>
                        consentimento {moduleDiagnostic.current.consentDecisionStatus} / fallback{' '}
                        {moduleDiagnostic.current.fallbackStatus}
                      </p>
                      <p>
                        custo {moduleDiagnostic.current.costStatus} / operacional{' '}
                        {moduleDiagnostic.current.operationalStatus}
                      </p>
                      <p>
                        retention {moduleDiagnostic.current.retentionPolicyVersion} / fail-closed{' '}
                        {moduleDiagnostic.current.failClosed ? 'ativo' : 'invalido'}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                      <p>
                        prefixes{' '}
                        <strong className="text-[color:var(--foreground)]">
                          {moduleDiagnostic.contract.supportedInferenceKeyPrefixes.join(', ')}
                        </strong>
                      </p>
                      <p>
                        finalidades{' '}
                        <strong className="text-[color:var(--foreground)]">
                          {moduleDiagnostic.contract.supportedConsentPurposes.join(', ')}
                        </strong>
                      </p>
                      <p>
                        revisao humana{' '}
                        {moduleDiagnostic.contract.requiresHumanReview ? 'obrigatoria' : 'nao'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {moduleDiagnostic.current.events.map((event) => (
                      <StatusBadge
                        key={`${moduleDiagnostic.module}-${event.eventCode}`}
                        tone={getAiDiagnosticTone(event.severity)}
                      >
                        {event.eventCode}
                      </StatusBadge>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {aiDiagnostics.scenarios.map((scenario) => (
                <article
                  className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/45 p-4"
                  key={scenario.key}
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                    {scenario.label}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge tone={getAiDiagnosticTone(scenario.envelope.status)}>
                      {scenario.envelope.status}
                    </StatusBadge>
                    <StatusBadge tone={getAiDiagnosticTone(scenario.envelope.policyReasonCode)}>
                      {scenario.envelope.policyReasonCode ?? 'sem policy'}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                    {scenario.envelope.statusMessage ?? 'Sem mensagem resumida.'}
                  </p>
                  {scenario.envelope.events[0] ? (
                    <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                      evento {scenario.envelope.events[0].eventCode} / proximo passo{' '}
                      {scenario.envelope.events[0].nextStep}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
            O diagnostico minimo da fundacao exige uma permissao alta de sistema:
            <code> sistema.manutencao.operar</code>, <code> sistema.reparo.operar</code> ou{' '}
            <code>sistema.update.operar</code>.
          </p>
        )}
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <p className="section-label">Updater core</p>
        {canOperateUpdate && updatePreflight ? (
          <div className="mt-4 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                  Versao instalada
                </p>
                <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                  {updatePreflight.versions.currentInstalledVersion ?? 'nao registrada'}
                </p>
                <p className="mt-2 text-xs text-[color:var(--foreground-soft)]">
                  fonte {updatePreflight.versions.currentVersionSource}
                </p>
              </article>
              <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                  Build alvo
                </p>
                <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                  {updatePreflight.versions.buildVersion}
                </p>
                <p className="mt-2 text-xs text-[color:var(--foreground-soft)]">
                  manifest {updatePreflight.versions.manifestVersion ?? 'invalido'}
                </p>
              </article>
              <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                  Status do preflight
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge tone={getPreflightBadgeTone(updatePreflight.status)}>
                    {updatePreflight.status}
                  </StatusBadge>
                  <StatusBadge tone="info">
                    {updatePreflight.compatibility.updateType}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-[color:var(--foreground-soft)]">
                  {updatePreflight.compatibility.canProceedToExecution
                    ? 'A base do preflight esta pronta para um fluxo futuro de execucao.'
                    : 'Ainda existe gate ou nenhum update aplicavel neste runtime.'}
                </p>
              </article>
              <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                  Runtime de migration
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge
                    tone={
                      updatePreflight.runtimeCapabilities.canRunMigrateDeploy
                        ? 'success'
                        : 'danger'
                    }
                  >
                    {updatePreflight.runtimeCapabilities.canRunMigrateDeploy
                      ? 'disponivel'
                      : 'indisponivel'}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-xs text-[color:var(--foreground-soft)]">
                  {updatePreflight.runtimeCapabilities.reason ??
                    'O runtime atual consegue rodar prisma migrate deploy durante o update.'}
                </p>
              </article>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FeedbackMessage
                description={
                  updatePreflight.compatibility.requiresMaintenance
                    ? 'A release alvo exige uma janela explicita de manutencao antes da futura execucao.'
                    : 'A release alvo nao exige manutencao obrigatoria neste manifest.'
                }
                title="Gate de manutencao"
                tone={updatePreflight.compatibility.requiresMaintenance ? 'warning' : 'success'}
              />
              <FeedbackMessage
                description={
                  updatePreflight.compatibility.requiresBackup
                    ? 'A release alvo exige backup logico confirmado antes da futura execucao.'
                    : 'A release alvo nao exige backup adicional neste manifest.'
                }
                title="Gate de backup"
                tone={updatePreflight.compatibility.requiresBackup ? 'warning' : 'success'}
              />
            </div>

            <div className="space-y-3">
              {updatePreflight.gates.map((gate) => (
                <FeedbackMessage
                  description={gate.message}
                  key={gate.code}
                  title={gate.code}
                  tone={getPreflightFeedbackTone(gate.status)}
                />
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 p-5">
              {updatePreflight.compatibility.canProceedToExecution ? (
                <form action={startUpdateExecutionAction} className="space-y-4">
                  <FeedbackMessage
                    description="A engine do Bloco F vai revalidar o preflight, travar concorrencia, entrar em maintenance, aplicar migrations, tasks suportadas e validar o runtime final."
                    title="Execucao controlada"
                    tone="info"
                  />
                  {updatePreflight.compatibility.requiresBackup ? (
                    <label className="flex items-start gap-3 text-sm leading-6 text-[color:var(--foreground)]">
                      <input className="mt-1" name="backupConfirmed" type="checkbox" />
                      <span>
                        Confirmo que o backup logico exigido para esta release ja foi realizado.
                      </span>
                    </label>
                  ) : (
                    <input name="backupConfirmed" type="hidden" value="true" />
                  )}
                  <button className="ui-button-primary" type="submit">
                    Iniciar update controlado
                  </button>
                </form>
              ) : (
                <FeedbackMessage
                  description="A engine do update permanece bloqueada enquanto o preflight nao estiver compativel. Os gates acima sao a fonte de verdade para destravar a execucao."
                  title="Execucao ainda bloqueada"
                  tone={getPreflightFeedbackTone(updatePreflight.status)}
                />
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
            O preflight do updater exige a permissao <code>sistema.update.operar</code>.
          </p>
        )}
      </section>

      {canOperateUpdate ? (
        <section className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Execucoes do update</p>
          {latestUpdateExecution ? (
            <div className="mt-4 space-y-6">
              <div className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 p-5">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={getUpdateExecutionStatusTone(latestUpdateExecution.status)}>
                    {latestUpdateExecution.status}
                  </StatusBadge>
                  <StatusBadge tone={getUpdateRecoveryStateTone(latestUpdateExecution.recoveryState)}>
                    {getUpdateRecoveryStateLabel(latestUpdateExecution.recoveryState)}
                  </StatusBadge>
                  <StatusBadge tone="info">{latestUpdateExecution.mode}</StatusBadge>
                  <StatusBadge tone="info">
                    {latestUpdateExecution.sourceVersion} {'->'} {latestUpdateExecution.targetVersion}
                  </StatusBadge>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                      Iniciado em
                    </p>
                    <p className="mt-3 text-sm text-[color:var(--foreground)]">
                      {latestUpdateExecution.startedAt.toLocaleString('pt-BR')}
                    </p>
                  </article>
                  <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                      Ultimo passo com sucesso
                    </p>
                    <p className="mt-3 text-sm text-[color:var(--foreground)]">
                      {latestUpdateExecution.lastSuccessfulStepCode ?? 'Nenhum'}
                    </p>
                  </article>
                  <article className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                      Ultimo passo com falha
                    </p>
                    <p className="mt-3 text-sm text-[color:var(--foreground)]">
                      {latestUpdateExecution.lastFailedStepCode ?? 'Nenhum'}
                    </p>
                  </article>
                </div>

                {latestUpdateExecution.failureSummary ? (
                  <FeedbackMessage
                    description={latestUpdateExecution.failureSummary}
                    title="Falha resumida"
                    tone="error"
                  />
                ) : null}

                {latestUpdateExecution.canRetry ? (
                  <form action={retryUpdateExecutionAction} className="mt-4 space-y-4">
                    <input name="executionId" type="hidden" value={latestUpdateExecution.id} />
                    {latestUpdateExecution.requiresBackup ? (
                      <label className="flex items-start gap-3 text-sm leading-6 text-[color:var(--foreground)]">
                        <input className="mt-1" name="backupConfirmed" type="checkbox" />
                        <span>
                          Confirmo novamente o backup logico antes da retentativa.
                        </span>
                      </label>
                    ) : (
                      <input name="backupConfirmed" type="hidden" value="true" />
                    )}
                    <button className="ui-button-secondary" type="submit">
                      Retentar execucao segura
                    </button>
                  </form>
                ) : null}
              </div>

              <div className="space-y-3">
                {latestUpdateExecution.steps.map((step) => (
                  <div
                    className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/50 p-4"
                    key={step.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={getUpdateExecutionStepTone(step.status)}>
                        {step.status}
                      </StatusBadge>
                      <StatusBadge tone="info">#{step.position}</StatusBadge>
                      <span className="text-sm font-semibold text-[color:var(--foreground)]">
                        {step.label}
                      </span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                      {step.code}
                    </p>
                    {step.errorSummary ? (
                      <p className="mt-3 text-sm leading-6 text-[color:var(--danger)]">
                        {step.errorSummary}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                      Inicio:{' '}
                      {step.startedAt ? step.startedAt.toLocaleString('pt-BR') : 'Nao iniciado'}
                      {' / '}Duracao:{' '}
                      {step.durationMs !== null ? `${step.durationMs} ms` : 'sem medicao'}
                    </p>
                  </div>
                ))}
              </div>

              {updateExecutions.length > 1 ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                    Historico recente
                  </p>
                  {updateExecutions.slice(1).map((execution) => (
                    <div
                      className="rounded-[1.25rem] border border-[color:var(--line)] bg-white/40 p-4"
                      key={execution.id}
                    >
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={getUpdateExecutionStatusTone(execution.status)}>
                          {execution.status}
                        </StatusBadge>
                        <StatusBadge tone="info">
                          {execution.sourceVersion} {'->'} {execution.targetVersion}
                        </StatusBadge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                        {execution.startedAt.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
              Nenhuma execucao de update foi registrada ainda neste runtime.
            </p>
          )}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Maintenance mode</p>
          {canOperateMaintenance ? (
            overview.runtime.lifecycleState === 'MAINTENANCE' ? (
              <div className="mt-4 space-y-4">
                <FeedbackMessage
                  description="O sistema esta em manutencao manual. Operadores com permissao de bypass continuam acessando a area administrativa; publico, tutor e APIs protegidas ficam retidos."
                  title="Manutencao ativa"
                  tone="warning"
                />
                <form action={leaveMaintenanceModeAction}>
                  <button className="ui-button-primary" type="submit">
                    Encerrar manutencao
                  </button>
                </form>
              </div>
            ) : (
              <form action={enterMaintenanceModeAction} className="mt-4 space-y-4">
                <FormField label="Motivo da manutencao">
                  <textarea
                    className="ui-input min-h-28"
                    name="reason"
                    placeholder="Ex.: janela controlada para validacao operacional ou reparo assistido."
                  />
                </FormField>
                <button className="ui-button-primary" type="submit">
                  Entrar em manutencao
                </button>
              </form>
            )
          ) : (
            <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
              O perfil atual pode visualizar o runtime, mas nao pode alterar o modo de manutencao.
            </p>
          )}
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <p className="section-label">Repair mode</p>
          {canOperateRepair ? (
            <div className="mt-4 space-y-6">
              <form action={openRecoveryIncidentAction} className="space-y-4">
                <FormField label="Titulo do incidente">
                  <input
                    className="ui-input"
                    name="title"
                    placeholder="Ex.: repair manual apos falha operacional"
                  />
                </FormField>
                <FormField label="Resumo">
                  <textarea
                    className="ui-input min-h-28"
                    name="summary"
                    placeholder="Descreva o problema, a causa percebida e o motivo para travar o runtime."
                  />
                </FormField>
                <button className="ui-button-secondary" type="submit">
                  Abrir incidente manual
                </button>
              </form>

              {openIncidents.map((incident) => (
                <form
                  action={resolveRecoveryIncidentAction}
                  className="rounded-[1.5rem] border border-[color:var(--line)] bg-white/55 p-4"
                  key={incident.id}
                >
                  <input name="incidentId" type="hidden" value={incident.id} />
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={getRecoveryIncidentTone(incident.status)}>
                      {incident.status}
                    </StatusBadge>
                    <StatusBadge tone="danger">
                      {getLifecycleLabel(incident.lifecycleState)}
                    </StatusBadge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[color:var(--foreground)]">
                    {incident.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
                    {incident.summary}
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FormField label="Destino do runtime">
                      <select className="ui-input" defaultValue="INSTALLED" name="targetLifecycleState">
                        <option value="INSTALLED">Voltar para INSTALLED</option>
                        {incident.lifecycleState === 'INSTALL_FAILED' ? (
                          <option value="NOT_INSTALLED">Voltar para NOT_INSTALLED</option>
                        ) : null}
                      </select>
                    </FormField>
                    <FormField label="Resolucao">
                      <textarea
                        className="ui-input min-h-28"
                        name="resolutionSummary"
                        placeholder="O que foi validado antes de retirar o runtime do repair."
                      />
                    </FormField>
                  </div>
                  {incident.lifecycleState !== 'INSTALL_FAILED' ? (
                    <p className="mt-3 text-xs leading-5 text-[color:var(--foreground-soft)]">
                      Este incidente so pode voltar para <strong>INSTALLED</strong>. O destino
                      <strong> NOT_INSTALLED</strong> fica restrito a falhas de instalacao inicial.
                    </p>
                  ) : null}
                  <button className="ui-button-primary mt-4" type="submit">
                    Resolver incidente
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
              O perfil atual nao pode abrir nem resolver incidentes de repair.
            </p>
          )}
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <p className="section-label">Incidentes de repair</p>
        <DataTable
          className="mt-4"
          columns={[
            {
              id: 'title',
              header: 'Incidente',
              render: (incident) => (
                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">{incident.title}</p>
                  <p>{incident.summary}</p>
                </div>
              ),
            },
            {
              id: 'status',
              header: 'Status',
              render: (incident) => (
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={getRecoveryIncidentTone(incident.status)}>
                    {incident.status}
                  </StatusBadge>
                  <StatusBadge tone="danger">
                    {getLifecycleLabel(incident.lifecycleState)}
                  </StatusBadge>
                </div>
              ),
            },
            {
              id: 'openedAt',
              header: 'Aberto em',
              render: (incident) => incident.openedAt.toLocaleString('pt-BR'),
            },
          ]}
          rows={overview.recoveryIncidents}
        />
      </section>
    </div>
  )
}

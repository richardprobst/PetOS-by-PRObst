import { FeedbackMessage } from '@/components/ui/feedback-message'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { InstallerAccessForm } from '@/features/installer/components/installer-access-form'
import { InstallerSetupDraftForm } from '@/features/installer/components/installer-setup-draft-form'
import { endInstallerSessionAction } from '@/features/installer/actions'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { collectInstallerPreflightSnapshot } from '@/server/readiness/installer'
import { getInstallerSessionSnapshot } from '@/server/system/installer-session'
import { collectSystemRuntimeSnapshot } from '@/server/system/runtime-state'

export const dynamic = 'force-dynamic'

function resolveLifecycleTone(state: string) {
  switch (state) {
    case 'INSTALLED':
      return 'success'
    case 'NOT_INSTALLED':
      return 'warning'
    case 'INSTALLING':
      return 'warning'
    case 'INSTALL_FAILED':
    case 'MAINTENANCE':
    case 'UPDATING':
    case 'REPAIR':
      return 'danger'
    default:
      return 'neutral'
  }
}

export default async function SetupPage() {
  const environment = getEnv()
  const runtime = await collectSystemRuntimeSnapshot(prisma, environment)
  const installerSession = await getInstallerSessionSnapshot(environment)
  const preflight = installerSession.active
    ? await collectInstallerPreflightSnapshot(prisma, environment)
    : null

  const installerBlockedByLifecycle =
    runtime.lifecycleState !== 'NOT_INSTALLED' && runtime.lifecycleState !== 'UNKNOWN'

  return (
    <main className="pb-16 pt-10 md:pb-24 md:pt-16">
      <section className="app-shell space-y-8">
        <PageHeader
          eyebrow="Installer"
          title="Setup guiado do PetOS para ambientes novos"
          description="Esta tela abre apenas o recorte assistido de setup inicial. O ambiente continua protegido por flag, token de bootstrap, preflight server-side e estado explicito de ciclo de vida."
          actions={
            installerSession.active ? (
              <form action={endInstallerSessionAction}>
                <button className="ui-button-secondary" type="submit">
                  Encerrar sessao do setup
                </button>
              </form>
            ) : null
          }
        />

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <aside className="space-y-6">
            <div className="surface-panel rounded-[2rem] p-6 md:p-8">
              <p className="section-label">Runtime</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <StatusBadge tone={resolveLifecycleTone(runtime.lifecycleState)}>
                  {runtime.lifecycleState}
                </StatusBadge>
                <StatusBadge tone={runtime.installerEnabled ? 'warning' : 'neutral'}>
                  {runtime.installerEnabled ? 'installer habilitado' : 'installer desligado'}
                </StatusBadge>
                <StatusBadge tone={runtime.installerLocked ? 'danger' : 'success'}>
                  {runtime.installerLocked ? 'lock ativo' : 'lock livre'}
                </StatusBadge>
                <StatusBadge tone={installerSession.active ? 'success' : 'neutral'}>
                  {installerSession.active ? 'sessao do setup ativa' : 'sem sessao do setup'}
                </StatusBadge>
              </div>

              <div className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                <p>
                  <strong className="text-[color:var(--foreground)]">APP_URL:</strong>{' '}
                  {environment.APP_URL}
                </p>
                <p>
                  <strong className="text-[color:var(--foreground)]">NEXTAUTH_URL:</strong>{' '}
                  {environment.NEXTAUTH_URL}
                </p>
                <p>
                  <strong className="text-[color:var(--foreground)]">Versao do build:</strong>{' '}
                  {runtime.buildVersion}
                </p>
                <p>
                  <strong className="text-[color:var(--foreground)]">Versao instalada:</strong>{' '}
                  {runtime.currentInstalledVersion ?? 'ainda nao registrada'}
                </p>
              </div>
            </div>

            {preflight ? (
              <div className="surface-panel rounded-[2rem] p-6 md:p-8">
                <p className="section-label">Diagnostico do setup</p>
                <div className="mt-5 space-y-3">
                  {preflight.checks.map((check) => (
                    <FeedbackMessage
                      description={check.message}
                      key={`${check.name}-${check.message}`}
                      title={`${check.name} - ${check.status}`}
                      tone={
                        check.status === 'fail'
                          ? 'error'
                          : check.status === 'warn'
                            ? 'warning'
                            : 'success'
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <div className="space-y-6">
            {!environment.INSTALLER_ENABLED ? (
              <FeedbackMessage
                description="O modo instalador continua desabilitado neste ambiente. Habilite INSTALLER_ENABLED e configure um INSTALLER_BOOTSTRAP_TOKEN forte apenas quando o bootstrap guiado for realmente necessario."
                title="Installer desligado"
                tone="warning"
              />
            ) : !installerSession.active ? (
              <InstallerAccessForm />
            ) : runtime.lifecycleState === 'INSTALL_FAILED' ? (
              <FeedbackMessage
                description="A ultima tentativa de instalacao falhou e o runtime ficou marcado como INSTALL_FAILED. O repair mode ja esta disponivel no painel do sistema; revise auditoria, ambiente e banco antes de tentar qualquer recuperacao controlada."
                title="Setup em estado de falha controlada"
                tone="error"
              />
            ) : installerBlockedByLifecycle ? (
              <FeedbackMessage
                description={`O ciclo de vida atual do sistema esta em ${runtime.lifecycleState}. O setup inicial nao deve rodar novamente nesse ambiente. A frente installer/updater ja segue por repair ou update, nunca por reinstalacao silenciosa.`}
                title="Setup inicial bloqueado"
                tone="error"
              />
            ) : preflight && !preflight.canProceed ? (
              <FeedbackMessage
                description="O preflight do instalador ainda encontrou bloqueios. Corrija os itens destacados na coluna lateral antes de revisar o draft inicial."
                title="Ambiente ainda nao pronto para o wizard"
                tone="warning"
              />
            ) : (
              <InstallerSetupDraftForm
                defaults={{
                  adminEmail: process.env.ADMIN_SEED_EMAIL?.trim() || '',
                  adminName: process.env.ADMIN_SEED_NAME?.trim() || 'Administrador PetOS',
                  companyName: 'PetOS',
                  unitEmail: '',
                  unitName: 'Unidade Principal',
                  unitPhone: '',
                  unitTimezone: process.env.DEFAULT_TIMEZONE ?? 'America/Sao_Paulo',
                }}
              />
            )}

            <div className="surface-panel rounded-[2rem] p-6 md:p-8">
              <p className="section-label">Escopo deste bloco</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                <p>
                  Este wizard agora fecha o setup inicial do ambiente: revisa o draft, executa o
                  bootstrap base, cria o admin inicial e persiste o lock do modo instalacao.
                </p>
                <p>
                  Maintenance mode, repair mode e updater controlado ja reutilizam essa mesma base
                  de locks, auditoria e lifecycle. Esta tela continua restrita ao bootstrap inicial
                  de ambientes novos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

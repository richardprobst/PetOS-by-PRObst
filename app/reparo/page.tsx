import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { getCurrentAuthUser } from '@/server/auth/session'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { canBypassRuntimeLock } from '@/server/system/access'
import { isRepairLifecycleState } from '@/server/system/lifecycle'
import { collectSystemRuntimeSnapshot } from '@/server/system/runtime-state'

export const dynamic = 'force-dynamic'

export default async function RepairPage() {
  const runtime = await collectSystemRuntimeSnapshot(prisma, getEnv())

  if (!isRepairLifecycleState(runtime.lifecycleState)) {
    redirect('/')
  }

  const [user, latestIncident] = await Promise.all([
    getCurrentAuthUser(),
    prisma.recoveryIncident.findFirst({
      orderBy: {
        openedAt: 'desc',
      },
      where: {
        status: 'OPEN',
      },
    }),
  ])
  const canOperate = canBypassRuntimeLock(user)

  return (
    <main className="pb-16 pt-10 md:pb-24 md:pt-16">
      <section className="app-shell max-w-4xl space-y-8">
        <PageHeader
          eyebrow="Repair"
          title="O PetOS entrou em repair mode."
          description="O sistema detectou uma falha controlada de instalacao ou update e bloqueou o trafego normal ate um operador autorizado validar a recuperacao."
          actions={
            canOperate ? (
              <Link className="ui-button-primary" href="/admin/sistema">
                Abrir painel do sistema
              </Link>
            ) : undefined
          }
        />

        <div className="surface-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="danger">{runtime.lifecycleState}</StatusBadge>
            <StatusBadge tone="info">
              build {runtime.buildVersion}
            </StatusBadge>
            <StatusBadge tone="info">
              instalado {runtime.currentInstalledVersion ?? 'nao registrado'}
            </StatusBadge>
          </div>

          <div className="mt-6 space-y-4">
            <FeedbackMessage
              description={
                latestIncident?.summary ??
                'Nao foi possivel confirmar uma operacao critica. O runtime permanece retido para evitar corrupcao parcial e acesso inconsistente.'
              }
              title={latestIncident?.title ?? 'Incidente de recovery em aberto'}
              tone="error"
            />
            <FeedbackMessage
              description="Somente operadores com permissao de repair podem retirar o sistema deste estado. O fluxo passa por auditoria, readiness e definicao explicita do proximo lifecycle."
              title="Saida segura"
              tone="info"
            />
          </div>
        </div>
      </section>
    </main>
  )
}

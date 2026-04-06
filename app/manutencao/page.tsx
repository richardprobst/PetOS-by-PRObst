import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { getCurrentAuthUser } from '@/server/auth/session'
import { prisma } from '@/server/db/prisma'
import { getEnv } from '@/server/env'
import { canBypassRuntimeLock } from '@/server/system/access'
import { isMaintenanceLifecycleState } from '@/server/system/lifecycle'
import { collectSystemRuntimeSnapshot } from '@/server/system/runtime-state'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const runtime = await collectSystemRuntimeSnapshot(prisma, getEnv())

  if (!isMaintenanceLifecycleState(runtime.lifecycleState)) {
    redirect('/')
  }

  const user = await getCurrentAuthUser()
  const canOperate = canBypassRuntimeLock(user)

  return (
    <main className="pb-16 pt-10 md:pb-24 md:pt-16">
      <section className="app-shell max-w-4xl space-y-8">
        <PageHeader
          eyebrow="Maintenance"
          title="O PetOS esta em manutencao controlada."
          description="Publico, tutor e APIs protegidas ficam temporariamente retidos enquanto operadores autorizados concluem uma janela tecnica segura."
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
            <StatusBadge tone="warning">{runtime.lifecycleState}</StatusBadge>
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
                runtime.maintenanceReason ??
                'A equipe abriu uma janela controlada para manutencao, update ou validacao operacional.'
              }
              title="Motivo informado"
              tone="warning"
            />
            <FeedbackMessage
              description="Assim que a janela terminar, o acesso normal volta automaticamente sem precisar reinstalar nem reconfigurar nada."
              title="O que acontece agora"
              tone="info"
            />
          </div>
        </div>
      </section>
    </main>
  )
}

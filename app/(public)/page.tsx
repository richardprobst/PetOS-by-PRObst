import Link from 'next/link'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'

const deliveredAreas = [
  'Shell publico com entrada para areas protegidas do MVP',
  'Area administrativa com fluxos reais de cadastros, agenda, financeiro e comunicacao',
  'Portal do tutor com perfil, pets, historico, notificacoes basicas e instalabilidade inicial',
]

const currentLimits = [
  'Gateways de pagamento e webhooks seguem fora da implementacao atual.',
  'Itens de Fase 2 e Fase 3 continuam explicitamente fora do escopo.',
  'O portal do tutor continua basico e nao inclui recursos avancados de Fase 2.',
]

export default function PublicHomePage() {
  return (
    <main className="pb-16 pt-10 md:pb-24 md:pt-16">
      <section className="app-shell grid gap-10 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
        <div className="space-y-8">
          <PageHeader
            eyebrow="MVP"
            title="Base operacional do PetOS implementada para cadastro, agenda, atendimento, financeiro basico e portal do tutor."
            description="A entrada publica agora aponta para fluxos reais do MVP. O sistema ja usa autenticacao server-side, validacao com Zod, Prisma, auditoria base e rotas administrativas e do tutor."
            actions={
              <>
                <Link className="ui-button-primary" href="/admin">
                  Abrir area admin
                </Link>
                <Link className="ui-button-secondary" href="/tutor">
                  Abrir portal do tutor
                </Link>
              </>
            }
          />

          <div className="grid gap-5 sm:grid-cols-3">
            {deliveredAreas.map((step, index) => (
              <div className="border-t border-[color:var(--line)] pt-4" key={step}>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]">
                  0{index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--foreground)]">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="surface-panel rounded-[2rem] p-6 md:p-8">
          <p className="section-label">Estado atual</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StatusBadge tone="success">MVP implementado</StatusBadge>
            <StatusBadge tone="info">Build validado</StatusBadge>
            <StatusBadge tone="success">PWA basico</StatusBadge>
            <StatusBadge tone="warning">Gateways pendentes</StatusBadge>
          </div>

          <FeedbackMessage
            className="mt-6"
            description="O nucleo do MVP esta funcional e a validacao final agora depende principalmente de checks, documentacao e estabilizacao do ambiente. Consulte docs/mvp-status.md para o status consolidado."
            title="Leitura recomendada"
            tone="info"
          />
        </aside>
      </section>

      <section className="app-shell mt-14 grid gap-6 md:mt-20 md:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel rounded-[2rem] p-6 md:p-8">
          <p className="section-label">Entregue no MVP</p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[color:var(--foreground-soft)]">
            <p>Cadastro de clientes, pets, servicos, equipe, agendamentos, comunicacao manual, financeiro e report cards.</p>
            <p>Autenticacao com `next-auth v4`, RBAC server-side, auditoria base, rate limiting inicial e validacao com Zod.</p>
            <p>Portal do tutor com perfil proprio, visualizacao de pets, historico, solicitacao basica de agendamento e instalabilidade inicial.</p>
          </div>
        </div>

        <div className="surface-panel rounded-[2rem] p-6 md:p-8">
          <p className="section-label">Ainda pendente</p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[color:var(--foreground-soft)]">
            {currentLimits.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

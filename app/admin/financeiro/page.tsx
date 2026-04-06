import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { listAppointments } from '@/features/appointments/services'
import { listFiscalDocuments } from '@/features/fiscal/services'
import { saveFinancialTransactionAction } from '@/features/finance/actions'
import {
  listClientCredits,
  listDeposits,
  listFinancialTransactions,
  listRefunds,
} from '@/features/finance/services'
import { formatCurrency, formatDateTime, toDateTimeLocalValue } from '@/lib/formatters'
import { assertPermission, hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface FinancialPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    edit?: string
  }>
}

export default async function FinancialPage({ searchParams }: FinancialPageProps) {
  const actor = await requireInternalAreaUser('/admin/financeiro')
  assertPermission(actor, 'financeiro.visualizar')
  const params = await searchParams
  const canOperateDeposits = hasPermission(actor, 'financeiro.deposito.operar')
  const canOperateRefunds = hasPermission(actor, 'financeiro.reembolso.operar')
  const canOperateCredits = hasPermission(actor, 'financeiro.credito.operar')
  const canViewFiscal = hasPermission(actor, 'financeiro.fiscal.visualizar')
  const [transactions, appointments, deposits, refunds, clientCredits, fiscalDocuments] =
    await Promise.all([
    listFinancialTransactions(actor, {}),
    listAppointments(actor, {}),
    canOperateDeposits ? listDeposits(actor, {}) : Promise.resolve([]),
    canOperateRefunds ? listRefunds(actor, {}) : Promise.resolve([]),
    canOperateCredits ? listClientCredits(actor, { includeExpired: false }) : Promise.resolve([]),
    canViewFiscal ? listFiscalDocuments(actor, {}) : Promise.resolve([]),
    ])
  const selectedTransaction = params.edit
    ? transactions.find((transaction) => transaction.id === params.edit)
    : undefined

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Financeiro"
        title="Receitas, despesas e vinculo financeiro com o atendimento."
        description="O Bloco 2 amplia a base do financeiro com depositos, reembolsos, creditos, no-show protection, integracoes auditaveis e documento fiscal minimo sem misturar pagamento autorizado com liquidacao real."
        actions={
          selectedTransaction ? (
            <Link className="ui-button-secondary" href="/admin/financeiro">
              Novo lancamento
            </Link>
          ) : null
        }
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form action={saveFinancialTransactionAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="transactionId" type="hidden" value={selectedTransaction?.id ?? ''} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Tipo">
              <select
                className="ui-input"
                defaultValue={selectedTransaction?.transactionType ?? 'REVENUE'}
                name="transactionType"
              >
                <option value="REVENUE">Receita</option>
                <option value="EXPENSE">Despesa</option>
                <option value="ADJUSTMENT">Ajuste</option>
              </select>
            </FormField>
            <FormField label="Status">
              <select
                className="ui-input"
                defaultValue={selectedTransaction?.paymentStatus ?? 'PENDING'}
                name="paymentStatus"
              >
                <option value="PENDING">Pendente</option>
                <option value="AUTHORIZED">Autorizado (ainda nao liquidado)</option>
                <option value="PARTIAL">Parcial</option>
                <option value="PAID">Pago</option>
                <option value="FAILED">Falhou</option>
                <option value="REFUNDED">Reembolsado</option>
                <option value="REVERSED">Estornado</option>
                <option value="VOIDED">Cancelado</option>
              </select>
            </FormField>
          </div>
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
            `Autorizado` indica aprovacao preliminar do meio de pagamento. Comissao e fechamento
            financeiro do atendimento continuam bloqueados ate o status `Pago`.
          </p>
          <FormField label="Descricao">
            <input className="ui-input" defaultValue={selectedTransaction?.description ?? ''} name="description" />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Valor">
              <input
                className="ui-input"
                defaultValue={selectedTransaction ? Number(selectedTransaction.amount) : ''}
                name="amount"
              />
            </FormField>
            <FormField label="Metodo">
              <select className="ui-input" defaultValue={selectedTransaction?.paymentMethod ?? ''} name="paymentMethod">
                <option value="">Nao informado</option>
                <option value="CASH">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CARD">Cartao</option>
                <option value="BOLETO">Boleto</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="OTHER">Outro</option>
              </select>
            </FormField>
          </div>
          <FormField label="Agendamento vinculado">
            <select className="ui-input" defaultValue={selectedTransaction?.appointmentId ?? ''} name="appointmentId">
              <option value="">Sem agendamento</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.pet.name} • {formatDateTime(appointment.startAt)}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Ocorrido em">
              <input
                className="ui-input"
                defaultValue={selectedTransaction ? toDateTimeLocalValue(selectedTransaction.occurredAt) : ''}
                name="occurredAt"
                type="datetime-local"
              />
            </FormField>
            <FormField label="Referencia externa">
              <input
                className="ui-input"
                defaultValue={selectedTransaction?.externalReference ?? ''}
                name="externalReference"
              />
            </FormField>
          </div>
          <button className="ui-button-primary" type="submit">
            {selectedTransaction ? 'Salvar lancamento' : 'Criar lancamento'}
          </button>
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <DataTable
            columns={[
              {
                id: 'description',
                header: 'Lancamento',
                render: (transaction) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{transaction.description}</p>
                    <p>{transaction.transactionType}</p>
                  </div>
                ),
              },
              {
                id: 'amount',
                header: 'Valor',
                render: (transaction) => formatCurrency(Number(transaction.amount)),
              },
              {
                id: 'status',
                header: 'Status',
                render: (transaction) => transaction.paymentStatus,
              },
              {
                id: 'appointment',
                header: 'Atendimento',
                render: (transaction) =>
                  transaction.appointment
                    ? `${transaction.appointment.pet.name} • ${formatDateTime(transaction.appointment.startAt)}`
                    : 'Sem vinculo',
              },
              {
                id: 'action',
                header: 'Acao',
                render: (transaction) => (
                  <Link
                    className="ui-link text-sm font-semibold"
                    href={{ pathname: '/admin/financeiro', query: { edit: transaction.id } }}
                  >
                    Editar
                  </Link>
                ),
              },
            ]}
            rows={transactions}
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Depositos e pre-pagamentos</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            A operacao final continua no servidor via APIs administrativas de deposito, credito e reembolso. Aqui ficam os registros recentes para diagnostico operacional.
          </p>
          <div className="mt-4">
            {canOperateDeposits ? (
            <DataTable
              columns={[
                {
                  id: 'client',
                  header: 'Cliente',
                  render: (deposit) => deposit.client.user.name,
                },
                {
                  id: 'purpose',
                  header: 'Finalidade',
                  render: (deposit) => deposit.purpose,
                },
                {
                  id: 'amount',
                  header: 'Valor',
                  render: (deposit) => formatCurrency(Number(deposit.amount)),
                },
                {
                  id: 'status',
                  header: 'Status',
                  render: (deposit) => deposit.status,
                },
              ]}
              rows={deposits.slice(0, 6)}
            />
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil nao possui permissao para operar depositos.
              </p>
            )}
          </div>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Reembolsos e creditos</h2>
          <div className="mt-4 space-y-6">
            {canOperateRefunds ? (
            <DataTable
              columns={[
                {
                  id: 'refund-client',
                  header: 'Reembolso',
                  render: (refund) => refund.client?.user.name ?? 'Sem cliente',
                },
                {
                  id: 'refund-amount',
                  header: 'Valor',
                  render: (refund) => formatCurrency(Number(refund.amount)),
                },
                {
                  id: 'refund-status',
                  header: 'Status',
                  render: (refund) => refund.status,
                },
              ]}
              rows={refunds.slice(0, 4)}
            />
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil nao possui permissao para operar reembolsos.
              </p>
            )}

            {canOperateCredits ? (
            <DataTable
              columns={[
                {
                  id: 'credit-client',
                  header: 'Credito',
                  render: (credit) => credit.client.user.name,
                },
                {
                  id: 'credit-available',
                  header: 'Disponivel',
                  render: (credit) => formatCurrency(Number(credit.availableAmount)),
                },
                {
                  id: 'credit-origin',
                  header: 'Origem',
                  render: (credit) => credit.originType,
                },
              ]}
              rows={clientCredits.slice(0, 4)}
            />
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil nao possui permissao para operar creditos do cliente.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Integracao fiscal minima</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            A emissao fiscal da Fase 2 fica registrada como documento fiscal + evento de integracao outbound, sem virar modulo autonomo de ERP neste bloco.
          </p>
          <div className="mt-4">
            {canViewFiscal ? (
            <DataTable
              columns={[
                {
                  id: 'type',
                  header: 'Documento',
                  render: (document) => document.documentType,
                },
                {
                  id: 'status',
                  header: 'Status',
                  render: (document) => document.status,
                },
                {
                  id: 'provider',
                  header: 'Provider',
                  render: (document) => document.providerName ?? 'Nao configurado',
                },
              ]}
              rows={fiscalDocuments.slice(0, 6)}
            />
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil nao possui permissao para visualizar a integracao fiscal.
              </p>
            )}
          </div>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Notas do bloco</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
            <li>`PAID` continua sendo a consolidacao real do financeiro.</li>
            <li>Comissao so libera quando o atendimento esta `COMPLETED` e o financeiro esta `PAID`.</li>
            <li>Eventos externos agora passam por `EventosIntegracao` antes de gerar efeito financeiro ou fiscal.</li>
            <li>No-show protection continua separado do fluxo operacional e depende de cobranca explicita no servidor.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}

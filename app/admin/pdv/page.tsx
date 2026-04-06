import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { listClients } from '@/features/clients/services'
import {
  cancelPosSaleAction,
  completePosSaleAction,
  createPosSaleAction,
} from '@/features/pos/actions'
import { listPosSales } from '@/features/pos/services'
import { listProducts } from '@/features/inventory/services'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import {
  assertPermission,
  hasPermission,
} from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface PosPageProps {
  searchParams: Promise<{
    message?: string
    status?: string
  }>
}

const saleLineRows = [0, 1, 2] as const

export default async function PosPage({ searchParams }: PosPageProps) {
  const actor = await requireInternalAreaUser('/admin/pdv')
  assertPermission(actor, 'pdv.visualizar')
  const params = await searchParams
  const canOperatePos = hasPermission(actor, 'pdv.operar')

  const [sales, products, clients] = await Promise.all([
    listPosSales(actor, {}),
    listProducts(actor, {
      active: true,
      lowStockOnly: false,
    }),
    listClients(actor, {}),
  ])

  const openSales = sales.filter((sale) => sale.status === 'OPEN')

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="PDV"
        title="Venda presencial e pre-venda operacional."
        description="O Bloco 7 conecta frente de caixa, estoque, financeiro e fiscal minimo. O PDV fecha a venda no servidor, cria o lancamento economico no ledger e baixa estoque na mesma transacao."
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form action={createPosSaleAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Nova venda PDV</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Cliente">
              <select className="ui-input" name="clientId">
                <option value="">Venda sem cliente vinculado</option>
                {clients.map((client) => (
                  <option key={client.userId} value={client.userId}>
                    {client.user.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Referencia externa">
              <input className="ui-input" name="externalReference" />
            </FormField>
          </div>

          <div className="space-y-4">
            {saleLineRows.map((rowIndex) => (
              <div
                className="grid gap-4 rounded-[1.5rem] border border-[color:var(--line)] p-4 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr]"
                key={rowIndex}
              >
                <FormField label={`Produto ${rowIndex + 1}`}>
                  <select className="ui-input" name="itemProductId">
                    <option value="">Nao preencher</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Quantidade">
                  <input className="ui-input" name="itemQuantity" />
                </FormField>
                <FormField label="Preco unitario">
                  <input className="ui-input" name="itemUnitPrice" />
                </FormField>
                <FormField label="Desconto">
                  <input className="ui-input" defaultValue="0" name="itemDiscountAmount" />
                </FormField>
              </div>
            ))}
          </div>

          <FormField label="Observacoes">
            <textarea className="ui-input min-h-28" name="notes" />
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Concluir agora">
              <label className="flex items-center gap-3 text-sm text-[color:var(--foreground-soft)]">
                <input name="completeNow" type="checkbox" />
                Fechar a venda no mesmo fluxo
              </label>
            </FormField>
            <FormField label="Emitir documento fiscal minimo">
              <label className="flex items-center gap-3 text-sm text-[color:var(--foreground-soft)]">
                <input name="issueFiscalDocument" type="checkbox" />
                Solicitar NFC-e/NFC-e minima quando a venda liquidar
              </label>
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Metodo de pagamento">
              <select className="ui-input" defaultValue="CASH" name="paymentMethod">
                <option value="CASH">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CARD">Cartao</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="BOLETO">Boleto</option>
                <option value="OTHER">Outro</option>
              </select>
            </FormField>
            <FormField label="Status financeiro inicial">
              <select className="ui-input" defaultValue="PAID" name="paymentStatus">
                <option value="PENDING">Pendente</option>
                <option value="AUTHORIZED">Autorizado</option>
                <option value="PARTIAL">Parcial</option>
                <option value="PAID">Pago</option>
              </select>
            </FormField>
            <FormField label="Provider de integracao">
              <select className="ui-input" defaultValue="" name="integrationProvider">
                <option value="">Sem provider</option>
                <option value="STRIPE">Stripe</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="OTHER">Outro</option>
              </select>
            </FormField>
          </div>

          <button className="ui-button-primary" disabled={!canOperatePos} type="submit">
            Criar venda
          </button>
          {!canOperatePos ? (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para operar o PDV.
            </p>
          ) : null}
        </form>

        <div className="space-y-6">
          <form action={completePosSaleAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Concluir pre-venda</h2>
            <FormField label="Venda aberta">
              <select className="ui-input" name="saleId">
                <option value="">Selecione uma pre-venda</option>
                {openSales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.id.slice(0, 8)} • {formatCurrency(Number(sale.totalAmount))}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Metodo de pagamento">
                <select className="ui-input" defaultValue="CASH" name="paymentMethod">
                  <option value="CASH">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CARD">Cartao</option>
                  <option value="TRANSFER">Transferencia</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="OTHER">Outro</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select className="ui-input" defaultValue="PAID" name="paymentStatus">
                  <option value="PENDING">Pendente</option>
                  <option value="AUTHORIZED">Autorizado</option>
                  <option value="PARTIAL">Parcial</option>
                  <option value="PAID">Pago</option>
                </select>
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Provider">
                <select className="ui-input" defaultValue="" name="integrationProvider">
                  <option value="">Sem provider</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="OTHER">Outro</option>
                </select>
              </FormField>
              <FormField label="Referencia externa">
                <input className="ui-input" name="externalReference" />
              </FormField>
            </div>
            <FormField label="Documento fiscal minimo">
              <label className="flex items-center gap-3 text-sm text-[color:var(--foreground-soft)]">
                <input name="issueFiscalDocument" type="checkbox" />
                Solicitar documento fiscal ao concluir
              </label>
            </FormField>
            <button className="ui-button-primary" disabled={!canOperatePos || openSales.length === 0} type="submit">
              Concluir pre-venda
            </button>
          </form>

          <form action={cancelPosSaleAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Cancelar pre-venda</h2>
            <FormField label="Venda aberta">
              <select className="ui-input" name="saleId">
                <option value="">Selecione uma pre-venda</option>
                {openSales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.id.slice(0, 8)} • {formatCurrency(Number(sale.totalAmount))}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Motivo">
              <textarea className="ui-input min-h-24" name="cancellationReason" />
            </FormField>
            <button className="ui-button-secondary" disabled={!canOperatePos || openSales.length === 0} type="submit">
              Cancelar pre-venda
            </button>
          </form>
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Vendas recentes</h2>
        <div className="mt-4">
          <DataTable
            columns={[
              {
                header: 'Venda',
                id: 'sale-id',
                render: (sale) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{sale.id.slice(0, 8)}</p>
                    <p>{sale.status}</p>
                  </div>
                ),
              },
              {
                header: 'Cliente',
                id: 'sale-client',
                render: (sale) => sale.client?.user.name ?? 'Sem cliente vinculado',
              },
              {
                header: 'Itens',
                id: 'sale-items',
                render: (sale) => sale.items.map((item) => item.productNameSnapshot).join(', '),
              },
              {
                header: 'Total',
                id: 'sale-total',
                render: (sale) => formatCurrency(Number(sale.totalAmount)),
              },
              {
                header: 'Financeiro',
                id: 'sale-financial',
                render: (sale) => sale.financialTransactions[0]?.paymentStatus ?? 'Sem liquidacao',
              },
              {
                header: 'Quando',
                id: 'sale-date',
                render: (sale) => formatDateTime(sale.createdAt),
              },
            ]}
            rows={sales.slice(0, 12)}
          />
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Notas do bloco</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
          <li>O PDV usa o ledger financeiro ja existente; nao cria um status financeiro paralelo da venda.</li>
          <li>Baixa de estoque por venda acontece no servidor e na mesma transacao do fechamento do PDV.</li>
          <li>Documento fiscal do PDV continua no recorte minimo do Bloco 2 e so e solicitado para venda liquidada.</li>
          <li>Cancelamento automatico de venda concluida nao entra aqui; reembolso e retorno permanecem operacoes controladas.</li>
        </ul>
      </section>
    </div>
  )
}

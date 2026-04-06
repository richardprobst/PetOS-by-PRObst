import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import {
  createProductAction,
  recordInventoryMovementAction,
} from '@/features/inventory/actions'
import {
  listInventoryMovements,
  listInventoryStocks,
  listProducts,
} from '@/features/inventory/services'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import {
  assertPermission,
  hasPermission,
} from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface InventoryPageProps {
  searchParams: Promise<{
    message?: string
    status?: string
  }>
}

const manualMovementOptions = [
  {
    description: 'Entrada manual ou reposicao operacional.',
    value: 'STOCK_IN',
  },
  {
    description: 'Retorno de item ao estoque.',
    value: 'RETURN_IN',
  },
  {
    description: 'Ajuste positivo de saldo.',
    value: 'ADJUSTMENT_IN',
  },
  {
    description: 'Ajuste negativo de saldo.',
    value: 'ADJUSTMENT_OUT',
  },
] as const

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const actor = await requireInternalAreaUser('/admin/estoque')
  assertPermission(actor, 'estoque.visualizar')
  const params = await searchParams
  const canEditProducts = hasPermission(actor, 'produto.editar')
  const canMoveInventory = hasPermission(actor, 'estoque.movimentar')

  const [products, inventoryStocks, inventoryMovements] = await Promise.all([
    listProducts(actor, {
      lowStockOnly: false,
    }),
    listInventoryStocks(actor, {
      lowStockOnly: false,
    }),
    listInventoryMovements(actor, {}),
  ])

  const stockByProductId = new Map(
    inventoryStocks.map((stock) => [stock.productId, Number(stock.quantityOnHand)]),
  )
  const lowStockRows = inventoryStocks.filter(
    (stock) =>
      stock.product.trackInventory &&
      Number(stock.quantityOnHand) <= Number(stock.product.minimumStockQuantity),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Estoque"
        title="Catalogo, saldo e movimentacao operacional."
        description="O Bloco 7 ativa o nucleo de estoque da Fase 2 com saldo por unidade, trilha de movimentacao auditavel e integracao direta com o PDV sem virar supply chain ou compras complexas."
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form action={createProductAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Novo produto</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome">
              <input className="ui-input" name="name" />
            </FormField>
            <FormField label="SKU">
              <input className="ui-input" name="sku" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Codigo de barras">
              <input className="ui-input" name="barcode" />
            </FormField>
            <FormField label="Unidade de medida">
              <input className="ui-input" defaultValue="UN" name="unitOfMeasure" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Preco de venda">
              <input className="ui-input" name="salePrice" />
            </FormField>
            <FormField label="Preco de custo">
              <input className="ui-input" name="costPrice" />
            </FormField>
            <FormField label="Estoque minimo">
              <input className="ui-input" name="minimumStockQuantity" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Controla estoque">
              <select className="ui-input" defaultValue="true" name="trackInventory">
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </FormField>
            <FormField label="Ativo">
              <select className="ui-input" defaultValue="true" name="active">
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </FormField>
          </div>
          <FormField label="Descricao">
            <textarea className="ui-input min-h-28" name="description" />
          </FormField>
          <button className="ui-button-primary" disabled={!canEditProducts} type="submit">
            Criar produto
          </button>
          {!canEditProducts ? (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para editar o catalogo de produtos.
            </p>
          ) : null}
        </form>

        <form
          action={recordInventoryMovementAction}
          className="surface-panel rounded-[1.75rem] p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Movimentacao manual</h2>
          <FormField label="Produto">
            <select className="ui-input" name="productId">
              <option value="">Selecione um produto</option>
              {products
                .filter((product) => product.trackInventory)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
            </select>
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Tipo">
              <select className="ui-input" name="movementType">
                {manualMovementOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Quantidade">
              <input className="ui-input" name="quantity" />
            </FormField>
          </div>
          <FormField label="Motivo">
            <input className="ui-input" name="reason" />
          </FormField>
          <FormField label="Observacoes">
            <textarea className="ui-input min-h-28" name="notes" />
          </FormField>
          <button className="ui-button-primary" disabled={!canMoveInventory} type="submit">
            Registrar movimentacao
          </button>
          {!canMoveInventory ? (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para movimentar estoque.
            </p>
          ) : null}
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Catalogo ativo</h2>
          <div className="mt-4">
            <DataTable
              columns={[
                {
                  header: 'Produto',
                  id: 'product',
                  render: (product) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">{product.name}</p>
                      <p>{product.sku ?? 'Sem SKU'} • {product.unitOfMeasure}</p>
                    </div>
                  ),
                },
                {
                  header: 'Venda',
                  id: 'salePrice',
                  render: (product) => formatCurrency(Number(product.salePrice)),
                },
                {
                  header: 'Saldo',
                  id: 'stock',
                  render: (product) =>
                    product.trackInventory ? stockByProductId.get(product.id) ?? 0 : 'Nao controla',
                },
                {
                  header: 'Minimo',
                  id: 'minimum',
                  render: (product) => Number(product.minimumStockQuantity),
                },
              ]}
              rows={products}
            />
          </div>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Produtos em alerta</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            O bloco mantem o alerta de estoque minimo no nivel operacional por produto e unidade, sem abrir compras ou supply chain.
          </p>
          <div className="mt-4">
            <DataTable
              columns={[
                {
                  header: 'Produto',
                  id: 'low-stock-product',
                  render: (stock) => stock.product.name,
                },
                {
                  header: 'Saldo atual',
                  id: 'low-stock-current',
                  render: (stock) => Number(stock.quantityOnHand),
                },
                {
                  header: 'Estoque minimo',
                  id: 'low-stock-minimum',
                  render: (stock) => Number(stock.product.minimumStockQuantity),
                },
              ]}
              rows={lowStockRows}
            />
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Movimentacoes recentes</h2>
        <div className="mt-4">
          <DataTable
            columns={[
              {
                header: 'Produto',
                id: 'movement-product',
                render: (movement) => movement.product.name,
              },
              {
                header: 'Tipo',
                id: 'movement-type',
                render: (movement) => movement.movementType,
              },
              {
                header: 'Quantidade',
                id: 'movement-qty',
                render: (movement) =>
                  `${Number(movement.quantity)} (${Number(movement.quantityBefore)} -> ${Number(movement.quantityAfter)})`,
              },
              {
                header: 'Quando',
                id: 'movement-date',
                render: (movement) => formatDateTime(movement.occurredAt),
              },
            ]}
            rows={inventoryMovements.slice(0, 12)}
          />
        </div>
      </section>
    </div>
  )
}

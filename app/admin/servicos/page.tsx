import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { saveServiceAction } from '@/features/services/actions'
import { listServices } from '@/features/services/services'
import { formatCurrency } from '@/lib/formatters'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface ServicesPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    edit?: string
  }>
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const actor = await requireInternalAreaUser('/admin/servicos')
  assertPermission(actor, 'servico.visualizar')
  const params = await searchParams
  const services = await listServices(actor, {})
  const selectedService = params.edit
    ? services.find((service) => service.id === params.edit)
    : undefined

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Servicos"
        title="Catalogo de servicos com preco base e duracao estimada."
        description="O catalogo sustenta agenda, comissao e portal do tutor sem abrir um motor avancado de capacidade."
        actions={
          selectedService ? (
            <Link className="ui-button-secondary" href="/admin/servicos">
              Novo servico
            </Link>
          ) : null
        }
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form action={saveServiceAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="serviceId" type="hidden" value={selectedService?.id ?? ''} />
          <FormField label="Nome">
            <input className="ui-input" defaultValue={selectedService?.name ?? ''} name="name" />
          </FormField>
          <FormField label="Descricao">
            <textarea className="ui-input min-h-24" defaultValue={selectedService?.description ?? ''} name="description" />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Preco base">
              <input className="ui-input" defaultValue={selectedService ? Number(selectedService.basePrice) : ''} name="basePrice" />
            </FormField>
            <FormField label="Duracao estimada (min)">
              <input className="ui-input" defaultValue={selectedService?.estimatedDurationMinutes ?? ''} name="estimatedDurationMinutes" />
            </FormField>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--foreground)]">
            <input defaultChecked={selectedService?.active ?? true} name="active" type="checkbox" />
            Servico ativo
          </label>
          <button className="ui-button-primary" type="submit">
            {selectedService ? 'Salvar servico' : 'Criar servico'}
          </button>
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <DataTable
            columns={[
              {
                id: 'name',
                header: 'Servico',
                render: (service) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{service.name}</p>
                    <p>{service.description ?? 'Sem descricao adicional.'}</p>
                  </div>
                ),
              },
              {
                id: 'price',
                header: 'Preco',
                render: (service) => formatCurrency(Number(service.basePrice)),
              },
              {
                id: 'duration',
                header: 'Duracao',
                render: (service) => `${service.estimatedDurationMinutes} min`,
              },
              {
                id: 'action',
                header: 'Acao',
                render: (service) => (
                  <Link
                    className="ui-link text-sm font-semibold"
                    href={{ pathname: '/admin/servicos', query: { edit: service.id } }}
                  >
                    Editar
                  </Link>
                ),
              },
            ]}
            rows={services}
          />
        </div>
      </section>
    </div>
  )
}

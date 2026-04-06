import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { saveClientAction } from '@/features/clients/actions'
import { listClients } from '@/features/clients/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface ClientsPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    edit?: string
  }>
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const actor = await requireInternalAreaUser('/admin/clientes')
  assertPermission(actor, 'cliente.visualizar')
  const params = await searchParams
  const clients = await listClients(actor, {})
  const selectedClient = params.edit
    ? clients.find((client) => client.userId === params.edit)
    : undefined

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Clientes"
        title="Cadastro operacional de tutores e dados de contato."
        description="A equipe interna pode criar e ajustar clientes do MVP com dados basicos, contato e preferencias."
        actions={
          selectedClient ? (
            <Link className="ui-button-secondary" href="/admin/clientes">
              Novo cadastro
            </Link>
          ) : null
        }
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form action={saveClientAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="clientId" type="hidden" value={selectedClient?.userId ?? ''} />
          <FormField label="Nome">
            <input className="ui-input" defaultValue={selectedClient?.user.name ?? ''} name="name" />
          </FormField>
          <FormField label="E-mail">
            <input
              className="ui-input"
              defaultValue={selectedClient?.user.email ?? ''}
              name="email"
              type="email"
            />
          </FormField>
          <FormField label="Telefone">
            <input className="ui-input" defaultValue={selectedClient?.user.phone ?? ''} name="phone" />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Cidade">
              <input className="ui-input" defaultValue={selectedClient?.city ?? ''} name="city" />
            </FormField>
            <FormField label="Estado">
              <input className="ui-input" defaultValue={selectedClient?.state ?? ''} name="state" />
            </FormField>
          </div>
          <FormField label="Endereco">
            <input className="ui-input" defaultValue={selectedClient?.address ?? ''} name="address" />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="CEP">
              <input className="ui-input" defaultValue={selectedClient?.zipCode ?? ''} name="zipCode" />
            </FormField>
            <FormField label="Preferencia de contato">
              <input
                className="ui-input"
                defaultValue={selectedClient?.contactPreference ?? ''}
                name="contactPreference"
              />
            </FormField>
          </div>
          <FormField label="Senha inicial ou nova senha">
            <input className="ui-input" name="password" type="password" />
          </FormField>
          <FormField label="Observacoes gerais">
            <textarea
              className="ui-input min-h-28"
              defaultValue={selectedClient?.generalNotes ?? ''}
              name="generalNotes"
            />
          </FormField>
          <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--foreground)]">
            <input defaultChecked={selectedClient?.user.active ?? true} name="active" type="checkbox" />
            Cliente ativo
          </label>
          <button className="ui-button-primary" type="submit">
            {selectedClient ? 'Salvar cliente' : 'Criar cliente'}
          </button>
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <DataTable
            columns={[
              {
                id: 'name',
                header: 'Tutor',
                render: (client) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{client.user.name}</p>
                    <p>{client.user.email}</p>
                  </div>
                ),
              },
              {
                id: 'pets',
                header: 'Pets',
                render: (client) => client.pets.length,
              },
              {
                id: 'city',
                header: 'Cidade',
                render: (client) => client.city ?? 'Nao informada',
              },
              {
                id: 'action',
                header: 'Acao',
                render: (client) => (
                  <Link
                    className="ui-link text-sm font-semibold"
                    href={{ pathname: '/admin/clientes', query: { edit: client.userId } }}
                  >
                    Editar
                  </Link>
                ),
              },
            ]}
            rows={clients}
          />
        </div>
      </section>
    </div>
  )
}

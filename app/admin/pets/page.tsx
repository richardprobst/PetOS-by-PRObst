import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { listClients } from '@/features/clients/services'
import { savePetAction } from '@/features/pets/actions'
import { listPets } from '@/features/pets/services'
import { assertPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface PetsPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    edit?: string
  }>
}

export default async function PetsPage({ searchParams }: PetsPageProps) {
  const actor = await requireInternalAreaUser('/admin/pets')
  assertPermission(actor, 'pet.visualizar')
  const params = await searchParams
  const [pets, clients] = await Promise.all([listPets(actor, {}), listClients(actor, {})])
  const selectedPet = params.edit ? pets.find((pet) => pet.id === params.edit) : undefined

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pets"
        title="Base de pets vinculada ao tutor e pronta para agenda e historico."
        description="O cadastro operacional registra especie, raca, peso, saude e alergias sem adiantar documentos ou midia fora do MVP."
        actions={
          selectedPet ? (
            <Link className="ui-button-secondary" href="/admin/pets">
              Novo pet
            </Link>
          ) : null
        }
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form action={savePetAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <input name="petId" type="hidden" value={selectedPet?.id ?? ''} />
          <FormField label="Tutor responsavel">
            <select className="ui-input" defaultValue={selectedPet?.clientId ?? ''} name="clientId">
              <option value="">Selecione</option>
              {clients.map((client) => (
                <option key={client.userId} value={client.userId}>
                  {client.user.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nome">
              <input className="ui-input" defaultValue={selectedPet?.name ?? ''} name="name" />
            </FormField>
            <FormField label="Especie">
              <input className="ui-input" defaultValue={selectedPet?.species ?? ''} name="species" />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Raca">
              <input className="ui-input" defaultValue={selectedPet?.breed ?? ''} name="breed" />
            </FormField>
            <FormField label="Peso (kg)">
              <input
                className="ui-input"
                defaultValue={selectedPet?.weightKg ? Number(selectedPet.weightKg) : ''}
                name="weightKg"
              />
            </FormField>
          </div>
          <FormField label="Nascimento">
            <input
              className="ui-input"
              defaultValue={selectedPet?.birthDate?.toISOString().slice(0, 10) ?? ''}
              name="birthDate"
              type="date"
            />
          </FormField>
          <FormField label="Saude e observacoes">
            <textarea className="ui-input min-h-24" defaultValue={selectedPet?.healthNotes ?? ''} name="healthNotes" />
          </FormField>
          <FormField label="Alergias">
            <textarea className="ui-input min-h-20" defaultValue={selectedPet?.allergies ?? ''} name="allergies" />
          </FormField>
          <FormField label="URL da foto principal">
            <input className="ui-input" defaultValue={selectedPet?.primaryPhotoUrl ?? ''} name="primaryPhotoUrl" />
          </FormField>
          <button className="ui-button-primary" type="submit">
            {selectedPet ? 'Salvar pet' : 'Criar pet'}
          </button>
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <DataTable
            columns={[
              {
                id: 'name',
                header: 'Pet',
                render: (pet) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{pet.name}</p>
                    <p>{pet.species}{pet.breed ? ` • ${pet.breed}` : ''}</p>
                  </div>
                ),
              },
              {
                id: 'owner',
                header: 'Tutor',
                render: (pet) => pet.client.user.name,
              },
              {
                id: 'weight',
                header: 'Peso',
                render: (pet) => (pet.weightKg ? `${pet.weightKg} kg` : 'Nao informado'),
              },
              {
                id: 'action',
                header: 'Acao',
                render: (pet) => (
                  <Link
                    className="ui-link text-sm font-semibold"
                    href={{ pathname: '/admin/pets', query: { edit: pet.id } }}
                  >
                    Editar
                  </Link>
                ),
              },
            ]}
            rows={pets}
          />
        </div>
      </section>
    </div>
  )
}

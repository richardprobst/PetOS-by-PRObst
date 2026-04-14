import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { getImageAnalysisReviewStatusLabel } from '@/features/ai/admin-taxonomy'
import { listImageAnalyses } from '@/features/ai/vision/services'
import { listClients } from '@/features/clients/services'
import { savePetAction } from '@/features/pets/actions'
import { listPets } from '@/features/pets/services'
import {
  assertPermission,
  hasPermission,
} from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface PetsPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    edit?: string
  }>
}

type PetRow = Awaited<ReturnType<typeof listPets>>[number]
type ImageAnalysisRow = Awaited<ReturnType<typeof listImageAnalyses>>[number]

export default async function PetsPage({ searchParams }: PetsPageProps) {
  const actor = await requireInternalAreaUser('/admin/pets')
  assertPermission(actor, 'pet.visualizar')
  const params = await searchParams
  const canViewImageAnalyses = hasPermission(actor, 'ai.imagem.visualizar')
  const [pets, clients, imageAnalyses] = await Promise.all([
    listPets(actor, {}),
    listClients(actor, {}),
    canViewImageAnalyses
      ? listImageAnalyses(actor, {})
      : Promise.resolve([] as ImageAnalysisRow[]),
  ])
  const selectedPet = params.edit ? pets.find((pet) => pet.id === params.edit) : undefined
  const latestAnalysisByPetId = new Map<string, ImageAnalysisRow>(
    imageAnalyses
      .filter((analysis) => analysis.petId)
      .map((analysis) => [analysis.petId as string, analysis] as const),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pets"
        title="Base de pets pronta para agenda, historico e apoio assistivo de imagem."
        description="O cadastro continua operacional e exibe apenas o ultimo resumo assistivo interno, sem abrir fluxo final para o tutor."
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
          <DataTable<PetRow>
            columns={[
              {
                id: 'name',
                header: 'Pet',
                render: (pet) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">{pet.name}</p>
                    <p>
                      {pet.species}
                      {pet.breed ? ` - ${pet.breed}` : ''}
                    </p>
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
                id: 'imageAnalysis',
                header: 'IA assistiva',
                render: (pet) => {
                  const analysis = latestAnalysisByPetId.get(pet.id)

                  if (!analysis) {
                    return 'Sem leitura'
                  }

                  return `${getImageAnalysisReviewStatusLabel(analysis.reviewStatus)} - ${analysis.resultSummary ?? 'Sem resumo'}`
                },
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

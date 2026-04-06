import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import {
  archiveDocumentAction,
  archiveMediaAssetAction,
  signDocumentAction,
  uploadDocumentAction,
  uploadMediaAssetAction,
} from '@/features/documents/actions'
import { listDocuments, listMediaAssets } from '@/features/documents/services'
import { listAppointments } from '@/features/appointments/services'
import { listClients } from '@/features/clients/services'
import { listPets } from '@/features/pets/services'
import { formatDateTime, formatFileSize } from '@/lib/formatters'
import { assertPermission, hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface DocumentsPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
  }>
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const actor = await requireInternalAreaUser('/admin/documentos')
  assertPermission(actor, 'documento.visualizar')
  const params = await searchParams
  const canEditDocuments = hasPermission(actor, 'documento.editar')
  const canSignDocuments = hasPermission(actor, 'documento.assinar')
  const canViewMedia = hasPermission(actor, 'midia.visualizar')
  const canEditMedia = hasPermission(actor, 'midia.editar')

  const [documents, mediaAssets, clients, pets, appointments] = await Promise.all([
    listDocuments(actor, { includeArchived: false }),
    canViewMedia ? listMediaAssets(actor, { includeArchived: false }) : Promise.resolve([]),
    canEditDocuments || canEditMedia ? listClients(actor, {}) : Promise.resolve([]),
    canEditDocuments || canEditMedia ? listPets(actor, {}) : Promise.resolve([]),
    canEditDocuments || canEditMedia ? listAppointments(actor, {}) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Documentos"
        title="Documentos, formulários, autorizações e mídias operacionais."
        description="O Bloco 3 ativa upload seguro, referência protegida no banco, assinatura auditável e acesso controlado para equipe interna e tutor, sem transformar o portal em produto ampliado."
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form
          action={uploadDocumentAction}
          className="surface-panel rounded-[1.75rem] p-6 space-y-4"
          encType="multipart/form-data"
        >
          <div>
            <p className="section-label">Documento</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
              Faça upload de PDF/imagem ou gere um formulário JSON simples para anamnese, autorizações e registros de vacina.
            </p>
          </div>

          {canEditDocuments ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Título">
                  <input className="ui-input" name="title" />
                </FormField>
                <FormField label="Tipo">
                  <select className="ui-input" name="type">
                    <option value="ANAMNESIS">Anamnese</option>
                    <option value="SERVICE_AUTHORIZATION">Autorização de serviço</option>
                    <option value="TRANSPORT_AUTHORIZATION">Autorização de transporte</option>
                    <option value="VACCINATION_RECORD">Vacina/documento</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Nível de acesso">
                  <select className="ui-input" defaultValue="PROTECTED" name="accessLevel">
                    <option value="PRIVATE">Privado interno</option>
                    <option value="PROTECTED">Protegido</option>
                    <option value="PUBLIC">Público controlado</option>
                  </select>
                </FormField>
                <FormField label="Expira em">
                  <input className="ui-input" name="expiresAt" type="datetime-local" />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Cliente">
                  <select className="ui-input" name="clientId">
                    <option value="">Sem vínculo direto</option>
                    {clients.map((client) => (
                      <option key={client.userId} value={client.userId}>
                        {client.user.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Pet">
                  <select className="ui-input" name="petId">
                    <option value="">Sem vínculo direto</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Agendamento">
                  <select className="ui-input" name="appointmentId">
                    <option value="">Sem vínculo direto</option>
                    {appointments.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {appointment.pet.name} · {formatDateTime(appointment.startAt)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Arquivo">
                <input className="ui-input" name="file" type="file" />
              </FormField>
              <FormField label="Formulário JSON gerado pelo sistema">
                <textarea
                  className="ui-input min-h-28"
                  name="formPayload"
                  placeholder='{"checklist": ["vacina em dia", "autorização de tosa"], "observacoes": "..." }'
                />
              </FormField>
              <FormField label="Metadados JSON opcionais">
                <textarea className="ui-input min-h-24" name="metadataJson" />
              </FormField>
              <label className="flex items-center gap-3 text-sm text-[color:var(--foreground-soft)]">
                <input name="requiresSignature" type="checkbox" />
                Exigir assinatura no fluxo do tutor
              </label>

              <button className="ui-button-primary" type="submit">
                Registrar documento
              </button>
            </>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Seu perfil pode consultar documentos, mas não criar ou editar esse acervo.
            </p>
          )}
        </form>

        <div className="grid gap-6">
          <form
            action={uploadMediaAssetAction}
            className="surface-panel rounded-[1.75rem] p-6 space-y-4"
            encType="multipart/form-data"
          >
            <div>
              <p className="section-label">Mídia</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Registre fotos, vídeos ou PDFs operacionais fora do banco, com referência protegida e vínculo rastreável.
              </p>
            </div>

            {canEditMedia ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Tipo de mídia">
                    <select className="ui-input" defaultValue="" name="type">
                      <option value="">Inferir pelo arquivo</option>
                      <option value="IMAGE">Imagem</option>
                      <option value="VIDEO">Vídeo</option>
                      <option value="PDF">PDF</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </FormField>
                  <FormField label="Nível de acesso">
                    <select className="ui-input" defaultValue="PROTECTED" name="accessLevel">
                      <option value="PRIVATE">Privado interno</option>
                      <option value="PROTECTED">Protegido</option>
                      <option value="PUBLIC">Público controlado</option>
                    </select>
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Cliente">
                    <select className="ui-input" name="clientId">
                      <option value="">Sem vínculo direto</option>
                      {clients.map((client) => (
                        <option key={client.userId} value={client.userId}>
                          {client.user.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Pet">
                    <select className="ui-input" name="petId">
                      <option value="">Sem vínculo direto</option>
                      {pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Agendamento">
                    <select className="ui-input" name="appointmentId">
                      <option value="">Sem vínculo direto</option>
                      {appointments.map((appointment) => (
                        <option key={appointment.id} value={appointment.id}>
                          {appointment.pet.name} · {formatDateTime(appointment.startAt)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <FormField label="Arquivo">
                  <input className="ui-input" name="file" type="file" />
                </FormField>
                <FormField label="Descrição">
                  <textarea className="ui-input min-h-24" name="description" />
                </FormField>
                <FormField label="Metadados JSON opcionais">
                  <textarea className="ui-input min-h-24" name="metadataJson" />
                </FormField>
                <button className="ui-button-primary" type="submit">
                  Registrar mídia
                </button>
              </>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Seu perfil não possui permissão para registrar mídias operacionais.
              </p>
            )}
          </form>

          <form action={signDocumentAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
            <div>
              <p className="section-label">Assinatura</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Registre assinatura digital tipada, desenhada ou manual sem transformar este fluxo em plataforma jurídica ampla.
              </p>
            </div>

            {canSignDocuments ? (
              <>
                <FormField label="Documento">
                  <select className="ui-input" name="documentId">
                    <option value="">Selecione</option>
                    {documents.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Nome do assinante">
                    <input className="ui-input" name="signerName" />
                  </FormField>
                  <FormField label="E-mail do assinante">
                    <input className="ui-input" name="signerEmail" type="email" />
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Método">
                    <select className="ui-input" defaultValue="MANUAL" name="method">
                      <option value="MANUAL">Manual</option>
                      <option value="DIGITAL_TYPED">Digital tipada</option>
                      <option value="DIGITAL_DRAWN">Digital desenhada</option>
                    </select>
                  </FormField>
                  <FormField label="Payload JSON opcional">
                    <textarea className="ui-input min-h-24" name="payloadJson" />
                  </FormField>
                </div>
                <button className="ui-button-primary" type="submit">
                  Registrar assinatura
                </button>
              </>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Seu perfil não possui permissão para operar assinaturas.
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Documentos registrados</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            Acesso sempre protegido no servidor. Documentos arquivados saem da visão operacional principal.
          </p>
          <div className="mt-4">
            <DataTable
              columns={[
                {
                  id: 'title',
                  header: 'Documento',
                  render: (document) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">{document.title}</p>
                      <p>{document.type}</p>
                    </div>
                  ),
                },
                {
                  id: 'binding',
                  header: 'Vínculo',
                  render: (document) =>
                    document.pet
                      ? `${document.pet.name} · ${document.client?.user.name ?? document.appointment?.client.user.name ?? 'Tutor'}`
                      : document.client?.user.name ?? 'Sem vínculo direto',
                },
                {
                  id: 'file',
                  header: 'Arquivo',
                  render: (document) =>
                    `${document.mimeType} · ${formatFileSize(document.sizeBytes)}`,
                },
                {
                  id: 'signature',
                  header: 'Assinaturas',
                  render: (document) =>
                    document.signatures.length > 0
                      ? `${document.signatures.filter((signature) => signature.status === 'SIGNED').length} assinadas`
                      : document.metadata && typeof document.metadata === 'object' && 'requiresSignature' in document.metadata && (document.metadata as Record<string, unknown>).requiresSignature === true
                        ? 'Pendente'
                        : 'Não exigida',
                },
                {
                  id: 'action',
                  header: 'Ação',
                  render: (document) => (
                    <div className="flex flex-wrap gap-2">
                      <Link className="ui-link text-sm font-semibold" href={`/api/assets/documents/${document.id}`}>
                        Baixar
                      </Link>
                      {canEditDocuments ? (
                        <form action={archiveDocumentAction}>
                          <input name="documentId" type="hidden" value={document.id} />
                          <input name="reason" type="hidden" value="Arquivamento operacional via painel." />
                          <button className="ui-link text-sm font-semibold text-[color:#8b5a3c]" type="submit">
                            Arquivar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={documents}
            />
          </div>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Mídias protegidas</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            Fotos, vídeos e PDFs operacionais ficam fora do banco e entram aqui só com referência, metadados e controle de acesso.
          </p>
          <div className="mt-4">
            {canViewMedia ? (
              <DataTable
                columns={[
                  {
                    id: 'type',
                    header: 'Mídia',
                    render: (mediaAsset) => (
                      <div>
                        <p className="font-semibold text-[color:var(--foreground)]">
                          {mediaAsset.originalFileName ?? mediaAsset.id}
                        </p>
                        <p>{mediaAsset.type}</p>
                      </div>
                    ),
                  },
                  {
                    id: 'binding',
                    header: 'Vínculo',
                    render: (mediaAsset) =>
                      mediaAsset.pet
                        ? `${mediaAsset.pet.name} · ${mediaAsset.client?.user.name ?? mediaAsset.appointment?.client.user.name ?? 'Tutor'}`
                        : mediaAsset.client?.user.name ?? 'Sem vínculo direto',
                  },
                  {
                    id: 'file',
                    header: 'Arquivo',
                    render: (mediaAsset) =>
                      `${mediaAsset.mimeType} · ${formatFileSize(mediaAsset.sizeBytes)}`,
                  },
                  {
                    id: 'uploaded',
                    header: 'Upload',
                    render: (mediaAsset) => formatDateTime(mediaAsset.createdAt),
                  },
                  {
                    id: 'action',
                    header: 'Ação',
                    render: (mediaAsset) => (
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="ui-link text-sm font-semibold"
                          href={`/api/assets/media/${mediaAsset.id}?download=1`}
                        >
                          Baixar
                        </Link>
                        {canEditMedia ? (
                          <form action={archiveMediaAssetAction}>
                            <input name="mediaAssetId" type="hidden" value={mediaAsset.id} />
                            <input name="reason" type="hidden" value="Arquivamento operacional via painel." />
                            <button className="ui-link text-sm font-semibold text-[color:#8b5a3c]" type="submit">
                              Arquivar
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ),
                  },
                ]}
                rows={mediaAssets}
              />
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Seu perfil não possui permissão para consultar mídias protegidas.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

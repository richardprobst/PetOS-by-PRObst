import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import {
  getAiExecutionStatusLabel,
  getImageAnalysisReviewStatusLabel,
} from '@/features/ai/admin-taxonomy'
import {
  createGalleryImageAnalysisAction,
  createPrePostImageAnalysisAction,
  reviewImageAnalysisAction,
} from '@/features/ai/vision/actions'
import { listImageAnalyses } from '@/features/ai/vision/services'
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
import { listReportCards } from '@/features/report-cards/services'
import { formatDateTime, formatFileSize } from '@/lib/formatters'
import {
  assertPermission,
  hasPermission,
} from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface DocumentsPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
  }>
}

type DocumentRow = Awaited<ReturnType<typeof listDocuments>>[number]
type MediaAssetRow = Awaited<ReturnType<typeof listMediaAssets>>[number]
type ImageAnalysisRow = Awaited<ReturnType<typeof listImageAnalyses>>[number]
type ClientRow = Awaited<ReturnType<typeof listClients>>[number]
type PetRow = Awaited<ReturnType<typeof listPets>>[number]
type AppointmentRow = Awaited<ReturnType<typeof listAppointments>>[number]
type ReportCardRow = Awaited<ReturnType<typeof listReportCards>>[number]

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const actor = await requireInternalAreaUser('/admin/documentos')
  assertPermission(actor, 'documento.visualizar')
  const params = await searchParams
  const canEditDocuments = hasPermission(actor, 'documento.editar')
  const canSignDocuments = hasPermission(actor, 'documento.assinar')
  const canViewMedia = hasPermission(actor, 'midia.visualizar')
  const canEditMedia = hasPermission(actor, 'midia.editar')
  const canViewImageAnalyses = hasPermission(actor, 'ai.imagem.visualizar')
  const canRunImageAnalyses = hasPermission(actor, 'ai.imagem.executar')
  const canReviewImageAnalyses = hasPermission(actor, 'ai.imagem.revisar')

  const [documents, mediaAssets, imageAnalyses, clients, pets, appointments, reportCards] =
    await Promise.all([
      listDocuments(actor, { includeArchived: false }),
      canViewMedia
        ? listMediaAssets(actor, { includeArchived: false })
        : Promise.resolve([] as MediaAssetRow[]),
      canViewImageAnalyses
        ? listImageAnalyses(actor, {})
        : Promise.resolve([] as ImageAnalysisRow[]),
      canEditDocuments || canEditMedia
        ? listClients(actor, {})
        : Promise.resolve([] as ClientRow[]),
      canEditDocuments || canEditMedia
        ? listPets(actor, {})
        : Promise.resolve([] as PetRow[]),
      canEditDocuments || canEditMedia
        ? listAppointments(actor, {})
        : Promise.resolve([] as AppointmentRow[]),
      canRunImageAnalyses
        ? listReportCards(actor, {})
        : Promise.resolve([] as ReportCardRow[]),
    ])

  const imageMediaAssets = mediaAssets.filter((mediaAsset) => mediaAsset.type === 'IMAGE')
  const pendingReviewAnalyses = imageAnalyses.filter(
    (analysis) => analysis.reviewStatus === 'PENDING_REVIEW',
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Documentos"
        title="Documentos, midias e leituras assistivas de imagem."
        description="O Bloco 3 abre o primeiro corte de analise de imagem como apoio operacional auditavel, sem provider real e com revisao humana obrigatoria."
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
              Upload seguro para PDFs, imagens e formularios operacionais com trilha
              de assinatura e acesso controlado.
            </p>
          </div>

          {canEditDocuments ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Titulo">
                  <input className="ui-input" name="title" />
                </FormField>
                <FormField label="Tipo">
                  <select className="ui-input" name="type">
                    <option value="ANAMNESIS">Anamnese</option>
                    <option value="SERVICE_AUTHORIZATION">Autorizacao de servico</option>
                    <option value="TRANSPORT_AUTHORIZATION">
                      Autorizacao de transporte
                    </option>
                    <option value="VACCINATION_RECORD">Vacina ou documento</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Nivel de acesso">
                  <select className="ui-input" defaultValue="PROTECTED" name="accessLevel">
                    <option value="PRIVATE">Privado interno</option>
                    <option value="PROTECTED">Protegido</option>
                    <option value="PUBLIC">Publico controlado</option>
                  </select>
                </FormField>
                <FormField label="Expira em">
                  <input className="ui-input" name="expiresAt" type="datetime-local" />
                </FormField>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Cliente">
                  <select className="ui-input" name="clientId">
                    <option value="">Sem vinculo direto</option>
                    {clients.map((client) => (
                      <option key={client.userId} value={client.userId}>
                        {client.user.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Pet">
                  <select className="ui-input" name="petId">
                    <option value="">Sem vinculo direto</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Agendamento">
                  <select className="ui-input" name="appointmentId">
                    <option value="">Sem vinculo direto</option>
                    {appointments.map((appointment) => (
                      <option key={appointment.id} value={appointment.id}>
                        {appointment.pet.name} - {formatDateTime(appointment.startAt)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Arquivo">
                <input className="ui-input" name="file" type="file" />
              </FormField>
              <FormField label="Formulario JSON gerado pelo sistema">
                <textarea
                  className="ui-input min-h-28"
                  name="formPayload"
                  placeholder='{"checklist":["vacina em dia"],"observacoes":"..."}'
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
              Seu perfil pode consultar documentos, mas nao criar ou editar este
              acervo.
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
              <p className="section-label">Midia</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Fotos, videos e PDFs operacionais ficam fora do banco e entram aqui
                apenas com referencia, metadados e controle de acesso.
              </p>
            </div>

            {canEditMedia ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Tipo de midia">
                    <select className="ui-input" defaultValue="" name="type">
                      <option value="">Inferir pelo arquivo</option>
                      <option value="IMAGE">Imagem</option>
                      <option value="VIDEO">Video</option>
                      <option value="PDF">PDF</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </FormField>
                  <FormField label="Nivel de acesso">
                    <select className="ui-input" defaultValue="PROTECTED" name="accessLevel">
                      <option value="PRIVATE">Privado interno</option>
                      <option value="PROTECTED">Protegido</option>
                      <option value="PUBLIC">Publico controlado</option>
                    </select>
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Etapa da captura">
                    <select className="ui-input" defaultValue="GALLERY" name="captureStage">
                      <option value="GALLERY">Galeria ou metadado</option>
                      <option value="PRE_SERVICE">Pre-servico</option>
                      <option value="POST_SERVICE">Pos-servico</option>
                    </select>
                  </FormField>
                  <FormField label="Rotulo da galeria">
                    <input
                      className="ui-input"
                      name="galleryLabel"
                      placeholder="banho final, antes do banho, vitrine..."
                    />
                  </FormField>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField label="Cliente">
                    <select className="ui-input" name="clientId">
                      <option value="">Sem vinculo direto</option>
                      {clients.map((client) => (
                        <option key={client.userId} value={client.userId}>
                          {client.user.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Pet">
                    <select className="ui-input" name="petId">
                      <option value="">Sem vinculo direto</option>
                      {pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Agendamento">
                    <select className="ui-input" name="appointmentId">
                      <option value="">Sem vinculo direto</option>
                      {appointments.map((appointment) => (
                        <option key={appointment.id} value={appointment.id}>
                        {appointment.pet.name} - {formatDateTime(appointment.startAt)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <FormField label="Arquivo">
                  <input className="ui-input" name="file" type="file" />
                </FormField>
                <FormField label="Descricao">
                  <textarea className="ui-input min-h-24" name="description" />
                </FormField>
                <FormField label="Metadados JSON opcionais">
                  <textarea className="ui-input min-h-24" name="metadataJson" />
                </FormField>
                <p className="text-xs leading-5 text-[color:var(--foreground-soft)]">
                  Capturas PRE_SERVICE e POST_SERVICE devem permanecer ligadas ao
                  mesmo atendimento para liberar comparacao assistiva.
                </p>
                <button className="ui-button-primary" type="submit">
                  Registrar midia
                </button>
              </>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Seu perfil nao possui permissao para registrar midias operacionais.
              </p>
            )}
          </form>

          <form
            action={signDocumentAction}
            className="surface-panel rounded-[1.75rem] p-6 space-y-4"
          >
            <div>
              <p className="section-label">Assinatura</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Assinatura digital tipada, desenhada ou manual com trilha auditavel.
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
                  <FormField label="Metodo">
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
                Seu perfil nao possui permissao para operar assinaturas.
              </p>
            )}
          </form>

          <form
            action={createGalleryImageAnalysisAction}
            className="surface-panel rounded-[1.75rem] p-6 space-y-4"
          >
            <div>
              <p className="section-label">IA de imagem assistiva</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Primeiro corte do Bloco 3: organizacao de galeria e comparacao
                assistiva pre e pos-servico, sempre com revisao humana.
              </p>
            </div>

            {canRunImageAnalyses ? (
              <>
                <FormField label="Imagem para galeria ou metadado">
                  <select className="ui-input" name="mediaAssetId">
                    <option value="">Selecione uma imagem</option>
                    {imageMediaAssets.map((mediaAsset) => (
                      <option key={mediaAsset.id} value={mediaAsset.id}>
                        {mediaAsset.originalFileName ?? mediaAsset.id}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Origem do consentimento">
                    <select
                      className="ui-input"
                      defaultValue="ADMIN_CAPTURE"
                      name="consentOrigin"
                    >
                      <option value="ADMIN_CAPTURE">Captura administrativa</option>
                      <option value="TUTOR_FLOW_OPT_IN">Opt-in do tutor</option>
                    </select>
                  </FormField>
                  <label className="flex items-center gap-3 text-sm text-[color:var(--foreground-soft)]">
                    <input defaultChecked name="consentGranted" type="checkbox" />
                    Confirmar consentimento para esta finalidade
                  </label>
                </div>
                <button className="ui-button-primary" type="submit">
                  Gerar leitura assistiva de galeria
                </button>
              </>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Seu perfil pode consultar midias, mas nao acionar analise assistiva.
              </p>
            )}
          </form>

          <form
            action={createPrePostImageAnalysisAction}
            className="surface-panel rounded-[1.75rem] p-6 space-y-4"
          >
            <div>
              <p className="section-label">Comparacao pre e pos-servico</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                O sistema compara apenas imagens do mesmo atendimento e do mesmo pet,
                com uma captura PRE_SERVICE e outra POST_SERVICE.
              </p>
            </div>

            {canRunImageAnalyses ? (
              <>
                <FormField label="Imagem principal">
                  <select className="ui-input" name="mediaAssetId">
                    <option value="">Selecione a captura principal</option>
                    {imageMediaAssets.map((mediaAsset) => (
                      <option key={mediaAsset.id} value={mediaAsset.id}>
                        {mediaAsset.originalFileName ?? mediaAsset.id}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Imagem de comparacao">
                  <select className="ui-input" name="comparisonMediaAssetId">
                    <option value="">Selecione a captura de comparacao</option>
                    {imageMediaAssets.map((mediaAsset) => (
                      <option key={mediaAsset.id} value={mediaAsset.id}>
                        {mediaAsset.originalFileName ?? mediaAsset.id}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Report card vinculado (opcional)">
                  <select className="ui-input" name="reportCardId">
                    <option value="">Sem report card ainda</option>
                    {reportCards.map((reportCard) => (
                      <option key={reportCard.id} value={reportCard.id}>
                        {reportCard.appointment.pet.name} -{' '}
                        {formatDateTime(reportCard.generatedAt)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Origem do consentimento">
                    <select
                      className="ui-input"
                      defaultValue="ADMIN_CAPTURE"
                      name="consentOrigin"
                    >
                      <option value="ADMIN_CAPTURE">Captura administrativa</option>
                      <option value="TUTOR_FLOW_OPT_IN">Opt-in do tutor</option>
                    </select>
                  </FormField>
                  <label className="flex items-center gap-3 text-sm text-[color:var(--foreground-soft)]">
                    <input defaultChecked name="consentGranted" type="checkbox" />
                    Confirmar consentimento para comparacao assistiva
                  </label>
                </div>
                <button className="ui-button-primary" type="submit">
                  Gerar comparacao assistiva
                </button>
              </>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Seu perfil nao possui permissao para comparacoes assistivas pre e
                pos-servico.
              </p>
            )}
          </form>

          <form
            action={reviewImageAnalysisAction}
            className="surface-panel rounded-[1.75rem] p-6 space-y-4"
          >
            <div>
              <p className="section-label">Revisao humana obrigatoria</p>
              <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Nenhum resultado desta trilha deve ser tratado como diagnostico.
                Aprovacao humana e obrigatoria no primeiro corte.
              </p>
            </div>

            {canReviewImageAnalyses ? (
              <>
                <FormField label="Analise pendente">
                  <select className="ui-input" name="imageAnalysisId">
                    <option value="">Selecione</option>
                    {pendingReviewAnalyses.map((analysis) => (
                      <option key={analysis.id} value={analysis.id}>
                    {analysis.kind} -{' '}
                        {analysis.mediaAsset.originalFileName ?? analysis.mediaAsset.id}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Decisao">
                  <select className="ui-input" defaultValue="APPROVED" name="decision">
                    <option value="APPROVED">Aprovar</option>
                    <option value="REJECTED">Rejeitar</option>
                  </select>
                </FormField>
                <FormField label="Observacoes da revisao">
                  <textarea className="ui-input min-h-24" name="reviewNotes" />
                </FormField>
                <button className="ui-button-primary" type="submit">
                  Registrar revisao humana
                </button>
              </>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Seu perfil nao possui permissao para revisar leituras assistivas.
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            Documentos registrados
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            Acesso sempre protegido no servidor. Documentos arquivados saem da
            visao operacional principal.
          </p>
          <div className="mt-4">
            <DataTable<DocumentRow>
              columns={[
                {
                  id: 'title',
                  header: 'Documento',
                  render: (document) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">
                        {document.title}
                      </p>
                      <p>{document.type}</p>
                    </div>
                  ),
                },
                {
                  id: 'binding',
                  header: 'Vinculo',
                  render: (document) =>
                    document.pet
                              ? `${document.pet.name} - ${document.client?.user.name ?? document.appointment?.client.user.name ?? 'Tutor'}`
                      : document.client?.user.name ?? 'Sem vinculo direto',
                },
                {
                  id: 'file',
                  header: 'Arquivo',
                  render: (document) =>
                            `${document.mimeType} - ${formatFileSize(document.sizeBytes)}`,
                },
                {
                  id: 'signature',
                  header: 'Assinaturas',
                  render: (document) =>
                    document.signatures.length > 0
                      ? `${document.signatures.filter((signature) => signature.status === 'SIGNED').length} assinadas`
                      : document.metadata &&
                          typeof document.metadata === 'object' &&
                          'requiresSignature' in document.metadata &&
                          (document.metadata as Record<string, unknown>).requiresSignature === true
                        ? 'Pendente'
                        : 'Nao exigida',
                },
                {
                  id: 'action',
                  header: 'Acao',
                  render: (document) => (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="ui-link text-sm font-semibold"
                        href={`/api/assets/documents/${document.id}`}
                      >
                        Baixar
                      </Link>
                      {canEditDocuments ? (
                        <form action={archiveDocumentAction}>
                          <input name="documentId" type="hidden" value={document.id} />
                          <input
                            name="reason"
                            type="hidden"
                            value="Arquivamento operacional via painel."
                          />
                          <button
                            className="ui-link text-sm font-semibold text-[color:#8b5a3c]"
                            type="submit"
                          >
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
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
            Midias protegidas
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            Fotos, videos e PDFs operacionais ficam fora do banco e entram aqui
            apenas com referencia, metadados e controle de acesso.
          </p>
          <div className="mt-4">
            {canViewMedia ? (
              <DataTable<MediaAssetRow>
                columns={[
                  {
                    id: 'type',
                    header: 'Midia',
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
                    header: 'Vinculo',
                    render: (mediaAsset) =>
                      mediaAsset.pet
                              ? `${mediaAsset.pet.name} - ${mediaAsset.client?.user.name ?? mediaAsset.appointment?.client.user.name ?? 'Tutor'}`
                        : mediaAsset.client?.user.name ?? 'Sem vinculo direto',
                  },
                  {
                    id: 'capture',
                    header: 'Captura',
                    render: (mediaAsset) =>
                      mediaAsset.metadata &&
                      typeof mediaAsset.metadata === 'object' &&
                      'captureStage' in mediaAsset.metadata
                        ? String(
                            (mediaAsset.metadata as Record<string, unknown>).captureStage,
                          )
                        : 'GALLERY',
                  },
                  {
                    id: 'file',
                    header: 'Arquivo',
                    render: (mediaAsset) =>
                            `${mediaAsset.mimeType} - ${formatFileSize(mediaAsset.sizeBytes)}`,
                  },
                  {
                    id: 'uploaded',
                    header: 'Upload',
                    render: (mediaAsset) => formatDateTime(mediaAsset.createdAt),
                  },
                  {
                    id: 'action',
                    header: 'Acao',
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
                            <input
                              name="mediaAssetId"
                              type="hidden"
                              value={mediaAsset.id}
                            />
                            <input
                              name="reason"
                              type="hidden"
                              value="Arquivamento operacional via painel."
                            />
                            <button
                              className="ui-link text-sm font-semibold text-[color:#8b5a3c]"
                              type="submit"
                            >
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
                Seu perfil nao possui permissao para consultar midias protegidas.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
          Leituras assistivas de imagem
        </h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
          Esta camada mostra apenas sugestoes assistivas auditaveis. Resultado
          aprovado continua dependendo de operador humano e nao substitui avaliacao
          veterinaria.
        </p>
        <div className="mt-4">
          {canViewImageAnalyses ? (
            <DataTable<ImageAnalysisRow>
              columns={[
                {
                  id: 'kind',
                  header: 'Analise',
                  render: (analysis) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">
                        {analysis.kind}
                      </p>
                      <p>
                        {analysis.mediaAsset.originalFileName ?? analysis.mediaAsset.id}
                      </p>
                    </div>
                  ),
                },
                {
                  id: 'binding',
                  header: 'Contexto',
                  render: (analysis) =>
                    analysis.pet
                              ? `${analysis.pet.name} - ${analysis.client?.user.name ?? analysis.appointment?.client.user.name ?? 'Tutor'}`
                      : analysis.appointment
                              ? `${analysis.appointment.pet.name} - ${analysis.appointment.client.user.name}`
                        : 'Sem vinculo operacional',
                },
                {
                  id: 'status',
                  header: 'Execucao',
                  render: (analysis) =>
                    `${getAiExecutionStatusLabel(analysis.executionStatus)} / ${getImageAnalysisReviewStatusLabel(analysis.reviewStatus)}`,
                },
                {
                  id: 'summary',
                  header: 'Resumo assistivo',
                  render: (analysis) => analysis.resultSummary ?? 'Sem resumo',
                },
                {
                  id: 'created',
                  header: 'Criada em',
                  render: (analysis) => formatDateTime(analysis.createdAt),
                },
              ]}
              rows={imageAnalyses}
            />
          ) : (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Seu perfil nao possui permissao para consultar leituras assistivas de
              imagem.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

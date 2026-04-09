import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { listImageAnalyses } from '@/features/ai/vision/services'
import { listAppointments } from '@/features/appointments/services'
import { saveReportCardAction } from '@/features/report-cards/actions'
import { listReportCards } from '@/features/report-cards/services'
import { formatDateTime } from '@/lib/formatters'
import {
  assertPermission,
  hasPermission,
} from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface ReportCardsPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    edit?: string
  }>
}

type ReportCardRow = Awaited<ReturnType<typeof listReportCards>>[number]
type ImageAnalysisRow = Awaited<ReturnType<typeof listImageAnalyses>>[number]

export default async function ReportCardsPage({
  searchParams,
}: ReportCardsPageProps) {
  const actor = await requireInternalAreaUser('/admin/report-cards')
  assertPermission(actor, 'report_card.visualizar')
  const params = await searchParams
  const canViewImageAnalyses = hasPermission(actor, 'ai.imagem.visualizar')
  const [reportCards, appointments, imageAnalyses] = await Promise.all([
    listReportCards(actor, {}),
    listAppointments(actor, {}),
    canViewImageAnalyses
      ? listImageAnalyses(actor, { kind: 'PRE_POST_ASSISTED' })
      : Promise.resolve([] as ImageAnalysisRow[]),
  ])
  const selectedReportCard = params.edit
    ? reportCards.find((reportCard) => reportCard.id === params.edit)
    : undefined

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Report cards"
        title="Resumo operacional do atendimento com apoio assistivo de imagem."
        description="O report card continua textual, mas agora pode consultar comparacoes pre e pos-servico aprovadas ou pendentes de revisao humana."
        actions={
          selectedReportCard ? (
            <Link className="ui-button-secondary" href="/admin/report-cards">
              Novo report card
            </Link>
          ) : null
        }
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form
          action={saveReportCardAction}
          className="surface-panel rounded-[1.75rem] p-6 space-y-4"
        >
          <input name="reportCardId" type="hidden" value={selectedReportCard?.id ?? ''} />
          {!selectedReportCard ? (
            <FormField label="Agendamento concluido">
              <select className="ui-input" name="appointmentId">
                <option value="">Selecione</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.pet.name} - {formatDateTime(appointment.startAt)}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
          <FormField label="Observacoes gerais">
            <textarea
              className="ui-input min-h-24"
              defaultValue={selectedReportCard?.generalNotes ?? ''}
              name="generalNotes"
            />
          </FormField>
          <FormField label="Comportamento do pet">
            <textarea
              className="ui-input min-h-20"
              defaultValue={selectedReportCard?.petBehavior ?? ''}
              name="petBehavior"
            />
          </FormField>
          <FormField label="Produtos usados">
            <textarea
              className="ui-input min-h-20"
              defaultValue={selectedReportCard?.productsUsed ?? ''}
              name="productsUsed"
            />
          </FormField>
          <FormField label="Recomendacao de retorno">
            <textarea
              className="ui-input min-h-20"
              defaultValue={selectedReportCard?.nextReturnRecommendation ?? ''}
              name="nextReturnRecommendation"
            />
          </FormField>
          <p className="text-xs leading-5 text-[color:var(--foreground-soft)]">
            Leituras de imagem deste bloco sao apenas assistivas. Registre no report card
            somente o que foi confirmado por operador humano.
          </p>
          <button className="ui-button-primary" type="submit">
            {selectedReportCard ? 'Salvar report card' : 'Criar report card'}
          </button>
        </form>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <DataTable<ReportCardRow>
            columns={[
              {
                id: 'appointment',
                header: 'Atendimento',
                render: (reportCard) => (
                  <div>
                    <p className="font-semibold text-[color:var(--foreground)]">
                      {reportCard.appointment.pet.name}
                    </p>
                    <p>{reportCard.appointment.client.user.name}</p>
                  </div>
                ),
              },
              {
                id: 'generated',
                header: 'Gerado em',
                render: (reportCard) => formatDateTime(reportCard.generatedAt),
              },
              {
                id: 'recommendation',
                header: 'Retorno',
                render: (reportCard) =>
                  reportCard.nextReturnRecommendation ?? 'Sem recomendacao',
              },
              {
                id: 'action',
                header: 'Acao',
                render: (reportCard) => (
                  <Link
                    className="ui-link text-sm font-semibold"
                    href={{ pathname: '/admin/report-cards', query: { edit: reportCard.id } }}
                  >
                    Editar
                  </Link>
                ),
              },
            ]}
            rows={reportCards}
          />
        </div>
      </section>

      <section className="surface-panel rounded-[1.75rem] p-6">
        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
          Comparacoes assistivas pre e pos-servico
        </h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
          Esta tabela ajuda a revisar o contexto visual do atendimento. Nao ha
          diagnostico automatico e a aprovacao humana continua obrigatoria.
        </p>
        <div className="mt-4">
          {canViewImageAnalyses ? (
            <DataTable<ImageAnalysisRow>
              columns={[
                {
                  id: 'appointment',
                  header: 'Atendimento',
                  render: (analysis) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">
                        {analysis.appointment?.pet.name ?? 'Sem atendimento'}
                      </p>
                      <p>{analysis.appointment?.client.user.name ?? 'Sem tutor'}</p>
                    </div>
                  ),
                },
                {
                  id: 'review',
                  header: 'Revisao',
                  render: (analysis) => analysis.reviewStatus,
                },
                {
                  id: 'summary',
                  header: 'Resumo',
                  render: (analysis) => analysis.resultSummary ?? 'Sem resumo',
                },
                {
                  id: 'updated',
                  header: 'Criada em',
                  render: (analysis) => formatDateTime(analysis.createdAt),
                },
              ]}
              rows={imageAnalyses}
            />
          ) : (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Seu perfil nao possui permissao para consultar comparacoes assistivas.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

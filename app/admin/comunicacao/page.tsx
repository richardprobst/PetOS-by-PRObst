import Link from 'next/link'
import { ActionFlash } from '@/components/ui/action-flash'
import { DataTable } from '@/components/ui/data-table'
import { FormField } from '@/components/ui/form-field'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { listAppointments } from '@/features/appointments/services'
import {
  prepareCrmCampaignExecutionAction,
  saveClientCommunicationPreferenceAction,
  saveCrmCampaignAction,
} from '@/features/crm/actions'
import { CrmRecipientLaunchButton } from '@/features/crm/components/crm-recipient-launch-button'
import {
  listClientCommunicationPreferences,
  listCrmCampaigns,
  listCrmExecutions,
} from '@/features/crm/services'
import { listClients } from '@/features/clients/services'
import { saveMessageTemplateAction } from '@/features/messages/actions'
import { ManualLaunchForm } from '@/features/messages/components/manual-launch-form'
import { listMessageLogs, listMessageTemplates } from '@/features/messages/services'
import { formatDateTime } from '@/lib/formatters'
import { assertPermission, hasPermission } from '@/server/authorization/access-control'
import { requireInternalAreaUser } from '@/server/authorization/guards'

interface CommunicationPageProps {
  searchParams: Promise<{
    status?: string
    message?: string
    edit?: string
    editCampaign?: string
    editPreference?: string
  }>
}

function getCriteriaSnapshot(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as {
    breeds?: string[]
    inactivityDays?: number
    minimumCompletedAppointments?: number
    offerName?: string
    onlyClientsWithoutFutureAppointments?: boolean
    petSizeCategories?: string[]
    postServiceDelayHours?: number
    reviewDelayHours?: number
  }
}

function getStatusTone(status: string) {
  if (status === 'ACTIVE' || status === 'COMPLETED' || status === 'LAUNCHED') {
    return 'success' as const
  }

  if (status === 'PREPARED' || status === 'DRAFT') {
    return 'info' as const
  }

  if (status === 'SKIPPED' || status === 'PAUSED') {
    return 'warning' as const
  }

  if (status === 'FAILED' || status === 'ARCHIVED' || status === 'CANCELED') {
    return 'danger' as const
  }

  return 'neutral' as const
}

export default async function CommunicationPage({ searchParams }: CommunicationPageProps) {
  const actor = await requireInternalAreaUser('/admin/comunicacao')
  assertPermission(actor, 'template_mensagem.visualizar')
  const params = await searchParams
  const canViewPreferences = hasPermission(actor, 'crm.preferencia_contato.visualizar')
  const canEditPreferences = hasPermission(actor, 'crm.preferencia_contato.editar')
  const canViewCampaigns = hasPermission(actor, 'crm.campanha.visualizar')
  const canEditCampaigns = hasPermission(actor, 'crm.campanha.editar')
  const canExecuteCampaigns = hasPermission(actor, 'crm.campanha.executar')

  const [templates, logs, clients, appointments, preferences, campaigns, executions] = await Promise.all([
    listMessageTemplates(actor, {}),
    listMessageLogs(actor, {}),
    listClients(actor, {}),
    listAppointments(actor, {}),
    canViewPreferences ? listClientCommunicationPreferences(actor) : Promise.resolve([]),
    canViewCampaigns ? listCrmCampaigns(actor, {}) : Promise.resolve([]),
    canViewCampaigns ? listCrmExecutions(actor, {}) : Promise.resolve([]),
  ])

  const selectedTemplate = params.edit
    ? templates.find((template) => template.id === params.edit)
    : undefined
  const selectedPreference = params.editPreference
    ? preferences.find((preference) => preference.clientId === params.editPreference)
    : undefined
  const selectedCampaign = params.editCampaign
    ? campaigns.find((campaign) => campaign.id === params.editCampaign)
    : undefined
  const selectedCampaignCriteria = getCriteriaSnapshot(selectedCampaign?.criteria)
  const preparedRecipients = executions
    .flatMap((execution) =>
      execution.recipients.map((recipient) => ({
        ...recipient,
        campaignName: execution.campaign.name,
        startedAt: execution.startedAt,
      })),
    )
    .filter((recipient) => recipient.status === 'PREPARED')
    .slice(0, 8)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Comunicacao"
        title="Templates, execucao controlada de CRM e trilha auditavel de contatos."
        description="O Bloco 6 amplia o modulo de comunicacao com consentimento, campanhas segmentadas, review booster, recuperacao de inativos, ofertas por perfil e gatilhos pos-servico, sempre com o servidor como autoridade."
        actions={
          <div className="flex flex-wrap gap-3">
            {selectedTemplate ? (
              <Link className="ui-button-secondary" href="/admin/comunicacao">
                Novo template
              </Link>
            ) : null}
            {selectedPreference ? (
              <Link className="ui-button-secondary" href="/admin/comunicacao">
                Nova preferencia
              </Link>
            ) : null}
            {selectedCampaign ? (
              <Link className="ui-button-secondary" href="/admin/comunicacao">
                Nova campanha
              </Link>
            ) : null}
          </div>
        }
      />

      <ActionFlash message={params.message} status={params.status} />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <form action={saveMessageTemplateAction} className="surface-panel rounded-[1.75rem] p-6 space-y-4">
            <input name="templateId" type="hidden" value={selectedTemplate?.id ?? ''} />
            <FormField label="Nome do template">
              <input className="ui-input" defaultValue={selectedTemplate?.name ?? ''} name="name" />
            </FormField>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Canal">
                <select
                  className="ui-input"
                  defaultValue={selectedTemplate?.channel ?? 'WHATSAPP'}
                  name="channel"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">E-mail</option>
                </select>
              </FormField>
              <FormField label="Assunto (e-mail)">
                <input className="ui-input" defaultValue={selectedTemplate?.subject ?? ''} name="subject" />
              </FormField>
            </div>
            <FormField label="Variaveis disponiveis">
              <input
                className="ui-input"
                defaultValue={
                  Array.isArray(selectedTemplate?.availableVariables)
                    ? selectedTemplate.availableVariables.join(', ')
                    : ''
                }
                name="availableVariables"
                placeholder="cliente_nome, pet_nome, horario, ultima_visita, dias_inativo, oferta_nome"
              />
            </FormField>
            <FormField label="Corpo da mensagem">
              <textarea className="ui-input min-h-32" defaultValue={selectedTemplate?.body ?? ''} name="body" />
            </FormField>
            <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--foreground)]">
              <input defaultChecked={selectedTemplate?.active ?? true} name="active" type="checkbox" />
              Template ativo
            </label>
            <button className="ui-button-primary" type="submit">
              {selectedTemplate ? 'Salvar template' : 'Criar template'}
            </button>
          </form>

          <ManualLaunchForm
            appointments={appointments.map((appointment) => ({
              id: appointment.id,
              label: `${appointment.pet.name} - ${formatDateTime(appointment.startAt)}`,
            }))}
            clients={clients.map((client) => ({
              id: client.userId,
              name: client.user.name,
            }))}
            templates={templates.map((template) => ({
              id: template.id,
              name: template.name,
            }))}
          />
        </div>

        <div className="space-y-6">
          <div className="surface-panel rounded-[1.75rem] p-6">
            <DataTable
              columns={[
                {
                  id: 'template',
                  header: 'Template',
                  render: (template) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">{template.name}</p>
                      <p>{template.channel}</p>
                    </div>
                  ),
                },
                {
                  id: 'variables',
                  header: 'Variaveis',
                  render: (template) =>
                    Array.isArray(template.availableVariables)
                      ? template.availableVariables.join(', ')
                      : 'Sem variaveis',
                },
                {
                  id: 'action',
                  header: 'Acao',
                  render: (template) => (
                    <Link
                      className="ui-link text-sm font-semibold"
                      href={{ pathname: '/admin/comunicacao', query: { edit: template.id } }}
                    >
                      Editar
                    </Link>
                  ),
                },
              ]}
              rows={templates}
            />
          </div>

          <div className="surface-panel rounded-[1.75rem] p-6">
            <DataTable
              columns={[
                {
                  id: 'sentAt',
                  header: 'Envio',
                  render: (log) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">{formatDateTime(log.sentAt)}</p>
                      <p>{log.channel}</p>
                    </div>
                  ),
                },
                {
                  id: 'target',
                  header: 'Destino',
                  render: (log) => log.client?.user.name ?? log.appointment?.client.user.name ?? 'Sem cliente',
                },
                {
                  id: 'message',
                  header: 'Mensagem',
                  render: (log) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">{log.deliveryStatus}</p>
                      <p>{log.messageContent}</p>
                    </div>
                  ),
                },
              ]}
              rows={logs}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Consentimento e preferencias</h2>
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
            Opt-in, opt-out e preferencia de canal ficam explicitamente auditados no servidor antes de qualquer preparo de campanha ou gatilho.
          </p>
          {canEditPreferences ? (
            <form action={saveClientCommunicationPreferenceAction} className="space-y-4">
              <FormField label="Tutor">
                <select className="ui-input" defaultValue={selectedPreference?.clientId ?? ''} name="clientId">
                  <option value="">Selecione um tutor</option>
                  {clients.map((client) => (
                    <option key={client.userId} value={client.userId}>
                      {client.user.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  {
                    checked: selectedPreference?.emailOptIn ?? true,
                    label: 'E-mail permitido',
                    name: 'emailOptIn',
                  },
                  {
                    checked: selectedPreference?.whatsappOptIn ?? true,
                    label: 'WhatsApp permitido',
                    name: 'whatsappOptIn',
                  },
                  {
                    checked: selectedPreference?.marketingOptIn ?? false,
                    label: 'Marketing permitido',
                    name: 'marketingOptIn',
                  },
                  {
                    checked: selectedPreference?.reviewOptIn ?? true,
                    label: 'Review booster permitido',
                    name: 'reviewOptIn',
                  },
                  {
                    checked: selectedPreference?.postServiceOptIn ?? true,
                    label: 'Pos-servico permitido',
                    name: 'postServiceOptIn',
                  },
                ].map((option) => (
                  <label
                    className="flex items-center gap-3 rounded-[1rem] border border-[color:var(--line)] px-4 py-3 text-sm font-medium text-[color:var(--foreground)]"
                    key={option.name}
                  >
                    <input defaultChecked={option.checked} name={option.name} type="checkbox" />
                    {option.label}
                  </label>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Fonte do consentimento">
                  <input className="ui-input" defaultValue={selectedPreference?.source ?? ''} name="source" />
                </FormField>
                <FormField label="Observacoes">
                  <input className="ui-input" defaultValue={selectedPreference?.notes ?? ''} name="notes" />
                </FormField>
              </div>
              <button className="ui-button-primary" type="submit">
                Salvar preferencia
              </button>
            </form>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para editar preferencias de contato.
            </p>
          )}
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          {canViewPreferences ? (
            <DataTable
              columns={[
                {
                  id: 'client',
                  header: 'Tutor',
                  render: (preference) => preference.client.user.name,
                },
                {
                  id: 'channels',
                  header: 'Canais',
                  render: (preference) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={preference.emailOptIn ? 'success' : 'warning'}>E-mail</StatusBadge>
                      <StatusBadge tone={preference.whatsappOptIn ? 'success' : 'warning'}>WhatsApp</StatusBadge>
                    </div>
                  ),
                },
                {
                  id: 'marketing',
                  header: 'CRM',
                  render: (preference) => (
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={preference.marketingOptIn ? 'success' : 'warning'}>Campanhas</StatusBadge>
                      <StatusBadge tone={preference.reviewOptIn ? 'success' : 'warning'}>Review</StatusBadge>
                      <StatusBadge tone={preference.postServiceOptIn ? 'success' : 'warning'}>Pos-servico</StatusBadge>
                    </div>
                  ),
                },
                {
                  id: 'action',
                  header: 'Acao',
                  render: (preference) => (
                    <Link
                      className="ui-link text-sm font-semibold"
                      href={{ pathname: '/admin/comunicacao', query: { editPreference: preference.clientId } }}
                    >
                      Editar
                    </Link>
                  ),
                },
              ]}
              rows={preferences}
            />
          ) : (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para visualizar preferencias de contato.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="surface-panel rounded-[1.75rem] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Campanhas e gatilhos controlados</h2>
          <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
            O servidor prepara publico, valida consentimento e registra a execucao. O disparo continua controlado e rastreavel, sem virar plataforma ampla de marketing.
          </p>
          {canEditCampaigns ? (
            <form action={saveCrmCampaignAction} className="space-y-4">
              <input name="campaignId" type="hidden" value={selectedCampaign?.id ?? ''} />
              <FormField label="Nome da campanha">
                <input className="ui-input" defaultValue={selectedCampaign?.name ?? ''} name="name" />
              </FormField>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Tipo">
                  <select className="ui-input" defaultValue={selectedCampaign?.campaignType ?? 'SEGMENTED_CAMPAIGN'} name="type">
                    <option value="REVIEW_BOOSTER">Review booster</option>
                    <option value="SEGMENTED_CAMPAIGN">Campanha segmentada</option>
                    <option value="INACTIVE_RECOVERY">Recuperacao de inativos</option>
                    <option value="PROFILE_OFFER">Oferta por perfil</option>
                    <option value="POST_SERVICE_TRIGGER">Gatilho pos-servico</option>
                  </select>
                </FormField>
                <FormField label="Canal">
                  <select className="ui-input" defaultValue={selectedCampaign?.channel ?? 'WHATSAPP'} name="channel">
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="EMAIL">E-mail</option>
                  </select>
                </FormField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Template">
                  <select className="ui-input" defaultValue={selectedCampaign?.templateId ?? ''} name="templateId">
                    <option value="">Selecione um template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Status">
                  <select className="ui-input" defaultValue={selectedCampaign?.status ?? 'DRAFT'} name="status">
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Descricao">
                <textarea className="ui-input min-h-24" defaultValue={selectedCampaign?.description ?? ''} name="description" />
              </FormField>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Dias de inatividade">
                  <input className="ui-input" defaultValue={selectedCampaignCriteria.inactivityDays ?? ''} name="inactivityDays" />
                </FormField>
                <FormField label="Minimo de atendimentos concluidos">
                  <input className="ui-input" defaultValue={selectedCampaignCriteria.minimumCompletedAppointments ?? ''} name="minimumCompletedAppointments" />
                </FormField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Oferta/perfil">
                  <input className="ui-input" defaultValue={selectedCampaignCriteria.offerName ?? ''} name="offerName" />
                </FormField>
                <FormField label="Racas (separadas por virgula)">
                  <input className="ui-input" defaultValue={selectedCampaignCriteria.breeds?.join(', ') ?? ''} name="breeds" />
                </FormField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Atraso review booster (h)">
                  <input className="ui-input" defaultValue={selectedCampaignCriteria.reviewDelayHours ?? ''} name="reviewDelayHours" />
                </FormField>
                <FormField label="Atraso pos-servico (h)">
                  <input className="ui-input" defaultValue={selectedCampaignCriteria.postServiceDelayHours ?? ''} name="postServiceDelayHours" />
                </FormField>
              </div>
              <FormField label="Porte do pet">
                <div className="grid gap-3 md:grid-cols-3">
                  {['SMALL', 'MEDIUM', 'LARGE', 'GIANT', 'UNKNOWN'].map((value) => (
                    <label className="flex items-center gap-3 text-sm text-[color:var(--foreground)]" key={value}>
                      <input
                        defaultChecked={selectedCampaignCriteria.petSizeCategories?.includes(value)}
                        name="petSizeCategories"
                        type="checkbox"
                        value={value}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </FormField>
              <label className="flex items-center gap-3 text-sm font-medium text-[color:var(--foreground)]">
                <input
                  defaultChecked={selectedCampaignCriteria.onlyClientsWithoutFutureAppointments ?? false}
                  name="onlyClientsWithoutFutureAppointments"
                  type="checkbox"
                />
                Somente clientes sem atendimento futuro
              </label>
              <button className="ui-button-primary" type="submit">
                {selectedCampaign ? 'Salvar campanha' : 'Criar campanha'}
              </button>
            </form>
          ) : (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para editar campanhas.
            </p>
          )}
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          {canViewCampaigns ? (
            <DataTable
              columns={[
                {
                  id: 'campaign',
                  header: 'Campanha',
                  render: (campaign) => (
                    <div>
                      <p className="font-semibold text-[color:var(--foreground)]">{campaign.name}</p>
                      <p>{campaign.campaignType}</p>
                    </div>
                  ),
                },
                {
                  id: 'status',
                  header: 'Status',
                  render: (campaign) => <StatusBadge tone={getStatusTone(campaign.status)}>{campaign.status}</StatusBadge>,
                },
                {
                  id: 'template',
                  header: 'Template',
                  render: (campaign) => campaign.template?.name ?? 'Sem template',
                },
                {
                  id: 'action',
                  header: 'Acao',
                  render: (campaign) => (
                    <div className="space-y-2">
                      <Link
                        className="ui-link text-sm font-semibold"
                        href={{ pathname: '/admin/comunicacao', query: { editCampaign: campaign.id } }}
                      >
                        Editar
                      </Link>
                      {canExecuteCampaigns ? (
                        <form action={prepareCrmCampaignExecutionAction}>
                          <input name="campaignId" type="hidden" value={campaign.id} />
                          <button className="ui-link text-sm font-semibold" type="submit">
                            Preparar execucao
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ),
                },
              ]}
              rows={campaigns}
            />
          ) : (
            <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
              Este perfil nao possui permissao para visualizar campanhas CRM.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Execucoes recentes</h2>
          <div className="mt-4">
            {canViewCampaigns ? (
              <DataTable
                columns={[
                  {
                    id: 'when',
                    header: 'Execucao',
                    render: (execution) => (
                      <div>
                        <p className="font-semibold text-[color:var(--foreground)]">{formatDateTime(execution.startedAt)}</p>
                        <p>{execution.campaign.name}</p>
                      </div>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    render: (execution) => <StatusBadge tone={getStatusTone(execution.status)}>{execution.status}</StatusBadge>,
                  },
                  {
                    id: 'counts',
                    header: 'Contagens',
                    render: (execution) => `Preparados ${execution.preparedCount} - Lancados ${execution.launchedCount} - Descartados ${execution.skippedCount}`,
                  },
                ]}
                rows={executions}
              />
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil nao possui permissao para visualizar execucoes CRM.
              </p>
            )}
          </div>
        </div>

        <div className="surface-panel rounded-[1.75rem] p-6">
          <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Fila preparada para disparo controlado</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">
            Cada destinatario preparado traz criterio, consentimento e mensagem congelada antes da abertura do canal externo.
          </p>
          <div className="mt-4">
            {canExecuteCampaigns ? (
              <DataTable
                columns={[
                  {
                    id: 'recipient',
                    header: 'Destino',
                    render: (recipient) => (
                      <div>
                        <p className="font-semibold text-[color:var(--foreground)]">{recipient.client.user.name}</p>
                        <p>{recipient.campaignName}</p>
                      </div>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    render: (recipient) => <StatusBadge tone={getStatusTone(recipient.status)}>{recipient.status}</StatusBadge>,
                  },
                  {
                    id: 'preparedAt',
                    header: 'Preparado em',
                    render: (recipient) => formatDateTime(recipient.startedAt),
                  },
                  {
                    id: 'action',
                    header: 'Acao',
                    render: (recipient) => <CrmRecipientLaunchButton recipientId={recipient.id} />,
                  },
                ]}
                rows={preparedRecipients}
              />
            ) : (
              <p className="text-sm leading-6 text-[color:var(--foreground-soft)]">
                Este perfil nao possui permissao para executar disparos CRM.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

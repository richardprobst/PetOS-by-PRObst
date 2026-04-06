export const phase2FoundationPermissions = [
  {
    description: 'Permite consultar documentos vinculados a clientes, pets e atendimentos.',
    name: 'documento.visualizar',
  },
  {
    description: 'Permite criar e editar documentos e formularios operacionais.',
    name: 'documento.editar',
  },
  {
    description: 'Permite registrar ou concluir assinaturas vinculadas a documentos.',
    name: 'documento.assinar',
  },
  {
    description: 'Permite ao tutor consultar apenas os proprios documentos protegidos.',
    name: 'documento.visualizar_proprio',
  },
  {
    description: 'Permite ao tutor assinar apenas os proprios documentos protegidos.',
    name: 'documento.assinar_proprio',
  },
  {
    description: 'Permite consultar midias operacionais protegidas.',
    name: 'midia.visualizar',
  },
  {
    description: 'Permite registrar e atualizar midias operacionais protegidas.',
    name: 'midia.editar',
  },
  {
    description: 'Permite ao tutor consultar apenas as proprias midias protegidas.',
    name: 'midia.visualizar_propria',
  },
  {
    description: 'Permite operar depositos e pre-pagamentos na base financeira.',
    name: 'financeiro.deposito.operar',
  },
  {
    description: 'Permite registrar e operar reembolsos na base financeira.',
    name: 'financeiro.reembolso.operar',
  },
  {
    description: 'Permite criar e consumir creditos de cliente na base financeira.',
    name: 'financeiro.credito.operar',
  },
  {
    description: 'Permite consultar documentos e integracoes fiscais da Fase 2.',
    name: 'financeiro.fiscal.visualizar',
  },
  {
    description: 'Permite solicitar e atualizar documentos fiscais da Fase 2.',
    name: 'financeiro.fiscal.operar',
  },
  {
    description: 'Permite consultar eventos de integracao e webhook auditaveis.',
    name: 'integracao.evento.visualizar',
  },
  {
    description: 'Permite reprocessar manualmente eventos de integracao quando autorizado.',
    name: 'integracao.evento.reprocessar',
  },
  {
    description: 'Permite consultar regras de capacidade e agenda avancada.',
    name: 'agenda.capacidade.visualizar',
  },
  {
    description: 'Permite criar e editar regras de capacidade por profissional, porte e raca.',
    name: 'agenda.capacidade.editar',
  },
  {
    description: 'Permite consultar bloqueios operacionais de agenda.',
    name: 'agenda.bloqueio.visualizar',
  },
  {
    description: 'Permite criar e editar bloqueios operacionais de agenda.',
    name: 'agenda.bloqueio.editar',
  },
  {
    description: 'Permite consultar itens da waitlist operacional.',
    name: 'agenda.waitlist.visualizar',
  },
  {
    description: 'Permite criar, cancelar e promover itens da waitlist operacional.',
    name: 'agenda.waitlist.editar',
  },
  {
    description: 'Permite consultar o fluxo operacional de Taxi Dog.',
    name: 'agenda.taxi_dog.visualizar',
  },
  {
    description: 'Permite criar, atualizar e operar o fluxo de Taxi Dog.',
    name: 'agenda.taxi_dog.editar',
  },
] as const

export const phase2TutorPortalPermissions = [
  {
    description: 'Permite ao tutor consultar o proprio consolidado financeiro, depositos, reembolsos e creditos.',
    name: 'financeiro.visualizar_proprio',
  },
  {
    description: 'Permite ao tutor consultar apenas as proprias entradas de waitlist.',
    name: 'agenda.waitlist.visualizar_proprio',
  },
  {
    description: 'Permite ao tutor criar e cancelar apenas as proprias entradas de waitlist.',
    name: 'agenda.waitlist.editar_proprio',
  },
  {
    description: 'Permite ao tutor consultar apenas o proprio fluxo de Taxi Dog.',
    name: 'agenda.taxi_dog.visualizar_proprio',
  },
  {
    description: 'Permite ao tutor consultar o proprio pre-check-in antes do atendimento.',
    name: 'agendamento.pre_check_in.visualizar_proprio',
  },
  {
    description: 'Permite ao tutor preencher ou atualizar o proprio pre-check-in antes do atendimento.',
    name: 'agendamento.pre_check_in.editar_proprio',
  },
] as const

export const phase2CrmPermissions = [
  {
    description: 'Permite consultar preferencias de contato e consentimento para CRM e comunicacao ampliada.',
    name: 'crm.preferencia_contato.visualizar',
  },
  {
    description: 'Permite atualizar preferencias de contato e consentimento para CRM e comunicacao ampliada.',
    name: 'crm.preferencia_contato.editar',
  },
  {
    description: 'Permite consultar campanhas e execucoes de CRM e comunicacao ampliada.',
    name: 'crm.campanha.visualizar',
  },
  {
    description: 'Permite criar e editar campanhas de CRM e comunicacao ampliada.',
    name: 'crm.campanha.editar',
  },
  {
    description: 'Permite preparar e executar campanhas, gatilhos e review booster com rastreabilidade.',
    name: 'crm.campanha.executar',
  },
] as const

export const phase2PosInventoryPermissions = [
  {
    description: 'Permite consultar o catalogo operacional de produtos da Fase 2.',
    name: 'produto.visualizar',
  },
  {
    description: 'Permite criar e editar produtos do catalogo operacional da Fase 2.',
    name: 'produto.editar',
  },
  {
    description: 'Permite consultar saldos e movimentacoes de estoque da Fase 2.',
    name: 'estoque.visualizar',
  },
  {
    description: 'Permite registrar entradas, ajustes e retornos de estoque da Fase 2.',
    name: 'estoque.movimentar',
  },
  {
    description: 'Permite consultar vendas presenciais e pre-vendas do PDV da Fase 2.',
    name: 'pdv.visualizar',
  },
  {
    description: 'Permite criar, concluir e cancelar vendas presenciais e pre-vendas do PDV da Fase 2.',
    name: 'pdv.operar',
  },
] as const

export const phase2TeamOperationsPermissions = [
  {
    description: 'Permite consultar escalas operacionais da equipe na Fase 2.',
    name: 'equipe.escala.visualizar',
  },
  {
    description: 'Permite criar e editar escalas operacionais da equipe na Fase 2.',
    name: 'equipe.escala.editar',
  },
  {
    description: 'Permite consultar registros de ponto e jornada da equipe na Fase 2.',
    name: 'equipe.ponto.visualizar',
  },
  {
    description: 'Permite abrir, fechar e ajustar registros de ponto da equipe na Fase 2.',
    name: 'equipe.ponto.editar',
  },
  {
    description: 'Permite consultar folhas e bases de payroll da equipe na Fase 2.',
    name: 'equipe.folha.visualizar',
  },
  {
    description: 'Permite gerar e fechar folhas e bases de payroll da equipe na Fase 2.',
    name: 'equipe.folha.editar',
  },
] as const

export const phase2FoundationPermissionNames = phase2FoundationPermissions.map(
  (permission) => permission.name,
)

export const phase2TutorPortalPermissionNames = phase2TutorPortalPermissions.map(
  (permission) => permission.name,
)

export const phase2CrmPermissionNames = phase2CrmPermissions.map((permission) => permission.name)
export const phase2PosInventoryPermissionNames = phase2PosInventoryPermissions.map(
  (permission) => permission.name,
)
export const phase2TeamOperationsPermissionNames = phase2TeamOperationsPermissions.map(
  (permission) => permission.name,
)

export const phase2FoundationUnitSettings = [
  {
    defaultValue: '60',
    description:
      'Tempo padrao, em minutos, para expirar solicitacoes de deposito e pre-pagamento sem conciliacao.',
    envVarName: 'DEFAULT_DEPOSIT_EXPIRATION_MINUTES',
    key: 'financeiro.deposito_expiracao_minutos_padrao',
  },
  {
    defaultValue: '180',
    description: 'Validade padrao, em dias, para creditos gerados para clientes.',
    envVarName: 'DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS',
    key: 'financeiro.credito_validade_dias_padrao',
  },
  {
    defaultValue: '180',
    description:
      'Retencao padrao, em dias, para documentos operacionais e registros de assinatura no storage.',
    envVarName: 'DEFAULT_DOCUMENT_RETENTION_DAYS',
    key: 'documentos.retencao_dias_padrao',
  },
  {
    defaultValue: '900',
    description: 'TTL padrao, em segundos, para URLs assinadas de documentos e midias protegidas.',
    envVarName: 'DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS',
    key: 'documentos.url_assinada_ttl_segundos',
  },
  {
    defaultValue: '90',
    description: 'Retencao minima, em dias, para eventos externos e webhooks auditaveis.',
    envVarName: 'DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS',
    key: 'integracoes.eventos_retencao_dias',
  },
  {
    defaultValue: '48',
    description: 'Janela padrao, em horas, para liberar o pre-check-in do tutor antes do atendimento.',
    envVarName: 'DEFAULT_PRE_CHECK_IN_WINDOW_HOURS',
    key: 'agenda.pre_check_in_antecedencia_horas',
  },
  {
    defaultValue: '90',
    description: 'Numero padrao de dias sem atendimento concluido para segmentar clientes inativos.',
    envVarName: 'DEFAULT_CRM_INACTIVE_DAYS',
    key: 'crm.inatividade_dias_padrao',
  },
  {
    defaultValue: '24',
    description: 'Atraso padrao, em horas, para preparar review booster apos atendimento concluido.',
    envVarName: 'DEFAULT_CRM_REVIEW_DELAY_HOURS',
    key: 'crm.review_booster_atraso_horas_padrao',
  },
  {
    defaultValue: '6',
    description: 'Atraso padrao, em horas, para preparar gatilhos pos-servico apos atendimento concluido.',
    envVarName: 'DEFAULT_CRM_POST_SERVICE_DELAY_HOURS',
    key: 'crm.pos_servico_atraso_horas_padrao',
  },
  {
    defaultValue: 'false',
    description: 'Define se a unidade permite saldo negativo ao movimentar estoque ou concluir vendas PDV.',
    envVarName: 'DEFAULT_INVENTORY_ALLOW_NEGATIVE_STOCK',
    key: 'estoque.permitir_saldo_negativo',
  },
  {
    defaultValue: '1',
    description:
      'Estoque minimo padrao aplicado a novos produtos quando a operacao nao informa um valor proprio.',
    envVarName: 'DEFAULT_PRODUCT_MIN_STOCK_QUANTITY',
    key: 'estoque.produto_estoque_minimo_padrao',
  },
  {
    defaultValue: 'false',
    description:
      'Define se o PDV solicita automaticamente documento fiscal minimo ao concluir vendas liquidadas.',
    envVarName: 'DEFAULT_POS_AUTO_FISCAL_DOCUMENT',
    key: 'pdv.emitir_documento_fiscal_automatico',
  },
  {
    defaultValue: '480',
    description: 'Jornada padrao, em minutos, sugerida para escalas e base de payroll da equipe.',
    envVarName: 'DEFAULT_TEAM_SHIFT_MINUTES',
    key: 'equipe.jornada_padrao_minutos',
  },
  {
    defaultValue: '10',
    description: 'Tolerancia padrao, em minutos, para atrasos e antecipacoes no ponto da equipe.',
    envVarName: 'DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES',
    key: 'equipe.ponto_tolerancia_minutos',
  },
  {
    defaultValue: '30',
    description: 'Quantidade padrao de dias sugerida para geracao de folhas na Fase 2.',
    envVarName: 'DEFAULT_PAYROLL_PERIOD_DAYS',
    key: 'equipe.folha.periodo_dias_padrao',
  },
] as const

export const phase2FoundationUnitSettingKeys = phase2FoundationUnitSettings.map((setting) => setting.key)

export const phase2SeedPermissionNames = [
  ...phase2FoundationPermissionNames,
  ...phase2TutorPortalPermissionNames,
  ...phase2CrmPermissionNames,
  ...phase2PosInventoryPermissionNames,
  ...phase2TeamOperationsPermissionNames,
]

export const phase2SeedUnitSettingKeys = [...phase2FoundationUnitSettingKeys]

import type { Environment } from '@/server/env'

export const configurationScopeLabels = {
  INTEGRATION_SECRET: 'Segredo de integracao',
  PUBLIC_BRAND: 'Branding publico',
  SYSTEM_GLOBAL: 'Sistema global',
  TENANT_GLOBAL: 'Tenant global',
  UNIT: 'Unidade',
} as const

export const configurationCategoryLabels = {
  AI: 'IA',
  COMMUNICATION: 'Comunicacao',
  DOMAINS: 'Dominios',
  FINANCE_FISCAL: 'Financeiro e fiscal',
  GENERAL: 'Geral',
  INTEGRATIONS: 'Integracoes',
  OPERATION: 'Operacao',
  PORTAL: 'Portal',
  SECURITY_ACCESS: 'Seguranca e acesso',
  WHITE_LABEL: 'White label',
} as const

export type ConfigurationScopeKey = keyof typeof configurationScopeLabels
export type ConfigurationCategoryKey = keyof typeof configurationCategoryLabels

export type ConfigurationRegistrySource =
  | 'ENVIRONMENT'
  | 'SYSTEM_SETTING'
  | 'UNIT_SETTING'

export type ConfigurationRegistryMutability =
  | 'ADMIN_EDITABLE'
  | 'READ_ONLY_ENVIRONMENT'

export type ConfigurationRegistryValueKind =
  | 'BOOLEAN'
  | 'INTEGER'
  | 'JSON'
  | 'STRING'

export interface ConfigurationRegistryDefinition {
  category: ConfigurationCategoryKey
  criticalChange: boolean
  description: string
  environmentKey?: keyof Environment
  fallbackValue?: string
  key: string
  label: string
  mutability: ConfigurationRegistryMutability
  scope: ConfigurationScopeKey
  source: ConfigurationRegistrySource
  unitSettingKey?: string
  valueKind: ConfigurationRegistryValueKind
}

export const configurationRegistry = [
  {
    category: 'GENERAL',
    criticalChange: false,
    description: 'Nome juridico principal do tenant mantido no centro de configuracoes.',
    fallbackValue: 'PetOS',
    key: 'tenant.identity.company_name',
    label: 'Razao social principal',
    mutability: 'ADMIN_EDITABLE',
    scope: 'TENANT_GLOBAL',
    source: 'SYSTEM_SETTING',
    valueKind: 'STRING',
  },
  {
    category: 'GENERAL',
    criticalChange: false,
    description: 'Nome publico principal do tenant para superficies administrativas e publicas.',
    fallbackValue: 'PetOS',
    key: 'tenant.identity.public_name',
    label: 'Nome publico principal',
    mutability: 'ADMIN_EDITABLE',
    scope: 'TENANT_GLOBAL',
    source: 'SYSTEM_SETTING',
    valueKind: 'STRING',
  },
  {
    category: 'GENERAL',
    criticalChange: true,
    description: 'Timezone default do runtime mantido em ambiente como referencia bloqueada.',
    environmentKey: 'DEFAULT_TIMEZONE',
    key: 'system.runtime.default_timezone',
    label: 'Timezone default do runtime',
    mutability: 'READ_ONLY_ENVIRONMENT',
    scope: 'SYSTEM_GLOBAL',
    source: 'ENVIRONMENT',
    valueKind: 'STRING',
  },
  {
    category: 'FINANCE_FISCAL',
    criticalChange: true,
    description: 'Moeda default do runtime mantida em ambiente como referencia bloqueada.',
    environmentKey: 'DEFAULT_CURRENCY',
    key: 'system.runtime.default_currency',
    label: 'Moeda default do runtime',
    mutability: 'READ_ONLY_ENVIRONMENT',
    scope: 'SYSTEM_GLOBAL',
    source: 'ENVIRONMENT',
    valueKind: 'STRING',
  },
  {
    category: 'OPERATION',
    criticalChange: true,
    description: 'Antecedencia minima para cancelamento sem tratamento administrativo.',
    fallbackValue: '24',
    key: 'agenda.cancelamento_antecedencia_horas',
    label: 'Cancelamento sem custo (horas)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'agenda.cancelamento_antecedencia_horas',
    valueKind: 'INTEGER',
  },
  {
    category: 'OPERATION',
    criticalChange: true,
    description: 'Antecedencia minima para reagendamento automatico.',
    fallbackValue: '24',
    key: 'agenda.reagendamento_antecedencia_horas',
    label: 'Reagendamento automatico (horas)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'agenda.reagendamento_antecedencia_horas',
    valueKind: 'INTEGER',
  },
  {
    category: 'OPERATION',
    criticalChange: true,
    description: 'Tolerancia operacional para caracterizar no-show.',
    fallbackValue: '15',
    key: 'agenda.tolerancia_no_show_minutos',
    label: 'Tolerancia de no-show (minutos)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'agenda.tolerancia_no_show_minutos',
    valueKind: 'INTEGER',
  },
  {
    category: 'OPERATION',
    criticalChange: false,
    description: 'Janela de liberacao do pre-check-in do tutor.',
    fallbackValue: '48',
    key: 'agenda.pre_check_in_antecedencia_horas',
    label: 'Pre-check-in tutor (horas antes)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'agenda.pre_check_in_antecedencia_horas',
    valueKind: 'INTEGER',
  },
  {
    category: 'COMMUNICATION',
    criticalChange: false,
    description: 'Dias de inatividade considerados na segmentacao de CRM.',
    fallbackValue: '90',
    key: 'crm.inatividade_dias_padrao',
    label: 'CRM inatividade (dias)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'crm.inatividade_dias_padrao',
    valueKind: 'INTEGER',
  },
  {
    category: 'COMMUNICATION',
    criticalChange: false,
    description: 'Atraso padrao para preparar review booster apos atendimento.',
    fallbackValue: '24',
    key: 'crm.review_booster_atraso_horas_padrao',
    label: 'Review booster (horas)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'crm.review_booster_atraso_horas_padrao',
    valueKind: 'INTEGER',
  },
  {
    category: 'COMMUNICATION',
    criticalChange: false,
    description: 'Atraso padrao para gatilhos de comunicacao pos-servico.',
    fallbackValue: '6',
    key: 'crm.pos_servico_atraso_horas_padrao',
    label: 'Pos-servico (horas)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'crm.pos_servico_atraso_horas_padrao',
    valueKind: 'INTEGER',
  },
  {
    category: 'FINANCE_FISCAL',
    criticalChange: true,
    description: 'Janela padrao de expiracao de depositos/pre-pagamentos.',
    fallbackValue: '60',
    key: 'financeiro.deposito_expiracao_minutos_padrao',
    label: 'Depositos expiram em (minutos)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'financeiro.deposito_expiracao_minutos_padrao',
    valueKind: 'INTEGER',
  },
  {
    category: 'FINANCE_FISCAL',
    criticalChange: true,
    description: 'Validade default dos creditos concedidos ao cliente.',
    fallbackValue: '180',
    key: 'financeiro.credito_validade_dias_padrao',
    label: 'Credito do cliente (dias)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'financeiro.credito_validade_dias_padrao',
    valueKind: 'INTEGER',
  },
  {
    category: 'INTEGRATIONS',
    criticalChange: true,
    description: 'Retencao minima de eventos de integracao auditaveis.',
    fallbackValue: '90',
    key: 'integracoes.eventos_retencao_dias',
    label: 'Retencao de eventos (dias)',
    mutability: 'ADMIN_EDITABLE',
    scope: 'UNIT',
    source: 'UNIT_SETTING',
    unitSettingKey: 'integracoes.eventos_retencao_dias',
    valueKind: 'INTEGER',
  },
  {
    category: 'INTEGRATIONS',
    criticalChange: true,
    description: 'Provider fiscal em uso no ambiente atual.',
    environmentKey: 'FISCAL_PROVIDER',
    key: 'integracoes.fiscal.provider',
    label: 'Provider fiscal',
    mutability: 'READ_ONLY_ENVIRONMENT',
    scope: 'SYSTEM_GLOBAL',
    source: 'ENVIRONMENT',
    valueKind: 'STRING',
  },
  {
    category: 'INTEGRATIONS',
    criticalChange: true,
    description: 'Provider de e-mail em uso no ambiente atual.',
    environmentKey: 'EMAIL_PROVIDER',
    key: 'integracoes.email.provider',
    label: 'Provider de e-mail',
    mutability: 'READ_ONLY_ENVIRONMENT',
    scope: 'SYSTEM_GLOBAL',
    source: 'ENVIRONMENT',
    valueKind: 'STRING',
  },
  {
    category: 'AI',
    criticalChange: true,
    description: 'Flag de runtime da camada assistiva do assistente virtual.',
    environmentKey: 'AI_VIRTUAL_ASSISTANT_ENABLED',
    key: 'ai.virtual_assistant.enabled',
    label: 'Assistente virtual habilitado',
    mutability: 'READ_ONLY_ENVIRONMENT',
    scope: 'SYSTEM_GLOBAL',
    source: 'ENVIRONMENT',
    valueKind: 'BOOLEAN',
  },
  {
    category: 'AI',
    criticalChange: true,
    description: 'Quota base da camada assistiva do assistente virtual.',
    environmentKey: 'AI_VIRTUAL_ASSISTANT_BASE_QUOTA',
    key: 'ai.virtual_assistant.base_quota',
    label: 'Quota base do assistente virtual',
    mutability: 'READ_ONLY_ENVIRONMENT',
    scope: 'SYSTEM_GLOBAL',
    source: 'ENVIRONMENT',
    valueKind: 'INTEGER',
  },
  {
    category: 'AI',
    criticalChange: true,
    description: 'Flag da analise assistiva de imagem lida do runtime.',
    environmentKey: 'AI_IMAGE_ANALYSIS_ENABLED',
    key: 'ai.image_analysis.enabled',
    label: 'Analise de imagem habilitada',
    mutability: 'READ_ONLY_ENVIRONMENT',
    scope: 'SYSTEM_GLOBAL',
    source: 'ENVIRONMENT',
    valueKind: 'BOOLEAN',
  },
  {
    category: 'AI',
    criticalChange: true,
    description: 'Flag de snapshots preditivos lida do runtime.',
    environmentKey: 'AI_PREDICTIVE_INSIGHTS_ENABLED',
    key: 'ai.predictive_insights.enabled',
    label: 'Insights preditivos habilitados',
    mutability: 'READ_ONLY_ENVIRONMENT',
    scope: 'SYSTEM_GLOBAL',
    source: 'ENVIRONMENT',
    valueKind: 'BOOLEAN',
  },
  {
    category: 'PORTAL',
    criticalChange: false,
    description: 'Modo de experiencia atual do assistente virtual no portal do tutor.',
    fallbackValue: 'TRANSCRIPT_ONLY_ASSISTED',
    key: 'portal.tutor.assistant_experience_mode',
    label: 'Modo do assistente do tutor',
    mutability: 'ADMIN_EDITABLE',
    scope: 'TENANT_GLOBAL',
    source: 'SYSTEM_SETTING',
    valueKind: 'STRING',
  },
  {
    category: 'SECURITY_ACCESS',
    criticalChange: true,
    description: 'Exige trilha reforcada para mudancas criticas da configuracao central.',
    fallbackValue: 'true',
    key: 'security.configuration.approval_required_for_critical_changes',
    label: 'Aprovacao obrigatoria para mudancas criticas',
    mutability: 'ADMIN_EDITABLE',
    scope: 'SYSTEM_GLOBAL',
    source: 'SYSTEM_SETTING',
    valueKind: 'BOOLEAN',
  },
  {
    category: 'WHITE_LABEL',
    criticalChange: true,
    description: 'Nome publico base da marca para a fundacao de white label.',
    fallbackValue: 'PetOS',
    key: 'branding.public.brand_name',
    label: 'Nome publico da marca',
    mutability: 'ADMIN_EDITABLE',
    scope: 'PUBLIC_BRAND',
    source: 'SYSTEM_SETTING',
    valueKind: 'STRING',
  },
  {
    category: 'DOMAINS',
    criticalChange: true,
    description: 'Dominio principal planejado para a camada de white label.',
    key: 'branding.primary_domain',
    label: 'Dominio principal',
    mutability: 'ADMIN_EDITABLE',
    scope: 'PUBLIC_BRAND',
    source: 'SYSTEM_SETTING',
    valueKind: 'STRING',
  },
] as const satisfies readonly ConfigurationRegistryDefinition[]

export function getConfigurationScopeLabel(scope: ConfigurationScopeKey) {
  return configurationScopeLabels[scope]
}

export function getConfigurationCategoryLabel(category: ConfigurationCategoryKey) {
  return configurationCategoryLabels[category]
}

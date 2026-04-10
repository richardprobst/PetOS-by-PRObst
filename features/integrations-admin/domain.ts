import type {
  ConfigurationScope,
  IntegrationConnectionStatus,
  IntegrationHealthStatus,
} from '@prisma/client'

export const integrationProviderKeys = [
  'STRIPE',
  'MERCADO_PAGO',
  'FISCAL',
  'SMTP',
  'STORAGE',
  'OPENAI',
  'GEMINI',
] as const

export type IntegrationProviderKey = (typeof integrationProviderKeys)[number]

export interface IntegrationCatalogEntry {
  allowedScopes: readonly ConfigurationScope[]
  configFields: ReadonlyArray<{
    key: string
    label: string
    placeholder?: string
    required: boolean
  }>
  defaultDisplayName: string
  healthSummary: string
  providerKey: IntegrationProviderKey
  secretFields: ReadonlyArray<{
    key: string
    label: string
    required: boolean
  }>
}

export const integrationCatalog: Readonly<Record<IntegrationProviderKey, IntegrationCatalogEntry>> =
  {
    FISCAL: {
      allowedScopes: ['SYSTEM_GLOBAL', 'UNIT'],
      configFields: [
        {
          key: 'baseUrl',
          label: 'Base URL',
          placeholder: 'https://api.provedor-fiscal.com',
          required: false,
        },
        {
          key: 'issuerCode',
          label: 'Codigo do emissor',
          required: false,
        },
      ],
      defaultDisplayName: 'Provider fiscal',
      healthSummary: 'Verifica configuracao funcional e token armazenado.',
      providerKey: 'FISCAL',
      secretFields: [
        {
          key: 'apiToken',
          label: 'API token',
          required: false,
        },
      ],
    },
    GEMINI: {
      allowedScopes: ['SYSTEM_GLOBAL'],
      configFields: [],
      defaultDisplayName: 'Gemini',
      healthSummary: 'Verifica apenas readiness administrativa do provider de IA.',
      providerKey: 'GEMINI',
      secretFields: [
        {
          key: 'apiKey',
          label: 'API key',
          required: false,
        },
      ],
    },
    MERCADO_PAGO: {
      allowedScopes: ['SYSTEM_GLOBAL', 'UNIT'],
      configFields: [
        {
          key: 'publicKey',
          label: 'Public key',
          required: false,
        },
      ],
      defaultDisplayName: 'Mercado Pago',
      healthSummary:
        'Valida identificadores publicos, token de acesso e readiness do ambiente.',
      providerKey: 'MERCADO_PAGO',
      secretFields: [
        {
          key: 'accessToken',
          label: 'Access token',
          required: false,
        },
        {
          key: 'webhookSecret',
          label: 'Webhook secret',
          required: false,
        },
      ],
    },
    OPENAI: {
      allowedScopes: ['SYSTEM_GLOBAL'],
      configFields: [],
      defaultDisplayName: 'OpenAI',
      healthSummary: 'Verifica readiness administrativa do provider de IA.',
      providerKey: 'OPENAI',
      secretFields: [
        {
          key: 'apiKey',
          label: 'API key',
          required: false,
        },
      ],
    },
    SMTP: {
      allowedScopes: ['SYSTEM_GLOBAL'],
      configFields: [
        {
          key: 'host',
          label: 'SMTP host',
          required: false,
        },
        {
          key: 'port',
          label: 'SMTP port',
          required: false,
        },
        {
          key: 'username',
          label: 'SMTP user',
          required: false,
        },
        {
          key: 'fromEmail',
          label: 'E-mail remetente',
          required: false,
        },
        {
          key: 'fromName',
          label: 'Nome remetente',
          required: false,
        },
      ],
      defaultDisplayName: 'SMTP',
      healthSummary: 'Valida host, porta e senha cadastrados no centro administrativo.',
      providerKey: 'SMTP',
      secretFields: [
        {
          key: 'password',
          label: 'SMTP password',
          required: false,
        },
      ],
    },
    STORAGE: {
      allowedScopes: ['SYSTEM_GLOBAL'],
      configFields: [
        {
          key: 'bucket',
          label: 'Bucket',
          required: false,
        },
        {
          key: 'region',
          label: 'Regiao',
          required: false,
        },
        {
          key: 'endpoint',
          label: 'Endpoint',
          required: false,
        },
        {
          key: 'publicBaseUrl',
          label: 'Base publica',
          required: false,
        },
      ],
      defaultDisplayName: 'Storage',
      healthSummary: 'Valida bucket, endpoint e credenciais administrativas.',
      providerKey: 'STORAGE',
      secretFields: [
        {
          key: 'accessKey',
          label: 'Access key',
          required: false,
        },
        {
          key: 'secretKey',
          label: 'Secret key',
          required: false,
        },
      ],
    },
    STRIPE: {
      allowedScopes: ['SYSTEM_GLOBAL', 'UNIT'],
      configFields: [
        {
          key: 'publishableKey',
          label: 'Publishable key',
          required: false,
        },
      ],
      defaultDisplayName: 'Stripe',
      healthSummary:
        'Valida chaves operacionais e readiness basico do gateway para o escopo escolhido.',
      providerKey: 'STRIPE',
      secretFields: [
        {
          key: 'secretKey',
          label: 'Secret key',
          required: false,
        },
        {
          key: 'webhookSecret',
          label: 'Webhook secret',
          required: false,
        },
      ],
    },
  }

export interface IntegrationConnectionSnapshot {
  active: boolean
  configEntries: Array<{
    key: string
    label: string
    value: string | null
  }>
  displayName: string
  environmentSummary: string | null
  healthStatus: IntegrationHealthStatus
  id: string
  lastError: string | null
  lastTestedAt: Date | null
  providerKey: IntegrationProviderKey
  scope: ConfigurationScope
  secretEntries: Array<{
    key: string
    label: string
    maskedValue: string | null
    updatedAt: Date | null
  }>
  status: IntegrationConnectionStatus
  unitId: string | null
}

export function getIntegrationCatalogEntry(providerKey: string) {
  if (providerKey in integrationCatalog) {
    return integrationCatalog[providerKey as IntegrationProviderKey]
  }

  return null
}

export function maskSecretValue(secret: string) {
  const trimmed = secret.trim()

  if (trimmed.length <= 4) {
    return '*'.repeat(Math.max(trimmed.length, 1))
  }

  return `${trimmed.slice(0, 2)}${'*'.repeat(Math.max(trimmed.length - 4, 2))}${trimmed.slice(-2)}`
}

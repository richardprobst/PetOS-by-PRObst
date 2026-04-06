import { z } from 'zod'

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const optionalString = z.preprocess(emptyStringToUndefined, z.string().min(1).optional())
const optionalUrl = z.preprocess(emptyStringToUndefined, z.string().url().optional())
const optionalEmail = z.preprocess(emptyStringToUndefined, z.string().email().optional())
const envBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value
  }

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return value
}, z.boolean())

const numberFromEnv = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value
    }

    return Number(value)
  }, schema)

const positiveInteger = numberFromEnv(z.number().int().positive())
const nonNegativeInteger = numberFromEnv(z.number().int().nonnegative())

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().min(1),
    APP_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
    INSTALLER_ENABLED: envBoolean.default(false),
    INSTALLER_BOOTSTRAP_TOKEN: optionalString,
    ADMIN_SEED_NAME: optionalString,
    ADMIN_SEED_EMAIL: optionalEmail,
    ADMIN_SEED_PASSWORD: optionalString,
    UPLOAD_MAX_FILE_SIZE_MB: positiveInteger.default(10),
    UPLOAD_ALLOWED_MIME_TYPES: z.string().min(1),
    STORAGE_BUCKET: z.string().min(1),
    STORAGE_REGION: z.string().min(1),
    STORAGE_ENDPOINT: optionalString,
    STORAGE_ACCESS_KEY: optionalString,
    STORAGE_SECRET_KEY: optionalString,
    STORAGE_PUBLIC_BASE_URL: optionalUrl,
    FISCAL_PROVIDER: optionalString,
    FISCAL_API_BASE_URL: optionalUrl,
    FISCAL_API_TOKEN: optionalString,
    MERCADO_PAGO_ACCESS_TOKEN: optionalString,
    MERCADO_PAGO_PUBLIC_KEY: optionalString,
    MERCADO_PAGO_WEBHOOK_SECRET: optionalString,
    STRIPE_SECRET_KEY: optionalString,
    STRIPE_PUBLISHABLE_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    EMAIL_PROVIDER: optionalString,
    EMAIL_FROM_NAME: z.string().min(1),
    EMAIL_FROM_ADDRESS: z.string().email(),
    SMTP_HOST: optionalString,
    SMTP_PORT: positiveInteger.default(587),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    SMTP_SECURE: envBoolean.default(false),
    OPENAI_API_KEY: optionalString,
    GEMINI_API_KEY: optionalString,
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    RATE_LIMIT_ENABLED: envBoolean.default(true),
    RATE_LIMIT_WINDOW_MS: positiveInteger.default(60000),
    RATE_LIMIT_MAX_REQUESTS: positiveInteger.default(100),
    DEFAULT_CANCELLATION_WINDOW_HOURS: nonNegativeInteger.default(24),
    DEFAULT_RESCHEDULE_WINDOW_HOURS: nonNegativeInteger.default(24),
    DEFAULT_NO_SHOW_TOLERANCE_MINUTES: nonNegativeInteger.default(15),
    DEFAULT_PRE_CHECK_IN_WINDOW_HOURS: nonNegativeInteger.default(48),
    DEFAULT_DEPOSIT_EXPIRATION_MINUTES: nonNegativeInteger.default(60),
    DEFAULT_CLIENT_CREDIT_EXPIRATION_DAYS: nonNegativeInteger.default(180),
    DEFAULT_DOCUMENT_RETENTION_DAYS: nonNegativeInteger.default(180),
    DEFAULT_DOCUMENT_SIGNED_URL_TTL_SECONDS: positiveInteger.default(900),
    DEFAULT_CRM_INACTIVE_DAYS: nonNegativeInteger.default(90),
    DEFAULT_CRM_REVIEW_DELAY_HOURS: nonNegativeInteger.default(24),
    DEFAULT_CRM_POST_SERVICE_DELAY_HOURS: nonNegativeInteger.default(6),
    DEFAULT_INVENTORY_ALLOW_NEGATIVE_STOCK: envBoolean.default(false),
    DEFAULT_PRODUCT_MIN_STOCK_QUANTITY: nonNegativeInteger.default(1),
    DEFAULT_POS_AUTO_FISCAL_DOCUMENT: envBoolean.default(false),
    DEFAULT_TEAM_SHIFT_MINUTES: positiveInteger.default(480),
    DEFAULT_TIME_CLOCK_TOLERANCE_MINUTES: nonNegativeInteger.default(10),
    DEFAULT_PAYROLL_PERIOD_DAYS: positiveInteger.default(30),
    DEFAULT_INTEGRATION_EVENT_RETENTION_DAYS: positiveInteger.default(90),
    DEFAULT_CURRENCY: z.string().min(3),
    DEFAULT_TIMEZONE: z.string().min(1),
  })
  .superRefine((environment, context) => {
    if (!environment.INSTALLER_ENABLED) {
      return
    }

    if (!environment.INSTALLER_BOOTSTRAP_TOKEN || environment.INSTALLER_BOOTSTRAP_TOKEN.length < 32) {
      context.addIssue({
        code: 'custom',
        message:
          'INSTALLER_BOOTSTRAP_TOKEN must be configured with at least 32 characters when INSTALLER_ENABLED is true.',
        path: ['INSTALLER_BOOTSTRAP_TOKEN'],
      })
    }
  })

export type Environment = z.infer<typeof envSchema>

export function parseEnvironment(rawEnvironment: NodeJS.ProcessEnv): Environment {
  return envSchema.parse(rawEnvironment)
}

let cachedEnvironment: Environment | undefined

export function getEnv(): Environment {
  if (!cachedEnvironment) {
    cachedEnvironment = parseEnvironment(process.env)
  }

  return cachedEnvironment
}

export function resetEnvironmentCacheForTests() {
  cachedEnvironment = undefined
}

import type { Environment } from '../env'

export interface ReadinessIssue {
  level: 'warn' | 'fail'
  message: string
}

const loopbackHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

function isLocalHostname(hostname: string) {
  return loopbackHosts.has(hostname) || hostname.endsWith('.local')
}

function isPlaceholderHostname(hostname: string) {
  return hostname === 'example.com' || hostname.endsWith('.example.com')
}

function isSecureHttp(url: URL) {
  return url.protocol === 'https:'
}

function hasPlaceholderSecret(secret: string) {
  const normalized = secret.trim().toLowerCase()
  return normalized.includes('replace_with') || normalized.includes('changeme')
}

function parseDatabaseHostname(connectionString: string) {
  try {
    return new URL(connectionString).hostname
  } catch {
    return ''
  }
}

export function evaluateStagingEnvironment(environment: Environment): ReadinessIssue[] {
  const issues: ReadinessIssue[] = []

  const appUrl = new URL(environment.APP_URL)
  const publicAppUrl = new URL(environment.NEXT_PUBLIC_APP_URL)
  const authUrl = new URL(environment.NEXTAUTH_URL)

  if (environment.NODE_ENV !== 'production') {
    issues.push({
      level: 'warn',
      message: 'NODE_ENV should usually be set to production in staging.',
    })
  }

  if (appUrl.origin !== publicAppUrl.origin || appUrl.origin !== authUrl.origin) {
    issues.push({
      level: 'fail',
      message: 'APP_URL, NEXT_PUBLIC_APP_URL, and NEXTAUTH_URL must share the same origin.',
    })
  }

  if (!isSecureHttp(appUrl) || !isSecureHttp(publicAppUrl) || !isSecureHttp(authUrl)) {
    issues.push({
      level: 'fail',
      message: 'Staging URLs must use HTTPS.',
    })
  }

  if (
    isLocalHostname(appUrl.hostname) ||
    isLocalHostname(publicAppUrl.hostname) ||
    isLocalHostname(authUrl.hostname)
  ) {
    issues.push({
      level: 'fail',
      message: 'Staging URLs cannot point to localhost, loopback, or .local domains.',
    })
  }

  if (
    isPlaceholderHostname(appUrl.hostname) ||
    isPlaceholderHostname(publicAppUrl.hostname) ||
    isPlaceholderHostname(authUrl.hostname)
  ) {
    issues.push({
      level: 'fail',
      message: 'Replace example.com placeholders before using staging configuration.',
    })
  }

  if (environment.NEXTAUTH_SECRET.trim().length < 32 || hasPlaceholderSecret(environment.NEXTAUTH_SECRET)) {
    issues.push({
      level: 'fail',
      message: 'NEXTAUTH_SECRET must be a non-placeholder secret with at least 32 characters for staging.',
    })
  }

  const databaseHostnames = [
    parseDatabaseHostname(environment.DATABASE_URL),
    parseDatabaseHostname(environment.DIRECT_DATABASE_URL),
  ]

  if (databaseHostnames.some((hostname) => hostname === '' || isLocalHostname(hostname))) {
    issues.push({
      level: 'fail',
      message: 'DATABASE_URL and DIRECT_DATABASE_URL must point to a non-local MySQL host in staging.',
    })
  }

  const hasAnyFiscalConfiguration = Boolean(
    environment.FISCAL_PROVIDER || environment.FISCAL_API_BASE_URL || environment.FISCAL_API_TOKEN,
  )

  if (
    hasAnyFiscalConfiguration &&
    (!environment.FISCAL_PROVIDER || !environment.FISCAL_API_BASE_URL || !environment.FISCAL_API_TOKEN)
  ) {
    issues.push({
      level: 'fail',
      message:
        'FISCAL_PROVIDER, FISCAL_API_BASE_URL, and FISCAL_API_TOKEN must be configured together when fiscal integration is enabled.',
    })
  }

  const hasAnyStripeConfiguration = Boolean(
    environment.STRIPE_SECRET_KEY ||
      environment.STRIPE_PUBLISHABLE_KEY ||
      environment.STRIPE_WEBHOOK_SECRET,
  )

  if (
    hasAnyStripeConfiguration &&
    (!environment.STRIPE_SECRET_KEY || !environment.STRIPE_WEBHOOK_SECRET)
  ) {
    issues.push({
      level: 'fail',
      message:
        'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be configured together when Stripe integration is enabled.',
    })
  }

  const hasAnyMercadoPagoConfiguration = Boolean(
    environment.MERCADO_PAGO_ACCESS_TOKEN ||
      environment.MERCADO_PAGO_PUBLIC_KEY ||
      environment.MERCADO_PAGO_WEBHOOK_SECRET,
  )

  if (
    hasAnyMercadoPagoConfiguration &&
    (!environment.MERCADO_PAGO_ACCESS_TOKEN || !environment.MERCADO_PAGO_WEBHOOK_SECRET)
  ) {
    issues.push({
      level: 'fail',
      message:
        'MERCADO_PAGO_ACCESS_TOKEN and MERCADO_PAGO_WEBHOOK_SECRET must be configured together when Mercado Pago integration is enabled.',
    })
  }

  return issues
}

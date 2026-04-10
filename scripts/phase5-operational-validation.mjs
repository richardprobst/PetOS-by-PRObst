const validationUrl =
  process.env.PHASE5_VALIDATION_URL ??
  process.env.APP_URL ??
  process.env.NEXTAUTH_URL
const validationEmail =
  process.env.PHASE5_VALIDATION_EMAIL ?? process.env.ADMIN_SEED_EMAIL
const validationPassword =
  process.env.PHASE5_VALIDATION_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD

if (!validationUrl) {
  console.error('Missing PHASE5_VALIDATION_URL, APP_URL or NEXTAUTH_URL.')
  process.exit(1)
}

if (!validationEmail || !validationPassword) {
  console.error(
    'Missing PHASE5 validation credentials. Set PHASE5_VALIDATION_EMAIL/PHASE5_VALIDATION_PASSWORD or ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD.',
  )
  process.exit(1)
}

const baseUrl = new URL(validationUrl)
const cookieJar = []

function storeCookies(response) {
  const rawCookies = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : response.headers.get('set-cookie')
      ? [response.headers.get('set-cookie')]
      : []

  for (const cookie of rawCookies) {
    const serialized = cookie.split(';')[0]
    const [name] = serialized.split('=')
    const existingIndex = cookieJar.findIndex((entry) =>
      entry.startsWith(`${name}=`),
    )

    if (existingIndex >= 0) {
      cookieJar[existingIndex] = serialized
    } else {
      cookieJar.push(serialized)
    }
  }
}

function createHeaders(extraHeaders = {}) {
  return {
    cookie: cookieJar.join('; '),
    ...extraHeaders,
  }
}

async function request(pathname, options = {}) {
  const response = await fetch(new URL(pathname, baseUrl), {
    redirect: 'manual',
    ...options,
    headers: createHeaders(options.headers ?? {}),
  })
  storeCookies(response)
  return response
}

async function authenticate() {
  const csrfResponse = await request('/api/auth/csrf')
  const csrfPayload = await csrfResponse.json()

  const loginBody = new URLSearchParams({
    callbackUrl: new URL('/admin', baseUrl).toString(),
    csrfToken: csrfPayload.csrfToken,
    email: validationEmail,
    json: 'true',
    password: validationPassword,
  })

  await request('/api/auth/callback/credentials', {
    body: loginBody,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  if (
    !cookieJar.some(
      (cookie) =>
        cookie.startsWith('__Secure-next-auth.session-token=') ||
        cookie.startsWith('next-auth.session-token='),
    )
  ) {
    throw new Error('Unable to establish an authenticated NextAuth session.')
  }
}

function printStep(message) {
  console.log(`- ${message}`)
}

const warnings = []
const failures = []

function registerWarning(message) {
  warnings.push(message)
  console.warn(`WARNING: ${message}`)
}

function registerFailure(message) {
  failures.push(message)
  console.error(`FAIL: ${message}`)
}

async function assertUnauthenticatedRedirect() {
  const response = await fetch(new URL('/admin/configuracoes', baseUrl), {
    redirect: 'manual',
  })
  const location = response.headers.get('location')

  if (response.status !== 307 || !location?.includes('/entrar')) {
    registerFailure(
      `Expected unauthenticated /admin/configuracoes to redirect to /entrar, received ${response.status} ${location ?? ''}.`,
    )
    return
  }

  printStep('Unauthenticated redirect to /entrar is working for /admin/configuracoes.')
}

async function assertHtmlPage(pathname, options = {}) {
  const response = await request(pathname, options)
  const html = await response.text()

  if (response.status !== 200) {
    registerFailure(`Expected ${pathname} to return 200, received ${response.status}.`)
    return null
  }

  if (/<h1[^>]*>Application error/i.test(html)) {
    registerFailure(`The page ${pathname} rendered a Next.js application error boundary.`)
    return null
  }

  printStep(`${pathname} returned 200 without application error markup.`)
  return html
}

async function assertJsonRoute(pathname) {
  const response = await request(pathname)

  if (response.status !== 200) {
    registerFailure(`Expected ${pathname} to return 200, received ${response.status}.`)
    return null
  }

  const payload = await response.json()
  printStep(`${pathname} returned 200.`)
  return payload
}

function inspectConfigurationCenter(adminHtml, settingsCenterPayload) {
  if (!adminHtml.includes('/admin/configuracoes')) {
    registerFailure('The admin shell did not expose the /admin/configuracoes navigation entry.')
  } else {
    printStep('The admin shell exposes /admin/configuracoes in the rendered HTML.')
  }

  const brandingPermissions = settingsCenterPayload?.data?.configurationCenter?.branding?.permissions
  const integrationPermissions =
    settingsCenterPayload?.data?.configurationCenter?.integrations?.permissions

  if (!brandingPermissions?.canEditWhiteLabel) {
    registerFailure('Branding editor is not enabled for the administrative session.')
  } else {
    printStep('Branding editor is enabled for the administrative session.')
  }

  if (!integrationPermissions?.canEdit) {
    registerFailure('Integration editor is not enabled for the administrative session.')
  } else {
    printStep('Integration editor is enabled for the administrative session.')
  }
}

function inspectStorageWarnings(payload, label, paths) {
  const storage = paths.reduce((current, path) => current?.[path], payload)

  if (!storage || typeof storage !== 'object') {
    registerWarning(`${label} did not expose a storage status block.`)
    return
  }

  for (const [key, value] of Object.entries(storage)) {
    if (value === 'MIGRATION_PENDING') {
      registerWarning(`${label}.${key} is MIGRATION_PENDING in the published environment.`)
    }
  }
}

async function main() {
  console.log(`Phase 5 operational validation against ${baseUrl.origin}`)
  await assertUnauthenticatedRedirect()
  await authenticate()
  printStep('Credential login completed successfully.')

  const adminHtml = await assertHtmlPage('/admin')
  const settingsHtml = await assertHtmlPage('/admin/configuracoes')
  await assertHtmlPage('/admin/sistema')

  const settingsFoundation = await assertJsonRoute('/api/admin/settings/foundation')
  const settingsCenter = await assertJsonRoute('/api/admin/settings/center')
  const branding = await assertJsonRoute('/api/admin/branding')
  const integrations = await assertJsonRoute('/api/admin/integrations')

  if (adminHtml && settingsCenter) {
    inspectConfigurationCenter(adminHtml, settingsCenter)
  }

  if (settingsHtml && !/Centro administrativo|Configuracoes/i.test(settingsHtml)) {
    registerWarning(
      'The settings page HTML does not contain the expected heading marker. Review the rendered markup manually.',
    )
  }

  inspectStorageWarnings(settingsFoundation, 'settings.foundation.storage', [
    'data',
    'configuration',
    'storage',
  ])
  inspectStorageWarnings(settingsCenter, 'settings.center.branding.storage', [
    'data',
    'configurationCenter',
    'branding',
    'storage',
  ])
  inspectStorageWarnings(settingsCenter, 'settings.center.integrations.storage', [
    'data',
    'configurationCenter',
    'integrations',
    'storage',
  ])
  inspectStorageWarnings(branding, 'branding.storage', ['data', 'branding', 'storage'])
  inspectStorageWarnings(integrations, 'integrations.storage', [
    'data',
    'integrations',
    'storage',
  ])

  console.log('\nSummary')
  console.log(`- failures: ${failures.length}`)
  console.log(`- warnings: ${warnings.length}`)

  for (const warning of warnings) {
    console.log(`  warning: ${warning}`)
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.log(`  failure: ${failure}`)
    }
    process.exit(1)
  }
}

await main()

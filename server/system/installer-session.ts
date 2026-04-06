import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { getEnv, type Environment } from '@/server/env'
import { AppError } from '@/server/http/errors'

export const INSTALLER_SESSION_COOKIE_NAME = 'petos_installer_session'
const INSTALLER_SESSION_TTL_MS = 30 * 60 * 1000

interface InstallerSessionPayload {
  exp: number
  purpose: 'installer'
}

export interface InstallerSessionSnapshot {
  active: boolean
  expiresAt: number | null
}

function getInstallerSigningKey(environment: Environment) {
  return `${environment.NEXTAUTH_SECRET}:${environment.INSTALLER_BOOTSTRAP_TOKEN ?? ''}`
}

function signInstallerSession(encodedPayload: string, environment: Environment) {
  return createHmac('sha256', getInstallerSigningKey(environment))
    .update(encodedPayload)
    .digest('base64url')
}

function decodeInstallerSessionPayload(encodedPayload: string) {
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))

    if (
      typeof payload !== 'object' ||
      payload === null ||
      payload.purpose !== 'installer' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }

    return payload as InstallerSessionPayload
  } catch {
    return null
  }
}

function signaturesMatch(expected: string, provided: string) {
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}

export function verifyInstallerBootstrapToken(
  providedToken: string | null | undefined,
  environment: Environment = getEnv(),
) {
  if (!environment.INSTALLER_ENABLED) {
    return false
  }

  if (!providedToken || !environment.INSTALLER_BOOTSTRAP_TOKEN) {
    return false
  }

  return signaturesMatch(environment.INSTALLER_BOOTSTRAP_TOKEN, providedToken)
}

export function createInstallerSessionCookieValue(
  environment: Environment = getEnv(),
  now = Date.now(),
) {
  if (!environment.INSTALLER_ENABLED || !environment.INSTALLER_BOOTSTRAP_TOKEN) {
    throw new AppError('FORBIDDEN', 403, 'Installer mode is not available for this environment.')
  }

  const encodedPayload = Buffer.from(
    JSON.stringify({
      exp: now + INSTALLER_SESSION_TTL_MS,
      purpose: 'installer',
    } satisfies InstallerSessionPayload),
  ).toString('base64url')

  return `${encodedPayload}.${signInstallerSession(encodedPayload, environment)}`
}

export function readInstallerSessionCookieValue(
  cookieValue: string | null | undefined,
  environment: Environment = getEnv(),
  now = Date.now(),
): InstallerSessionPayload | null {
  if (!cookieValue || !environment.INSTALLER_ENABLED || !environment.INSTALLER_BOOTSTRAP_TOKEN) {
    return null
  }

  const [encodedPayload, providedSignature] = cookieValue.split('.')

  if (!encodedPayload || !providedSignature) {
    return null
  }

  const expectedSignature = signInstallerSession(encodedPayload, environment)

  if (!signaturesMatch(expectedSignature, providedSignature)) {
    return null
  }

  const payload = decodeInstallerSessionPayload(encodedPayload)

  if (!payload || payload.exp <= now) {
    return null
  }

  return payload
}

export async function establishInstallerSession(environment: Environment = getEnv()) {
  const cookieStore = await cookies()
  const cookieValue = createInstallerSessionCookieValue(environment)

  cookieStore.set(INSTALLER_SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    maxAge: INSTALLER_SESSION_TTL_MS / 1000,
    path: '/',
    sameSite: 'strict',
    secure: environment.NODE_ENV === 'production',
  })
}

export async function clearInstallerSession() {
  const cookieStore = await cookies()

  cookieStore.delete(INSTALLER_SESSION_COOKIE_NAME)
}

export async function getInstallerSessionSnapshot(
  environment: Environment = getEnv(),
): Promise<InstallerSessionSnapshot> {
  const cookieStore = await cookies()
  const payload = readInstallerSessionCookieValue(
    cookieStore.get(INSTALLER_SESSION_COOKIE_NAME)?.value,
    environment,
  )

  if (!payload) {
    return {
      active: false,
      expiresAt: null,
    }
  }

  return {
    active: true,
    expiresAt: payload.exp,
  }
}

export async function assertInstallerSessionAccess(environment: Environment = getEnv()) {
  if (!environment.INSTALLER_ENABLED) {
    throw new AppError('FORBIDDEN', 403, 'Installer mode is disabled for this environment.')
  }

  const session = await getInstallerSessionSnapshot(environment)

  if (!session.active) {
    throw new AppError('FORBIDDEN', 403, 'A valid installer session is required.')
  }

  return session
}

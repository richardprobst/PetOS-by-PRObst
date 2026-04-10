import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

function getSecretMasterKeyMaterial() {
  const environment = getEnv()
  const configuredKey = environment.CONFIGURATION_SECRET_MASTER_KEY

  if (configuredKey && configuredKey.trim() !== '') {
    return {
      source: 'CONFIGURATION_SECRET_MASTER_KEY' as const,
      value: configuredKey.trim(),
    }
  }

  if (environment.NEXTAUTH_SECRET.trim() !== '') {
    return {
      source: 'NEXTAUTH_SECRET_FALLBACK' as const,
      value: environment.NEXTAUTH_SECRET.trim(),
    }
  }

  throw new AppError(
    'SERVICE_UNAVAILABLE',
    503,
    'No environment master key is available to protect administrative integration secrets.',
  )
}

function deriveEncryptionKey() {
  const material = getSecretMasterKeyMaterial()
  const derivedKey = createHash('sha256').update(material.value).digest()

  return {
    key: derivedKey,
    source: material.source,
  }
}

function base64UrlEncode(value: Buffer) {
  return value.toString('base64url')
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url')
}

export function getIntegrationSecretMasterKeySource() {
  return deriveEncryptionKey().source
}

export function encryptAdministrativeSecret(secretValue: string) {
  const normalizedSecret = secretValue.trim()

  if (normalizedSecret === '') {
    throw new AppError('BAD_REQUEST', 400, 'Administrative secrets cannot be empty.')
  }

  const { key } = deriveEncryptionKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(normalizedSecret, 'utf8'),
    cipher.final(),
  ])
  const authenticationTag = cipher.getAuthTag()

  return `${base64UrlEncode(iv)}.${base64UrlEncode(authenticationTag)}.${base64UrlEncode(encrypted)}`
}

export function decryptAdministrativeSecret(payload: string) {
  const [ivEncoded, authTagEncoded, encryptedEncoded] = payload.split('.')

  if (!ivEncoded || !authTagEncoded || !encryptedEncoded) {
    throw new AppError('BAD_REQUEST', 400, 'Invalid administrative secret payload.')
  }

  const { key } = deriveEncryptionKey()
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    base64UrlDecode(ivEncoded),
  )
  decipher.setAuthTag(base64UrlDecode(authTagEncoded))

  return Buffer.concat([
    decipher.update(base64UrlDecode(encryptedEncoded)),
    decipher.final(),
  ]).toString('utf8')
}

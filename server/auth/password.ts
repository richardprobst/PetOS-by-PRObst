import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

const SALT_BYTES = 16
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex')
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer

  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password: string, storedPasswordHash: string): Promise<boolean> {
  const [salt, storedKey] = storedPasswordHash.split(':')

  if (!salt || !storedKey) {
    return false
  }

  const storedKeyBuffer = Buffer.from(storedKey, 'hex')
  const derivedKeyBuffer = (await scrypt(password, salt, storedKeyBuffer.length)) as Buffer

  if (storedKeyBuffer.length !== derivedKeyBuffer.length) {
    return false
  }

  return timingSafeEqual(storedKeyBuffer, derivedKeyBuffer)
}

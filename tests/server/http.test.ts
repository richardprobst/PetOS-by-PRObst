import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { resetEnvironmentCacheForTests } from '../../server/env'
import { AppError } from '../../server/http/errors'
import { readValidatedJson } from '../../server/http/request'
import { created, noContent, ok, routeErrorResponse } from '../../server/http/responses'

const baseEnvironment = {
  NODE_ENV: 'test',
  APP_NAME: 'PetOS',
  APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  DATABASE_URL: 'mysql://user:password@localhost:3306/petos',
  DIRECT_DATABASE_URL: 'mysql://user:password@localhost:3306/petos',
  NEXTAUTH_SECRET: 'super-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
  UPLOAD_MAX_FILE_SIZE_MB: '10',
  UPLOAD_ALLOWED_MIME_TYPES: 'image/jpeg,image/png,application/pdf',
  STORAGE_BUCKET: 'petos-files',
  STORAGE_REGION: 'us-east-1',
  EMAIL_FROM_NAME: 'PetOS',
  EMAIL_FROM_ADDRESS: 'no-reply@example.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  LOG_LEVEL: 'info',
  RATE_LIMIT_ENABLED: 'true',
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  DEFAULT_CANCELLATION_WINDOW_HOURS: '24',
  DEFAULT_RESCHEDULE_WINDOW_HOURS: '24',
  DEFAULT_NO_SHOW_TOLERANCE_MINUTES: '15',
  DEFAULT_CURRENCY: 'BRL',
  DEFAULT_TIMEZONE: 'America/Sao_Paulo',
} satisfies NodeJS.ProcessEnv

function withEnvironment(overrides?: Partial<NodeJS.ProcessEnv>) {
  Object.assign(process.env, baseEnvironment, overrides)
  resetEnvironmentCacheForTests()
}

test('ok returns the default success envelope for route handlers', async () => {
  const response = ok({ ready: true })

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    data: { ready: true },
  })
})

test('created returns status 201 for resource creation responses', async () => {
  const response = created({ id: 'new-resource' })

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), {
    data: { id: 'new-resource' },
  })
})

test('noContent returns an empty body with status 204', async () => {
  const response = noContent()

  assert.equal(response.status, 204)
  assert.equal(await response.text(), '')
})

test('routeErrorResponse preserves explicit application errors', async () => {
  const response = routeErrorResponse(new AppError('FORBIDDEN', 403, 'Forbidden area.'), {
    request: new Request('http://localhost:3000/api/admin/clients', {
      headers: {
        'x-request-id': 'req-forbidden',
      },
      method: 'GET',
    }),
  })

  assert.equal(response.status, 403)
  assert.equal(response.headers.get('x-request-id'), 'req-forbidden')
  assert.deepEqual(await response.json(), {
    error: {
      code: 'FORBIDDEN',
      message: 'Forbidden area.',
      requestId: 'req-forbidden',
    },
  })
})

test('routeErrorResponse maps ZodError to a 400 response', async () => {
  const schema = z.object({
    name: z.string().min(1),
  })

  const result = schema.safeParse({ name: '' })
  if (result.success) {
    assert.fail('Expected payload validation to fail for an empty name.')
  }

  const response = routeErrorResponse(result.error)

  assert.equal(response.status, 400)

  const body = await response.json()
  assert.equal(body.error.code, 'BAD_REQUEST')
  assert.equal(body.error.message, 'Invalid request payload.')
  assert.equal(typeof body.error.requestId, 'string')
})

test('readValidatedJson accepts same-origin mutation requests', async () => {
  withEnvironment()

  const result = await readValidatedJson(
    new Request('http://localhost:3000/api/admin/clients', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        name: 'PetOS',
      }),
    }),
    z.object({
      name: z.string().min(1),
    }),
  )

  assert.deepEqual(result, {
    name: 'PetOS',
  })
})

test('readValidatedJson accepts trusted referer when origin is absent', async () => {
  withEnvironment()

  const result = await readValidatedJson(
    new Request('http://localhost:3000/api/admin/clients', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        referer: 'http://localhost:3000/admin/clientes',
      },
      body: JSON.stringify({
        name: 'Tutor PetOS',
      }),
    }),
    z.object({
      name: z.string().min(1),
    }),
  )

  assert.deepEqual(result, {
    name: 'Tutor PetOS',
  })
})

test('readValidatedJson blocks mutation requests from untrusted origins', async () => {
  withEnvironment()

  await assert.rejects(
    () =>
      readValidatedJson(
        new Request('http://localhost:3000/api/admin/clients', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'https://evil.example',
          },
          body: JSON.stringify({
            name: 'PetOS',
          }),
        }),
        z.object({
          name: z.string().min(1),
        }),
      ),
    (error) =>
      error instanceof AppError &&
      error.code === 'FORBIDDEN' &&
      error.status === 403 &&
      error.message === 'Untrusted request origin.',
  )
})

test('readValidatedJson rejects malformed JSON payloads', async () => {
  withEnvironment()

  await assert.rejects(
    () =>
      readValidatedJson(
        new Request('http://localhost:3000/api/admin/clients', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'http://localhost:3000',
          },
          body: '{"name":',
        }),
        z.object({
          name: z.string().min(1),
        }),
      ),
    (error) =>
      error instanceof AppError &&
      error.code === 'BAD_REQUEST' &&
      error.status === 400 &&
      error.message === 'Invalid JSON payload.',
  )
})

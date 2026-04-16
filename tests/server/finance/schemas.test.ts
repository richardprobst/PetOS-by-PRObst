import assert from 'node:assert/strict'
import test from 'node:test'
import {
  useClientCreditInputSchema,
  useClientCreditRouteBodySchema,
} from '../../../features/finance/schemas'

test('useClientCreditRouteBodySchema accepts route bodies without duplicating creditId', () => {
  const routePayload = {
    amount: 5,
    appointmentId: 'appointment_1',
    description: 'Apply credit from route body only',
  }

  const routeParse = useClientCreditRouteBodySchema.safeParse(routePayload)
  const serviceParse = useClientCreditInputSchema.safeParse(routePayload)

  assert.equal(routeParse.success, true)
  assert.equal(serviceParse.success, false)
})

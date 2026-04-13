import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  cancelTutorWaitlistEntry,
  getTutorDashboard,
  getTutorFinancialOverview,
  getTutorPreCheckInStatus,
} from '../../../features/tutor/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'
import { AppError } from '../../../server/http/errors'

const restorers: Array<() => void> = []

const tutorActor: AuthenticatedUserData = {
  active: true,
  email: 'tutor@petos.app',
  id: 'client_tutor',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Tutor Local',
  permissions: [
    'portal_tutor.acessar',
    'agendamento.pre_check_in.visualizar_proprio',
    'agenda.waitlist.editar_proprio',
  ],
  profiles: ['Tutor'],
  unitId: 'unit_local',
  userType: 'CLIENT',
}

const tutorSessionOnlyActor: AuthenticatedUserData = {
  ...tutorActor,
  unitId: null,
}

function replaceMethod(target: object, key: string, value: unknown) {
  const descriptor =
    Object.getOwnPropertyDescriptor(target, key) ??
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key)

  Object.defineProperty(target, key, {
    configurable: true,
    value,
    writable: true,
  })

  restorers.push(() => {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
      return
    }

    Reflect.deleteProperty(target, key)
  })
}

function buildRawAppointment(unitId = 'unit_local') {
  return {
    clientId: tutorActor.id,
    clientNotes: 'Tutor note',
    createdAt: new Date('2026-04-13T10:00:00.000Z'),
    endAt: new Date('2026-04-13T11:00:00.000Z'),
    estimatedTotalAmount: 120,
    financialStatus: 'PENDING',
    id: `appointment_${unitId}`,
    internalNotes: 'Internal only',
    operationalStatus: {
      description: 'Agendado',
      displayOrder: 1,
      id: 'SCHEDULED',
      name: 'Agendado',
    },
    operationalStatusId: 'SCHEDULED',
    pet: {
      breed: 'Shih Tzu',
      id: 'pet_1',
      name: 'Thor',
      species: 'DOG',
    },
    petId: 'pet_1',
    reportCard: {
      generatedAt: new Date('2026-04-13T11:30:00.000Z'),
      id: 'report_card_1',
    },
    services: [
      {
        agreedUnitPrice: 90,
        calculatedCommissionAmount: 18,
        employee: {
          unitId,
          user: {
            email: 'employee@petos.app',
            id: 'employee_user',
            name: 'Funcionario',
            passwordHash: 'secret',
          },
          userId: 'employee_user',
        },
        employeeUserId: 'employee_user',
        id: 'appointment_service_1',
        service: {
          active: true,
          basePrice: 90,
          description: 'Banho completo',
          estimatedDurationMinutes: 60,
          id: 'service_banho',
          name: 'Banho',
          unitId,
        },
        serviceId: 'service_banho',
      },
    ],
    startAt: new Date('2026-04-13T10:00:00.000Z'),
    taxiDogRide: {
      assignedDriver: {
        unitId,
        user: {
          id: 'driver_user',
          name: 'Motorista',
          passwordHash: 'driver-secret',
        },
        userId: 'driver_user',
      },
      createdBy: {
        id: 'admin_user',
        name: 'Admin',
        passwordHash: 'admin-secret',
      },
      dropoffWindowEndAt: null,
      dropoffWindowStartAt: null,
      feeAmount: 25,
      id: 'ride_1',
      pickupWindowEndAt: null,
      pickupWindowStartAt: null,
      status: 'REQUESTED',
    },
    tutorPreCheckIn: {
      consentConfirmed: true,
      contactPhone: '11999999999',
      id: 'pre_check_in_1',
      notes: 'Sem restricoes',
      payload: {
        healthUpdates: 'Nenhuma',
      },
      submittedAt: new Date('2026-04-12T09:00:00.000Z'),
      submittedBy: {
        id: tutorActor.id,
        name: 'Tutor Local',
        passwordHash: 'tutor-secret',
      },
      updatedAt: new Date('2026-04-12T09:05:00.000Z'),
    },
    unitId,
    updatedAt: new Date('2026-04-13T10:05:00.000Z'),
    waitlistSource: {
      desiredService: {
        id: 'service_banho',
        name: 'Banho',
      },
      id: 'waitlist_1',
      preferredEmployee: {
        user: {
          id: 'employee_user',
          name: 'Funcionario',
          passwordHash: 'secret',
        },
        userId: 'employee_user',
      },
      preferredEndAt: new Date('2026-04-13T11:00:00.000Z'),
      preferredStartAt: new Date('2026-04-13T10:00:00.000Z'),
      requestedTransport: false,
      status: 'PROMOTED',
    },
  }
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

test('getTutorDashboard scopes appointments to the active unit and strips sensitive nested user data', async () => {
  let capturedUnitFilter: string | null = null

  replaceMethod(prisma as object, 'client', {
    findUnique: async (args: { include: { appointments: { where: { unitId: string } } } }) => {
      capturedUnitFilter = args.include.appointments.where.unitId

      return {
        address: 'Rua A',
        appointments: [buildRawAppointment('unit_local')],
        city: 'Sao Paulo',
        contactPreference: 'WHATSAPP',
        generalNotes: 'Cliente preferencial',
        pets: [
          {
            allergies: 'Nenhuma',
            birthDate: null,
            clientId: tutorActor.id,
            createdAt: new Date('2026-04-10T10:00:00.000Z'),
            healthNotes: 'Saudavel',
            id: 'pet_1',
            name: 'Thor',
            primaryPhotoUrl: null,
            species: 'DOG',
            updatedAt: new Date('2026-04-10T10:00:00.000Z'),
            weightKg: 8,
            breed: 'Shih Tzu',
          },
        ],
        state: 'SP',
        user: {
          email: tutorActor.email,
          id: tutorActor.id,
          name: tutorActor.name,
          passwordHash: 'tutor-secret',
          phone: '11999999999',
          unitId: 'unit_local',
        },
        userId: tutorActor.id,
        zipCode: '00000-000',
      }
    },
  })

  const dashboard = await getTutorDashboard(tutorActor)

  assert.equal(capturedUnitFilter, 'unit_local')
  assert.equal(dashboard.appointments.length, 1)
  assert.equal('passwordHash' in dashboard.user, false)
  assert.equal('internalNotes' in dashboard.appointments[0], false)
  assert.equal(
    'passwordHash' in (dashboard.appointments[0].taxiDogRide?.assignedDriver?.user ?? {}),
    false,
  )
  assert.deepEqual(Object.keys(dashboard.appointments[0].taxiDogRide?.assignedDriver?.user ?? {}), [
    'id',
    'name',
  ])
})

test('getTutorFinancialOverview keeps only tutor-facing finance fields', async () => {
  replaceMethod(prisma as object, 'deposit', {
    findMany: async () => [
      {
        amount: 80,
        appliedAt: null,
        appointment: {
          client: {
            user: {
              passwordHash: 'secret',
            },
          },
          id: 'appointment_finance',
          pet: {
            id: 'pet_1',
            name: 'Thor',
          },
        },
        appointmentId: 'appointment_finance',
        client: {
          user: {
            passwordHash: 'secret',
          },
        },
        createdAt: new Date('2026-04-13T10:00:00.000Z'),
        createdBy: {
          id: 'admin_user',
          passwordHash: 'secret',
        },
        expiresAt: null,
        id: 'deposit_1',
        notes: 'Reserva',
        purpose: 'PREPAYMENT',
        receivedAt: null,
        status: 'PENDING',
        unit: {
          id: 'unit_local',
        },
      },
    ],
  })
  replaceMethod(prisma as object, 'refund', {
    findMany: async () => [
      {
        amount: 25,
        appointment: {
          client: {
            user: {
              passwordHash: 'secret',
            },
          },
          id: 'appointment_finance',
          pet: {
            id: 'pet_1',
            name: 'Thor',
          },
        },
        appointmentId: 'appointment_finance',
        client: {
          user: {
            passwordHash: 'secret',
          },
        },
        createdAt: new Date('2026-04-13T12:00:00.000Z'),
        createdBy: {
          id: 'admin_user',
          passwordHash: 'secret',
        },
        id: 'refund_1',
        processedAt: new Date('2026-04-13T13:00:00.000Z'),
        reason: 'Estorno',
        status: 'COMPLETED',
        unit: {
          id: 'unit_local',
        },
      },
    ],
  })
  replaceMethod(prisma as object, 'clientCredit', {
    findMany: async () => [
      {
        availableAmount: 40,
        client: {
          user: {
            passwordHash: 'secret',
          },
        },
        createdAt: new Date('2026-04-13T14:00:00.000Z'),
        createdBy: {
          id: 'admin_user',
          passwordHash: 'secret',
        },
        expiresAt: null,
        id: 'credit_1',
        notes: 'Credito promocional',
        originType: 'PROMOTION',
        totalAmount: 40,
        unit: {
          id: 'unit_local',
        },
      },
    ],
  })

  const overview = await getTutorFinancialOverview(tutorActor)

  assert.equal('client' in overview.deposits[0], false)
  assert.equal('createdBy' in overview.deposits[0], false)
  assert.equal('client' in overview.refunds[0], false)
  assert.equal('createdBy' in overview.clientCredits[0], false)
  assert.equal(overview.summary.pendingDepositAmount, 80)
  assert.equal(overview.summary.completedRefundAmount, 25)
  assert.equal(overview.summary.availableCreditAmount, 40)
})

test('cancelTutorWaitlistEntry rejects entries from another unit even when tutor unit comes only from session context', async () => {
  replaceMethod(prisma as object, 'waitlistEntry', {
    findUnique: async () => ({
      clientId: tutorActor.id,
      id: 'waitlist_branch',
      unitId: 'unit_branch',
    }),
  })

  await assert.rejects(
    () =>
      cancelTutorWaitlistEntry(tutorSessionOnlyActor, 'waitlist_branch', {
        reason: 'Nao posso comparecer',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403,
  )
})

test('getTutorPreCheckInStatus rejects appointments from another unit even when tutor unit comes only from session context', async () => {
  replaceMethod(prisma as object, 'appointment', {
    findUnique: async () => buildRawAppointment('unit_branch'),
  })

  await assert.rejects(
    () => getTutorPreCheckInStatus(tutorSessionOnlyActor, 'appointment_unit_branch'),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403,
  )
})

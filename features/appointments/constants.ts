export const operationalStatusIds = {
  scheduled: 'SCHEDULED',
  confirmed: 'CONFIRMED',
  checkIn: 'CHECK_IN',
  inService: 'IN_SERVICE',
  readyForPickup: 'READY_FOR_PICKUP',
  completed: 'COMPLETED',
  canceled: 'CANCELED',
  noShow: 'NO_SHOW',
} as const

export const scheduleBlockingStatusIds = [
  operationalStatusIds.scheduled,
  operationalStatusIds.confirmed,
  operationalStatusIds.checkIn,
  operationalStatusIds.inService,
  operationalStatusIds.readyForPickup,
] as const

export const allowedOperationalTransitions: Record<string, string[]> = {
  [operationalStatusIds.scheduled]: [
    operationalStatusIds.confirmed,
    operationalStatusIds.canceled,
    operationalStatusIds.noShow,
  ],
  [operationalStatusIds.confirmed]: [
    operationalStatusIds.checkIn,
    operationalStatusIds.canceled,
    operationalStatusIds.noShow,
  ],
  [operationalStatusIds.checkIn]: [operationalStatusIds.inService],
  [operationalStatusIds.inService]: [operationalStatusIds.readyForPickup],
  [operationalStatusIds.readyForPickup]: [operationalStatusIds.completed],
  [operationalStatusIds.completed]: [],
  [operationalStatusIds.canceled]: [],
  [operationalStatusIds.noShow]: [],
}

export const petSizeCategories = ['SMALL', 'MEDIUM', 'LARGE', 'GIANT', 'UNKNOWN'] as const

export const scheduleBlockTypes = ['UNAVAILABLE', 'BREAK', 'HOLIDAY', 'TRANSPORT', 'OTHER'] as const

export const waitlistStatusIds = ['PENDING', 'PROMOTED', 'CANCELED', 'EXPIRED'] as const

export const taxiDogStatusIds = [
  'REQUESTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const

export const allowedTaxiDogStatusTransitions: Record<string, string[]> = {
  REQUESTED: ['SCHEDULED', 'CANCELED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELED'],
  COMPLETED: [],
  CANCELED: [],
}

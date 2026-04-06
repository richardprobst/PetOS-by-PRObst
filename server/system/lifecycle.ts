import type { SystemLifecycleState } from '@prisma/client'

export const maintenanceLifecycleStates: SystemLifecycleState[] = ['MAINTENANCE', 'UPDATING']
export const repairLifecycleStates: SystemLifecycleState[] = [
  'INSTALL_FAILED',
  'UPDATE_FAILED',
  'REPAIR',
]

export function isMaintenanceLifecycleState(state: SystemLifecycleState | 'UNKNOWN') {
  return maintenanceLifecycleStates.includes(state as SystemLifecycleState)
}

export function isRepairLifecycleState(state: SystemLifecycleState | 'UNKNOWN') {
  return repairLifecycleStates.includes(state as SystemLifecycleState)
}

export function isOperationalLifecycleState(state: SystemLifecycleState | 'UNKNOWN') {
  return state === 'INSTALLED'
}

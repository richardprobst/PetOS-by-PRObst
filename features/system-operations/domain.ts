import type { EffectiveSystemLifecycleState } from '@/server/system/runtime-state'

export function getLifecycleTone(state: EffectiveSystemLifecycleState) {
  if (state === 'INSTALLED') {
    return 'success' as const
  }

  if (state === 'NOT_INSTALLED' || state === 'UNKNOWN') {
    return 'warning' as const
  }

  return 'danger' as const
}

export function getLifecycleLabel(state: EffectiveSystemLifecycleState) {
  const labels: Record<EffectiveSystemLifecycleState, string> = {
    UNKNOWN: 'Indisponivel',
    NOT_INSTALLED: 'Nao instalado',
    INSTALLING: 'Instalando',
    INSTALLED: 'Instalado',
    INSTALL_FAILED: 'Falha de instalacao',
    MAINTENANCE: 'Manutencao',
    UPDATING: 'Atualizando',
    UPDATE_FAILED: 'Falha de update',
    REPAIR: 'Reparo',
  }

  return labels[state] ?? state
}

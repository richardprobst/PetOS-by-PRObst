import { canViewWhiteLabel } from '@/features/branding/services'
import { canReadConfigurationFoundation } from '@/features/configuration/services'
import { canReadIntegrationAdministration } from '@/features/integrations-admin/services'
import { multiUnitReadScopeQuerySchema } from '@/features/multiunit/schemas'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { AppError } from '@/server/http/errors'
import { readValidatedSearchParams } from '@/server/http/request'

export function readAdminUnitScopeQuery(request: Request) {
  return readValidatedSearchParams(request, multiUnitReadScopeQuerySchema)
}

export function assertCanReadBrandingAdministration(actor: AuthenticatedUserData) {
  if (canViewWhiteLabel(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission for the Phase 5 white label administration surface.',
  )
}

export function assertCanReadIntegrationAdministrationSurface(
  actor: AuthenticatedUserData,
) {
  if (canReadIntegrationAdministration(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission for the Phase 5 integrations administration surface.',
  )
}

export function assertCanReadConfigurationFoundationSurface(
  actor: AuthenticatedUserData,
) {
  if (canReadConfigurationFoundation(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission for phase 5 configuration foundation. Expected one of: configuracao.central.visualizar, configuracao.visualizar, sistema.manutencao.operar, sistema.reparo.operar, sistema.update.operar.',
  )
}

export function assertCanReadConfigurationCenterSurface(
  actor: AuthenticatedUserData,
) {
  if (canReadConfigurationFoundation(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission for the Phase 5 configuration center.',
  )
}

import { headers } from 'next/headers'
import { Prisma } from '@prisma/client'
import type { BrandAssetRole, DomainBindingStatus, DomainSurface } from '@prisma/client'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { hasPermission } from '@/server/authorization/access-control'
import {
  createLocalUnitOwnershipBinding,
  evaluateActorMultiUnitScope,
} from '@/server/authorization/scope'
import { writeAuditLog } from '@/server/audit/logging'
import { prisma } from '@/server/db/prisma'
import {
  createStorageUnavailableAppError,
  isPrismaSchemaCompatibilityError,
  withPrismaSchemaCompatibilityFallback,
} from '@/server/db/prisma-schema-compat'
import { getEnv } from '@/server/env'
import { AppError } from '@/server/http/errors'
import {
  buildDefaultBrandRuntime,
  getBrandScopeSummary,
  type BrandRuntimeSnapshot,
  type BrandThemeConfig,
} from './domain'
import { hasPhase5PermissionCompatibility } from '@/features/configuration/permission-compat'

const CONFIGURATION_VIEW_PERMISSIONS = [
  'configuracao.central.visualizar',
  'configuracao.visualizar',
  'white_label.visualizar',
  'dominio.visualizar',
]

const WHITE_LABEL_EDIT_PERMISSIONS = [
  'white_label.editar',
  'configuracao.central.editar',
  'configuracao.editar',
]

const DOMAIN_EDIT_PERMISSIONS = [
  'dominio.editar',
  'configuracao.central.editar',
  'configuracao.editar',
]

type TenantBrandingRecord = Prisma.TenantBrandingGetPayload<Record<string, never>>
type UnitBrandingRecord = Prisma.UnitBrandingGetPayload<Record<string, never>>
type BrandAssetRecord = Prisma.BrandAssetGetPayload<Record<string, never>>
type BrandAssetScopedRecord = Prisma.BrandAssetGetPayload<{
  include: {
    unitBranding: {
      select: {
        unitId: true
      }
    }
  }
}>
type DomainBindingRecord = Prisma.DomainBindingGetPayload<Record<string, never>>
type ConfigurationPublishRecord = Prisma.ConfigurationPublishGetPayload<Record<string, never>>

export interface BrandingSerializableSnapshot {
  brandAssets: Array<{
    active: boolean
    altText: string | null
    assetUrl: string
    id: string
    label: string | null
    role: BrandAssetRole
    scopeSummary: string
    tenantBrandingId: string | null
    unitBrandingId: string | null
  }>
  domainBindings: Array<{
    hostname: string
    id: string
    isPrimary: boolean
    notes: string | null
    scopeSummary: string
    status: DomainBindingStatus
    surface: DomainSurface
    unitId: string | null
  }>
  tenantBranding: null | {
    emailFooterText: string | null
    emailSignatureName: string | null
    id: string
    legalName: string | null
    loginDescription: string | null
    loginHeadline: string | null
    primaryDomain: string | null
    publicName: string
    publicTagline: string | null
    reportCardFooterText: string | null
    reportCardHeaderText: string | null
    shortName: string | null
    slug: string
    supportEmail: string | null
    supportPhone: string | null
    themeJson: unknown
    tutorDescription: string | null
    tutorHeadline: string | null
  }
  unitBrandings: Array<{
    emailFooterTextOverride: string | null
    emailSignatureNameOverride: string | null
    id: string
    loginDescriptionOverride: string | null
    loginHeadlineOverride: string | null
    publicNameOverride: string | null
    publicTaglineOverride: string | null
    reportCardFooterOverride: string | null
    reportCardHeaderOverride: string | null
    shortNameOverride: string | null
    supportEmailOverride: string | null
    supportPhoneOverride: string | null
    themeOverridesJson: unknown
    tutorDescriptionOverride: string | null
    tutorHeadlineOverride: string | null
    unitId: string
  }>
}

export interface BrandingAdminSnapshot {
  liveRuntime: BrandRuntimeSnapshot
  permissions: {
    canEditDomains: boolean
    canEditWhiteLabel: boolean
    canPublishWhiteLabel: boolean
  }
  publishedRuntime: BrandRuntimeSnapshot | null
  publishedVersion: number | null
  serializableLiveState: BrandingSerializableSnapshot | null
  storage: {
    brandAssets: 'AVAILABLE' | 'MIGRATION_PENDING'
    branding: 'AVAILABLE' | 'MIGRATION_PENDING'
    domains: 'AVAILABLE' | 'MIGRATION_PENDING'
  }
}

export function canViewWhiteLabel(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, CONFIGURATION_VIEW_PERMISSIONS)
}

export function canEditWhiteLabel(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, WHITE_LABEL_EDIT_PERMISSIONS)
}

export function canEditDomainBindings(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, DOMAIN_EDIT_PERMISSIONS)
}

export function canPublishWhiteLabel(actor: AuthenticatedUserData) {
  return hasPhase5PermissionCompatibility(actor, [
    'white_label.publicar',
    'configuracao.publicar',
  ])
}

export async function getBrandingAdminSnapshot(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
): Promise<BrandingAdminSnapshot> {
  assertCanViewWhiteLabel(actor)

  const scope = resolveBrandingReadScope(actor, requestedUnitId ?? null)
  const liveState = await captureLiveBrandingState()
  const filteredLiveState = filterSerializableBrandingState(
    liveState.serializable,
    scope.visibleUnitIds,
  )
  const latestPublished = await getLatestConfigurationPublish()

  return {
    liveRuntime: buildBrandRuntimeFromSerializableState(filteredLiveState, {
      hostname: scope.selectedUnitId ? null : getFallbackHostname(),
      source: 'LIVE',
      surface: 'ADMIN',
      unitId: scope.selectedUnitId,
    }),
    permissions: {
      canEditDomains: canEditDomainBindings(actor),
      canEditWhiteLabel: canEditWhiteLabel(actor),
      canPublishWhiteLabel: canPublishWhiteLabel(actor),
    },
    publishedRuntime: latestPublished
      ? resolvePublishedBrandRuntime(latestPublished, {
          hostname: getFallbackHostname(),
          surface: 'PUBLIC_SITE',
          unitId: scope.selectedUnitId,
        })
      : null,
    publishedVersion: latestPublished?.version ?? null,
    serializableLiveState: filteredLiveState,
    storage: liveState.storage,
  }
}

export async function saveTenantBranding(
  actor: AuthenticatedUserData,
  input: {
    emailFooterText?: string | null
    emailSignatureName?: string | null
    legalName?: string | null
    loginDescription?: string | null
    loginHeadline: string
    primaryDomain?: string | null
    publicName: string
    publicTagline?: string | null
    reportCardFooterText?: string | null
    reportCardHeaderText?: string | null
    shortName: string
    supportEmail?: string | null
    supportPhone?: string | null
    theme: BrandThemeConfig
    tutorDescription?: string | null
    tutorHeadline: string
  },
) {
  assertCanEditWhiteLabel(actor)
  const themeJson = toNullableInputJsonValue(input.theme)

  try {
    return await prisma.$transaction(async (tx) => {
      const branding = await tx.tenantBranding.upsert({
        where: {
          id: 'default',
        },
        update: {
          active: true,
          emailFooterText: input.emailFooterText ?? null,
          emailSignatureName: input.emailSignatureName ?? null,
          legalName: input.legalName ?? null,
          loginDescription: input.loginDescription ?? null,
          loginHeadline: input.loginHeadline,
          primaryDomain: input.primaryDomain ?? null,
          publicName: input.publicName,
          publicTagline: input.publicTagline ?? null,
          reportCardFooterText: input.reportCardFooterText ?? null,
          reportCardHeaderText: input.reportCardHeaderText ?? null,
          shortName: input.shortName,
          slug: slugifyBrand(input.publicName),
          supportEmail: input.supportEmail ?? null,
          supportPhone: input.supportPhone ?? null,
          themeJson,
          tutorDescription: input.tutorDescription ?? null,
          tutorHeadline: input.tutorHeadline,
          updatedByUserId: actor.id,
        },
        create: {
          active: true,
          emailFooterText: input.emailFooterText ?? null,
          emailSignatureName: input.emailSignatureName ?? null,
          legalName: input.legalName ?? null,
          loginDescription: input.loginDescription ?? null,
          loginHeadline: input.loginHeadline,
          primaryDomain: input.primaryDomain ?? null,
          publicName: input.publicName,
          publicTagline: input.publicTagline ?? null,
          reportCardFooterText: input.reportCardFooterText ?? null,
          reportCardHeaderText: input.reportCardHeaderText ?? null,
          shortName: input.shortName,
          slug: slugifyBrand(input.publicName),
          supportEmail: input.supportEmail ?? null,
          supportPhone: input.supportPhone ?? null,
          themeJson,
          tutorDescription: input.tutorDescription ?? null,
          tutorHeadline: input.tutorHeadline,
          updatedByUserId: actor.id,
        },
      })

      await writeAuditLog(tx, {
        action: 'configuration.branding.tenant.save',
        details: {
          primaryDomain: input.primaryDomain ?? null,
          publicName: input.publicName,
          shortName: input.shortName,
        },
        entityId: branding.id,
        entityName: 'TenantBranding',
        userId: actor.id,
      })

      return branding
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createStorageUnavailableAppError('phase 5 tenant branding')
    }

    throw error
  }
}

export async function saveUnitBranding(
  actor: AuthenticatedUserData,
  input: {
    emailFooterTextOverride?: string | null
    emailSignatureNameOverride?: string | null
    loginDescriptionOverride?: string | null
    loginHeadlineOverride?: string | null
    publicNameOverride?: string | null
    publicTaglineOverride?: string | null
    reportCardFooterOverride?: string | null
    reportCardHeaderOverride?: string | null
    shortNameOverride?: string | null
    supportEmailOverride?: string | null
    supportPhoneOverride?: string | null
    themeOverrides?: Partial<BrandThemeConfig> | null
    tutorDescriptionOverride?: string | null
    tutorHeadlineOverride?: string | null
    unitId: string
  },
) {
  assertCanEditWhiteLabel(actor)
  assertCanWriteUnitScopedBranding(actor, input.unitId)
  const themeOverridesJson = toNullableInputJsonValue(input.themeOverrides ?? null)

  try {
    return await prisma.$transaction(async (tx) => {
      const unitBranding = await tx.unitBranding.upsert({
        where: {
          unitId: input.unitId,
        },
        update: {
          active: true,
          emailFooterTextOverride: input.emailFooterTextOverride ?? null,
          emailSignatureNameOverride: input.emailSignatureNameOverride ?? null,
          loginDescriptionOverride: input.loginDescriptionOverride ?? null,
          loginHeadlineOverride: input.loginHeadlineOverride ?? null,
          publicNameOverride: input.publicNameOverride ?? null,
          publicTaglineOverride: input.publicTaglineOverride ?? null,
          reportCardFooterOverride: input.reportCardFooterOverride ?? null,
          reportCardHeaderOverride: input.reportCardHeaderOverride ?? null,
          shortNameOverride: input.shortNameOverride ?? null,
          supportEmailOverride: input.supportEmailOverride ?? null,
          supportPhoneOverride: input.supportPhoneOverride ?? null,
          themeOverridesJson,
          tutorDescriptionOverride: input.tutorDescriptionOverride ?? null,
          tutorHeadlineOverride: input.tutorHeadlineOverride ?? null,
          updatedByUserId: actor.id,
        },
        create: {
          active: true,
          emailFooterTextOverride: input.emailFooterTextOverride ?? null,
          emailSignatureNameOverride: input.emailSignatureNameOverride ?? null,
          loginDescriptionOverride: input.loginDescriptionOverride ?? null,
          loginHeadlineOverride: input.loginHeadlineOverride ?? null,
          publicNameOverride: input.publicNameOverride ?? null,
          publicTaglineOverride: input.publicTaglineOverride ?? null,
          reportCardFooterOverride: input.reportCardFooterOverride ?? null,
          reportCardHeaderOverride: input.reportCardHeaderOverride ?? null,
          shortNameOverride: input.shortNameOverride ?? null,
          supportEmailOverride: input.supportEmailOverride ?? null,
          supportPhoneOverride: input.supportPhoneOverride ?? null,
          themeOverridesJson,
          tutorDescriptionOverride: input.tutorDescriptionOverride ?? null,
          tutorHeadlineOverride: input.tutorHeadlineOverride ?? null,
          unitId: input.unitId,
          updatedByUserId: actor.id,
        },
      })

      await writeAuditLog(tx, {
        action: 'configuration.branding.unit.save',
        details: {
          publicNameOverride: input.publicNameOverride ?? null,
          shortNameOverride: input.shortNameOverride ?? null,
          unitId: input.unitId,
        },
        entityId: unitBranding.id,
        entityName: 'UnitBranding',
        unitId: input.unitId,
        userId: actor.id,
      })

      return unitBranding
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createStorageUnavailableAppError('phase 5 unit branding')
    }

    throw error
  }
}

export async function saveBrandAsset(
  actor: AuthenticatedUserData,
  input: {
    active: boolean
    altText?: string | null
    assetId?: string | null
    assetUrl?: string | null
    label?: string | null
    role: BrandAssetRole
    unitId?: string | null
  },
) {
  assertCanEditWhiteLabel(actor)
  const targetUnitId = normalizeOptionalUnitId(input.unitId)

  if (targetUnitId) {
    assertCanWriteUnitScopedBranding(actor, targetUnitId)
  }

  const assetUrl = input.assetUrl?.trim()

  if (!assetUrl) {
    throw new AppError('BAD_REQUEST', 400, 'Brand assets require a URL or internal path.')
  }

  try {
    return await prisma.$transaction(async (tx) => {
      let unitBrandingId: string | null = null

      if (targetUnitId) {
        const unitBranding = await tx.unitBranding.upsert({
          where: {
            unitId: targetUnitId,
          },
          update: {
            active: true,
            updatedByUserId: actor.id,
          },
          create: {
            unitId: targetUnitId,
            updatedByUserId: actor.id,
          },
        })

        unitBrandingId = unitBranding.id
      }

      const existingAsset: BrandAssetScopedRecord | null = input.assetId
        ? await tx.brandAsset.findUnique({
            where: {
              id: input.assetId,
            },
            include: {
              unitBranding: {
                select: {
                  unitId: true,
                },
              },
            },
          })
        : await tx.brandAsset.findFirst({
            where: {
              role: input.role,
              tenantBrandingId: targetUnitId ? null : 'default',
              unitBrandingId,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            include: {
              unitBranding: {
                select: {
                  unitId: true,
                },
              },
            },
          })

      if (input.assetId && !existingAsset) {
        throw new AppError('NOT_FOUND', 404, 'Brand asset not found.')
      }

      if (existingAsset) {
        assertCanMutateExistingBrandAsset(actor, existingAsset, targetUnitId)
      }

      const data = {
        active: input.active,
        altText: input.altText ?? null,
        assetUrl,
        label: input.label ?? null,
        role: input.role,
        tenantBrandingId: targetUnitId ? null : 'default',
        unitBrandingId,
        updatedByUserId: actor.id,
      }

      const asset = existingAsset
        ? await tx.brandAsset.update({
            where: {
              id: existingAsset.id,
            },
            data,
          })
        : await tx.brandAsset.create({
            data,
          })

      await writeAuditLog(tx, {
        action: 'configuration.branding.asset.save',
        details: {
          role: input.role,
          unitId: targetUnitId,
        },
        entityId: asset.id,
        entityName: 'BrandAsset',
        unitId: targetUnitId,
        userId: actor.id,
      })

      return asset
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createStorageUnavailableAppError('phase 5 branding asset')
    }

    throw error
  }
}

export async function saveDomainBinding(
  actor: AuthenticatedUserData,
  input: {
    domainBindingId?: string | null
    hostname: string
    isPrimary: boolean
    notes?: string | null
    status: DomainBindingStatus
    surface: DomainSurface
    unitId?: string | null
  },
) {
  if (!canEditDomainBindings(actor)) {
    throw new AppError('FORBIDDEN', 403, 'Missing permission: dominio.editar.')
  }
  const targetUnitId = normalizeOptionalUnitId(input.unitId)

  if (targetUnitId) {
    assertCanWriteUnitScopedBranding(actor, targetUnitId)
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const normalizedHostname = normalizeRequiredHostname(input.hostname)
      const existingBinding = input.domainBindingId
        ? await tx.domainBinding.findUnique({
            where: {
              id: input.domainBindingId,
            },
          })
        : await tx.domainBinding.findUnique({
            where: {
              hostname: normalizedHostname,
            },
          })

      if (input.domainBindingId && !existingBinding) {
        throw new AppError('NOT_FOUND', 404, 'Domain binding not found.')
      }

      if (existingBinding) {
        assertCanMutateExistingDomainBinding(actor, existingBinding, targetUnitId)
      }

      const data = {
        hostname: normalizedHostname,
        isPrimary: input.isPrimary,
        lastVerifiedAt: input.status === 'VERIFIED' ? new Date() : null,
        notes: input.notes ?? null,
        status: input.status,
        surface: input.surface,
        unitId: targetUnitId,
        updatedByUserId: actor.id,
      }

      const binding = existingBinding
        ? await tx.domainBinding.update({
            where: {
              id: existingBinding.id,
            },
            data,
          })
        : await tx.domainBinding.create({
            data,
          })

      await writeAuditLog(tx, {
        action: 'configuration.domain.save',
        details: {
          hostname: binding.hostname,
          status: binding.status,
          surface: binding.surface,
          unitId: binding.unitId,
        },
        entityId: binding.id,
        entityName: 'DomainBinding',
        unitId: binding.unitId,
        userId: actor.id,
      })

      return binding
    })
  } catch (error) {
    if (isPrismaSchemaCompatibilityError(error)) {
      throw createStorageUnavailableAppError('phase 5 domain binding')
    }

    throw error
  }
}

export async function captureLiveBrandingState() {
  let brandingStorage: 'AVAILABLE' | 'MIGRATION_PENDING' = 'AVAILABLE'
  let brandAssetsStorage: 'AVAILABLE' | 'MIGRATION_PENDING' = 'AVAILABLE'
  let domainsStorage: 'AVAILABLE' | 'MIGRATION_PENDING' = 'AVAILABLE'

  const [tenantBranding, unitBrandings, brandAssets, domainBindings] = await Promise.all([
    withPrismaSchemaCompatibilityFallback(
      async () =>
        prisma.tenantBranding.findUnique({
          where: {
            id: 'default',
          },
        }),
      async () => {
        brandingStorage = 'MIGRATION_PENDING'
        return null as TenantBrandingRecord | null
      },
    ),
    withPrismaSchemaCompatibilityFallback(
      async () =>
        prisma.unitBranding.findMany({
          orderBy: {
            unitId: 'asc',
          },
        }),
      async () => {
        brandingStorage = 'MIGRATION_PENDING'
        return [] as UnitBrandingRecord[]
      },
    ),
    withPrismaSchemaCompatibilityFallback(
      async () =>
        prisma.brandAsset.findMany({
          orderBy: [{ role: 'asc' }, { updatedAt: 'desc' }],
        }),
      async () => {
        brandAssetsStorage = 'MIGRATION_PENDING'
        return [] as BrandAssetRecord[]
      },
    ),
    withPrismaSchemaCompatibilityFallback(
      async () =>
        prisma.domainBinding.findMany({
          orderBy: [{ hostname: 'asc' }, { surface: 'asc' }],
        }),
      async () => {
        domainsStorage = 'MIGRATION_PENDING'
        return [] as DomainBindingRecord[]
      },
    ),
  ])

  return {
    serializable: serializeLiveBrandingState({
      brandAssets,
      domainBindings,
      tenantBranding,
      unitBrandings,
    }),
    storage: {
      brandAssets: brandAssetsStorage,
      branding: brandingStorage,
      domains: domainsStorage,
    },
  }
}

export async function resolveBrandRuntimeForCurrentRequest(
  surface: DomainSurface,
  options?: {
    preferLive?: boolean
    unitId?: string | null
  },
) {
  const requestHeaders = await headers()
  const hostHeader =
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    getFallbackHostname()

  return resolveBrandRuntime({
    host: hostHeader,
    preferLive: options?.preferLive === true,
    surface,
    unitId: options?.unitId ?? null,
  })
}

export async function resolveBrandRuntime(options: {
  host: string | null
  preferLive?: boolean
  surface: DomainSurface
  unitId?: string | null
}) {
  const normalizedHost = normalizeHostname(options.host ?? getFallbackHostname())

  if (options.preferLive) {
    const liveState = await captureLiveBrandingState()
    return buildBrandRuntimeFromSerializableState(liveState.serializable, {
      hostname: normalizedHost,
      source: 'LIVE',
      surface: options.surface,
      unitId: options.unitId ?? null,
    })
  }

  const latestPublished = await getLatestConfigurationPublish()

  if (latestPublished) {
    return resolvePublishedBrandRuntime(latestPublished, {
      hostname: normalizedHost,
      surface: options.surface,
      unitId: options.unitId ?? null,
    })
  }

  const liveState = await captureLiveBrandingState()
  return buildBrandRuntimeFromSerializableState(liveState.serializable, {
    hostname: normalizedHost,
    source: 'LIVE',
    surface: options.surface,
    unitId: options.unitId ?? null,
  })
}

export function buildBrandRuntimeFromSerializableState(
  state: BrandingSerializableSnapshot | null,
  options: {
    hostname: string | null
    source: 'LIVE' | 'PUBLISHED'
    surface: DomainSurface
    unitId?: string | null
  },
): BrandRuntimeSnapshot {
  const fallback = buildDefaultBrandRuntime()

  if (!state?.tenantBranding) {
    return {
      ...fallback,
      domain: {
        hostname: options.hostname ?? null,
        source: 'DEFAULT',
        status: 'DEFAULT',
        surface: options.surface,
        unitId: options.unitId ?? null,
      },
      source: options.source,
    }
  }

  const matchedDomainBinding = resolveDomainBindingMatch(
    state.domainBindings,
    options.hostname,
    options.surface,
  )
  const matchedUnitId = options.unitId ?? matchedDomainBinding?.unitId ?? null
  const unitBranding = matchedUnitId
    ? state.unitBrandings.find((entry) => entry.unitId === matchedUnitId)
    : undefined
  const theme = mergeTheme(
    state.tenantBranding.themeJson,
    unitBranding?.themeOverridesJson ?? null,
  )
  const assets = resolveAssets(state, unitBranding?.id ?? null)

  return {
    assets,
    copy: {
      emailFooterText:
        unitBranding?.emailFooterTextOverride ??
        state.tenantBranding.emailFooterText ??
        fallback.copy.emailFooterText,
      emailSignatureName:
        unitBranding?.emailSignatureNameOverride ??
        state.tenantBranding.emailSignatureName ??
        state.tenantBranding.publicName,
      loginDescription:
        unitBranding?.loginDescriptionOverride ??
        state.tenantBranding.loginDescription ??
        fallback.copy.loginDescription,
      loginHeadline:
        unitBranding?.loginHeadlineOverride ??
        state.tenantBranding.loginHeadline ??
        state.tenantBranding.publicName,
      publicTagline:
        unitBranding?.publicTaglineOverride ??
        state.tenantBranding.publicTagline ??
        fallback.copy.publicTagline,
      reportCardFooterText:
        unitBranding?.reportCardFooterOverride ??
        state.tenantBranding.reportCardFooterText ??
        fallback.copy.reportCardFooterText,
      reportCardHeaderText:
        unitBranding?.reportCardHeaderOverride ??
        state.tenantBranding.reportCardHeaderText ??
        fallback.copy.reportCardHeaderText,
      tutorDescription:
        unitBranding?.tutorDescriptionOverride ??
        state.tenantBranding.tutorDescription ??
        fallback.copy.tutorDescription,
      tutorHeadline:
        unitBranding?.tutorHeadlineOverride ??
        state.tenantBranding.tutorHeadline ??
        fallback.copy.tutorHeadline,
    },
    domain: {
      hostname: options.hostname ?? matchedDomainBinding?.hostname ?? null,
      source: matchedUnitId
        ? matchedDomainBinding
          ? 'DOMAIN_BINDING'
          : 'UNIT_OVERRIDE'
        : matchedDomainBinding
          ? 'DOMAIN_BINDING'
          : 'DEFAULT',
      status: matchedDomainBinding?.status ?? 'DEFAULT',
      surface: matchedDomainBinding?.surface ?? options.surface,
      unitId: matchedUnitId,
    },
    identity: {
      legalName: state.tenantBranding.legalName ?? state.tenantBranding.publicName,
      primaryDomain:
        matchedDomainBinding?.hostname ??
        state.tenantBranding.primaryDomain ??
        options.hostname ??
        null,
      publicName:
        unitBranding?.publicNameOverride ??
        state.tenantBranding.publicName ??
        fallback.identity.publicName,
      shortName:
        unitBranding?.shortNameOverride ??
        state.tenantBranding.shortName ??
        state.tenantBranding.publicName,
      supportEmail:
        unitBranding?.supportEmailOverride ?? state.tenantBranding.supportEmail ?? null,
      supportPhone:
        unitBranding?.supportPhoneOverride ?? state.tenantBranding.supportPhone ?? null,
    },
    source: options.source,
    theme,
  }
}

export function buildBrandCssVariables(runtime: BrandRuntimeSnapshot) {
  const accentStrong = darkenHex(runtime.theme.primaryColor, 0.12)

  return {
    '--accent': runtime.theme.primaryColor,
    '--accent-soft': hexToRgba(runtime.theme.primaryColor, 0.12),
    '--accent-strong': accentStrong,
    '--background': runtime.theme.backgroundColor,
    '--background-strong': runtime.theme.backgroundStrongColor,
    '--foreground': runtime.theme.foregroundColor,
    '--foreground-soft': runtime.theme.mutedColor,
    '--line': hexToRgba(runtime.theme.foregroundColor, 0.12),
    '--line-strong': hexToRgba(runtime.theme.foregroundColor, 0.22),
    '--shadow-soft': `0 18px 40px ${hexToRgba(runtime.theme.foregroundColor, 0.08)}`,
    '--surface': hexToRgba(runtime.theme.surfaceColor, 0.82),
    '--surface-ink': hexToRgba(runtime.theme.foregroundColor, 0.04),
    '--surface-strong': runtime.theme.surfaceColor,
  } satisfies Record<string, string>
}

export function getBrandBodyClassName(runtime: BrandRuntimeSnapshot) {
  switch (runtime.theme.fontPreset) {
    case 'SYSTEM':
      return 'brand-font-system'
    case 'SERIF':
      return 'brand-font-serif'
    case 'FRIENDLY':
      return 'brand-font-friendly'
    case 'MANROPE':
    default:
      return 'brand-font-manrope'
  }
}

export function serializeLiveBrandingState(input: {
  brandAssets: BrandAssetRecord[]
  domainBindings: DomainBindingRecord[]
  tenantBranding: TenantBrandingRecord | null
  unitBrandings: UnitBrandingRecord[]
}): BrandingSerializableSnapshot | null {
  if (!input.tenantBranding) {
    return null
  }

  const unitBrandingsById = new Map(
    input.unitBrandings.map((branding) => [branding.id, branding] as const),
  )
  const unitScopeLabelsByUnitId = new Map(
    input.unitBrandings.map((branding) => [
      branding.unitId,
      getBrandingUnitScopeLabel(branding),
    ] as const),
  )

  return {
    brandAssets: input.brandAssets.map((asset) => ({
      active: asset.active,
      altText: asset.altText,
      assetUrl: asset.assetUrl,
      id: asset.id,
      label: asset.label,
      role: asset.role,
      scopeSummary: asset.unitBrandingId
        ? getBrandScopeSummary(
            'UNIT',
            getBrandingUnitScopeLabel(unitBrandingsById.get(asset.unitBrandingId)),
          )
        : getBrandScopeSummary('TENANT'),
      tenantBrandingId: asset.tenantBrandingId,
      unitBrandingId: asset.unitBrandingId,
    })),
    domainBindings: input.domainBindings.map((binding) => ({
      hostname: binding.hostname,
      id: binding.id,
      isPrimary: binding.isPrimary,
      notes: binding.notes,
      scopeSummary: binding.unitId
        ? getBrandScopeSummary('UNIT', unitScopeLabelsByUnitId.get(binding.unitId))
        : getBrandScopeSummary('TENANT'),
      status: binding.status,
      surface: binding.surface,
      unitId: binding.unitId,
    })),
    tenantBranding: {
      emailFooterText: input.tenantBranding.emailFooterText,
      emailSignatureName: input.tenantBranding.emailSignatureName,
      id: input.tenantBranding.id,
      legalName: input.tenantBranding.legalName,
      loginDescription: input.tenantBranding.loginDescription,
      loginHeadline: input.tenantBranding.loginHeadline,
      primaryDomain: input.tenantBranding.primaryDomain,
      publicName: input.tenantBranding.publicName,
      publicTagline: input.tenantBranding.publicTagline,
      reportCardFooterText: input.tenantBranding.reportCardFooterText,
      reportCardHeaderText: input.tenantBranding.reportCardHeaderText,
      shortName: input.tenantBranding.shortName,
      slug: input.tenantBranding.slug,
      supportEmail: input.tenantBranding.supportEmail,
      supportPhone: input.tenantBranding.supportPhone,
      themeJson: input.tenantBranding.themeJson,
      tutorDescription: input.tenantBranding.tutorDescription,
      tutorHeadline: input.tenantBranding.tutorHeadline,
    },
    unitBrandings: input.unitBrandings.map((branding) => ({
      emailFooterTextOverride: branding.emailFooterTextOverride,
      emailSignatureNameOverride: branding.emailSignatureNameOverride,
      id: branding.id,
      loginDescriptionOverride: branding.loginDescriptionOverride,
      loginHeadlineOverride: branding.loginHeadlineOverride,
      publicNameOverride: branding.publicNameOverride,
      publicTaglineOverride: branding.publicTaglineOverride,
      reportCardFooterOverride: branding.reportCardFooterOverride,
      reportCardHeaderOverride: branding.reportCardHeaderOverride,
      shortNameOverride: branding.shortNameOverride,
      supportEmailOverride: branding.supportEmailOverride,
      supportPhoneOverride: branding.supportPhoneOverride,
      themeOverridesJson: branding.themeOverridesJson,
      tutorDescriptionOverride: branding.tutorDescriptionOverride,
      tutorHeadlineOverride: branding.tutorHeadlineOverride,
      unitId: branding.unitId,
    })),
  }
}

export function resolvePublishedBrandRuntime(
  latestPublished: ConfigurationPublishRecord,
  options: {
    hostname: string | null
    surface: DomainSurface
    unitId?: string | null
  },
) {
  const snapshot = parsePublishedBrandingSnapshot(latestPublished.snapshotJson)

  return buildBrandRuntimeFromSerializableState(snapshot, {
    hostname: options.hostname,
    source: 'PUBLISHED',
    surface: options.surface,
    unitId: options.unitId ?? null,
  })
}

async function getLatestConfigurationPublish() {
  return withPrismaSchemaCompatibilityFallback(
    async () =>
      prisma.configurationPublish.findFirst({
        orderBy: {
          version: 'desc',
        },
      }),
    async () => null as ConfigurationPublishRecord | null,
  )
}

function resolveBrandingReadScope(
  actor: AuthenticatedUserData,
  requestedUnitId?: string | null,
) {
  const normalizedRequestedUnitId = normalizeOptionalUnitId(requestedUnitId)
  const actorUnitId = normalizeOptionalUnitId(actor.unitId)

  if (normalizedRequestedUnitId) {
    assertCanReadUnitScopedBranding(actor, normalizedRequestedUnitId)

    return {
      selectedUnitId: normalizedRequestedUnitId,
      visibleUnitIds: [normalizedRequestedUnitId],
    }
  }

  if (hasPermission(actor, 'multiunidade.global.visualizar')) {
    return {
      selectedUnitId: actorUnitId,
      visibleUnitIds: actorUnitId ? [actorUnitId] : null,
    }
  }

  if (actorUnitId) {
    assertCanReadUnitScopedBranding(actor, actorUnitId)

    return {
      selectedUnitId: actorUnitId,
      visibleUnitIds: [actorUnitId],
    }
  }

  return {
    selectedUnitId: null,
    visibleUnitIds: [] as string[],
  }
}

function filterSerializableBrandingState(
  state: BrandingSerializableSnapshot | null,
  visibleUnitIds: string[] | null,
): BrandingSerializableSnapshot | null {
  if (!state || visibleUnitIds === null) {
    return state
  }

  const visibleUnitIdSet = new Set(visibleUnitIds)
  const unitBrandings = state.unitBrandings.filter((branding) =>
    visibleUnitIdSet.has(branding.unitId),
  )
  const visibleUnitBrandingIds = new Set(unitBrandings.map((branding) => branding.id))

  return {
    ...state,
    brandAssets: state.brandAssets.filter(
      (asset) =>
        asset.unitBrandingId === null ||
        visibleUnitBrandingIds.has(asset.unitBrandingId),
    ),
    domainBindings: state.domainBindings.filter(
      (binding) => binding.unitId === null || visibleUnitIdSet.has(binding.unitId),
    ),
    unitBrandings,
  }
}

function parsePublishedBrandingSnapshot(snapshotJson: Prisma.JsonValue | null) {
  if (!snapshotJson || typeof snapshotJson !== 'object' || Array.isArray(snapshotJson)) {
    return null
  }

  const branding = (snapshotJson as Record<string, unknown>).branding

  if (!branding || typeof branding !== 'object' || Array.isArray(branding)) {
    return null
  }

  return branding as BrandingSerializableSnapshot
}

function getBrandingUnitScopeLabel(
  branding:
    | Pick<UnitBrandingRecord, 'publicNameOverride' | 'shortNameOverride'>
    | null
    | undefined,
) {
  const publicName = branding?.publicNameOverride?.trim()

  if (publicName) {
    return publicName
  }

  const shortName = branding?.shortNameOverride?.trim()

  if (shortName) {
    return shortName
  }

  return null
}

function assertCanWriteUnitScopedBranding(
  actor: AuthenticatedUserData,
  unitId: string,
) {
  const decision = evaluateActorMultiUnitScope(actor, {
    operation: 'STRUCTURAL_WRITE',
    ownership: createLocalUnitOwnershipBinding(unitId),
    requestedUnitId: unitId,
  })

  if (!decision.allowed) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'User is not allowed to edit white label overrides for this unit context.',
    )
  }
}

function assertCanReadUnitScopedBranding(
  actor: AuthenticatedUserData,
  unitId: string,
) {
  const decision = evaluateActorMultiUnitScope(actor, {
    operation: 'READ',
    ownership: createLocalUnitOwnershipBinding(unitId),
    requestedUnitId: unitId,
  })

  if (!decision.allowed) {
    throw new AppError(
      'FORBIDDEN',
      403,
      'User is not allowed to read white label overrides for this unit context.',
    )
  }
}

function assertCanEditWhiteLabel(actor: AuthenticatedUserData) {
  if (canEditWhiteLabel(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission for the Phase 5 white label editor.',
  )
}

function assertCanViewWhiteLabel(actor: AuthenticatedUserData) {
  if (canViewWhiteLabel(actor)) {
    return
  }

  throw new AppError(
    'FORBIDDEN',
    403,
    'Missing permission for the Phase 5 white label administration surface.',
  )
}

function assertCanMutateExistingBrandAsset(
  actor: AuthenticatedUserData,
  asset: BrandAssetScopedRecord,
  targetUnitId: string | null,
) {
  const existingUnitId = asset.unitBranding?.unitId ?? null

  if (existingUnitId) {
    assertCanWriteUnitScopedBranding(actor, existingUnitId)
  }

  if (existingUnitId !== targetUnitId) {
    throw new AppError(
      'CONFLICT',
      409,
      'Existing brand assets cannot be reassigned to another branding scope.',
    )
  }
}

function assertCanMutateExistingDomainBinding(
  actor: AuthenticatedUserData,
  binding: DomainBindingRecord,
  targetUnitId: string | null,
) {
  if (binding.unitId) {
    assertCanWriteUnitScopedBranding(actor, binding.unitId)
  }

  if ((binding.unitId ?? null) !== targetUnitId) {
    throw new AppError(
      'CONFLICT',
      409,
      'Existing domain bindings cannot be reassigned to another branding scope.',
    )
  }
}

function resolveDomainBindingMatch(
  bindings: BrandingSerializableSnapshot['domainBindings'],
  hostname: string | null,
  surface: DomainSurface,
) {
  if (!hostname) {
    return null
  }

  const normalizedHostname = normalizeHostname(hostname)
  const activeBindings = bindings.filter(
    (binding) =>
      binding.status !== 'DISABLED' && normalizeHostname(binding.hostname) === normalizedHostname,
  )

  return (
    activeBindings.find(
      (binding) => binding.surface === surface && binding.status === 'VERIFIED',
    ) ??
    activeBindings.find((binding) => binding.surface === surface) ??
    activeBindings.find((binding) => binding.status === 'VERIFIED') ??
    activeBindings[0] ??
    null
  )
}

function resolveAssets(
  state: BrandingSerializableSnapshot,
  unitBrandingId: string | null,
) {
  const tenantAssets = state.brandAssets.filter(
    (asset) => asset.active && asset.unitBrandingId === null,
  )
  const unitAssets = unitBrandingId
    ? state.brandAssets.filter(
        (asset) => asset.active && asset.unitBrandingId === unitBrandingId,
      )
    : []

  const resolveRole = (role: string) =>
    unitAssets.find((asset) => asset.role === role)?.assetUrl ??
    tenantAssets.find((asset) => asset.role === role)?.assetUrl ??
    buildDefaultBrandRuntime().assets[mapBrandAssetRoleToRuntimeKey(role)]

  return {
    documentFooterUrl: resolveRole('DOCUMENT_FOOTER'),
    documentHeaderUrl: resolveRole('DOCUMENT_HEADER'),
    emailHeaderUrl: resolveRole('EMAIL_HEADER'),
    faviconUrl: resolveRole('FAVICON'),
    loginImageUrl: resolveRole('LOGIN_IMAGE'),
    logoMonochromeUrl: resolveRole('LOGO_MONO'),
    logoPrimaryUrl: resolveRole('LOGO_PRIMARY'),
    ogImageUrl: resolveRole('OG_IMAGE'),
    pwaIcon192Url: resolveRole('PWA_ICON_192'),
    pwaIcon512Url: resolveRole('PWA_ICON_512'),
  }
}

function mapBrandAssetRoleToRuntimeKey(role: string) {
  switch (role) {
    case 'DOCUMENT_FOOTER':
      return 'documentFooterUrl' as const
    case 'DOCUMENT_HEADER':
      return 'documentHeaderUrl' as const
    case 'EMAIL_HEADER':
      return 'emailHeaderUrl' as const
    case 'FAVICON':
      return 'faviconUrl' as const
    case 'LOGIN_IMAGE':
      return 'loginImageUrl' as const
    case 'LOGO_MONO':
      return 'logoMonochromeUrl' as const
    case 'LOGO_PRIMARY':
      return 'logoPrimaryUrl' as const
    case 'OG_IMAGE':
      return 'ogImageUrl' as const
    case 'PWA_ICON_192':
      return 'pwaIcon192Url' as const
    case 'PWA_ICON_512':
    default:
      return 'pwaIcon512Url' as const
  }
}

function mergeTheme(
  tenantThemeJson: unknown,
  unitThemeOverridesJson: unknown,
): BrandThemeConfig {
  const fallback = buildDefaultBrandRuntime().theme
  const tenantTheme = normalizeTheme(tenantThemeJson)
  const unitTheme = normalizeTheme(unitThemeOverridesJson)

  return {
    backgroundColor:
      unitTheme.backgroundColor ?? tenantTheme.backgroundColor ?? fallback.backgroundColor,
    backgroundStrongColor:
      unitTheme.backgroundStrongColor ??
      tenantTheme.backgroundStrongColor ??
      fallback.backgroundStrongColor,
    fontPreset: unitTheme.fontPreset ?? tenantTheme.fontPreset ?? fallback.fontPreset,
    foregroundColor:
      unitTheme.foregroundColor ?? tenantTheme.foregroundColor ?? fallback.foregroundColor,
    mutedColor: unitTheme.mutedColor ?? tenantTheme.mutedColor ?? fallback.mutedColor,
    primaryColor: unitTheme.primaryColor ?? tenantTheme.primaryColor ?? fallback.primaryColor,
    radiusScale: unitTheme.radiusScale ?? tenantTheme.radiusScale ?? fallback.radiusScale,
    secondaryColor:
      unitTheme.secondaryColor ?? tenantTheme.secondaryColor ?? fallback.secondaryColor,
    surfaceColor: unitTheme.surfaceColor ?? tenantTheme.surfaceColor ?? fallback.surfaceColor,
  }
}

function normalizeTheme(themeJson: unknown) {
  if (!themeJson || typeof themeJson !== 'object' || Array.isArray(themeJson)) {
    return {} as Partial<BrandThemeConfig>
  }

  return themeJson as Partial<BrandThemeConfig>
}

function normalizeHostname(hostname: string | null) {
  if (!hostname) {
    return null
  }

  const [value] = hostname.split(':')
  return value?.trim().toLowerCase() || null
}

function normalizeOptionalUnitId(unitId: string | null | undefined) {
  if (typeof unitId !== 'string') {
    return null
  }

  const normalized = unitId.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeRequiredHostname(hostname: string) {
  const normalized = normalizeHostname(hostname)

  if (!normalized) {
    throw new AppError('BAD_REQUEST', 400, 'A valid hostname is required.')
  }

  return normalized
}

function toNullableInputJsonValue(value: unknown) {
  return value === null || value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue)
}

function slugifyBrand(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized

  const red = Number.parseInt(expanded.slice(0, 2), 16)
  const green = Number.parseInt(expanded.slice(2, 4), 16)
  const blue = Number.parseInt(expanded.slice(4, 6), 16)

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function darkenHex(hex: string, amount: number) {
  const normalized = hex.replace('#', '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => `${character}${character}`)
          .join('')
      : normalized

  const clamp = (value: number) => Math.max(0, Math.min(255, value))
  const red = clamp(Math.round(Number.parseInt(expanded.slice(0, 2), 16) * (1 - amount)))
  const green = clamp(Math.round(Number.parseInt(expanded.slice(2, 4), 16) * (1 - amount)))
  const blue = clamp(Math.round(Number.parseInt(expanded.slice(4, 6), 16) * (1 - amount)))

  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

function getFallbackHostname() {
  try {
    return new URL(getEnv().APP_URL).host
  } catch {
    return 'localhost:3000'
  }
}

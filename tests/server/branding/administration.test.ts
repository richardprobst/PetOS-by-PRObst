import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  getBrandingAdminSnapshot,
  saveBrandAsset,
  saveDomainBinding,
} from '../../../features/branding/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'
import { prisma } from '../../../server/db/prisma'
import { AppError } from '../../../server/http/errors'

const restorers: Array<() => void> = []

const localBrandingActor: AuthenticatedUserData = {
  active: true,
  email: 'branding@petos.app',
  id: 'user_branding_local',
  multiUnitContext: {
    activeUnitId: 'unit_local',
    contextOrigin: 'SESSION_DEFAULT',
    contextType: 'LOCAL',
  },
  name: 'Branding Local',
  permissions: ['white_label.visualizar', 'white_label.editar', 'dominio.editar'],
  profiles: ['Gerente'],
  unitId: 'unit_local',
  userType: 'ADMIN',
}

afterEach(() => {
  while (restorers.length > 0) {
    restorers.pop()?.()
  }
})

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

function installBrandingReadStubs() {
  replaceMethod(prisma as object, 'tenantBranding', {
    findUnique: async () => ({
      emailFooterText: 'Tenant footer',
      emailSignatureName: 'PetOS',
      id: 'default',
      legalName: 'PetOS LTDA',
      loginDescription: 'Tenant login',
      loginHeadline: 'Tenant login headline',
      primaryDomain: 'pets.local',
      publicName: 'PetOS',
      publicTagline: 'Tenant tagline',
      reportCardFooterText: 'Tenant report footer',
      reportCardHeaderText: 'Tenant report header',
      shortName: 'PetOS',
      slug: 'petos',
      supportEmail: 'suporte@petos.app',
      supportPhone: '11999999999',
      themeJson: {
        primaryColor: '#eb6b34',
      },
      tutorDescription: 'Tutor tenant',
      tutorHeadline: 'Tutor tenant',
    }),
  })

  replaceMethod(prisma as object, 'unitBranding', {
    findMany: async () => [
      {
        emailFooterTextOverride: null,
        emailSignatureNameOverride: null,
        id: 'branding_local',
        loginDescriptionOverride: null,
        loginHeadlineOverride: 'Login local',
        publicNameOverride: 'PetOS Local',
        publicTaglineOverride: 'Tagline local',
        reportCardFooterOverride: null,
        reportCardHeaderOverride: null,
        shortNameOverride: 'Local',
        supportEmailOverride: null,
        supportPhoneOverride: null,
        themeOverridesJson: {
          primaryColor: '#1f7a72',
        },
        tutorDescriptionOverride: null,
        tutorHeadlineOverride: null,
        unitId: 'unit_local',
      },
      {
        emailFooterTextOverride: null,
        emailSignatureNameOverride: null,
        id: 'branding_branch',
        loginDescriptionOverride: null,
        loginHeadlineOverride: 'Login branch',
        publicNameOverride: 'PetOS Branch',
        publicTaglineOverride: 'Tagline branch',
        reportCardFooterOverride: null,
        reportCardHeaderOverride: null,
        shortNameOverride: 'Branch',
        supportEmailOverride: null,
        supportPhoneOverride: null,
        themeOverridesJson: {
          primaryColor: '#004488',
        },
        tutorDescriptionOverride: null,
        tutorHeadlineOverride: null,
        unitId: 'unit_branch',
      },
    ],
  })

  replaceMethod(prisma as object, 'brandAsset', {
    findMany: async () => [
      {
        active: true,
        altText: null,
        assetUrl: '/tenant-logo.svg',
        id: 'asset_tenant',
        label: 'Tenant',
        role: 'LOGO_PRIMARY',
        tenantBrandingId: 'default',
        unitBrandingId: null,
      },
      {
        active: true,
        altText: null,
        assetUrl: '/local-logo.svg',
        id: 'asset_local',
        label: 'Local',
        role: 'LOGO_PRIMARY',
        tenantBrandingId: null,
        unitBrandingId: 'branding_local',
      },
      {
        active: true,
        altText: null,
        assetUrl: '/branch-logo.svg',
        id: 'asset_branch',
        label: 'Branch',
        role: 'LOGO_PRIMARY',
        tenantBrandingId: null,
        unitBrandingId: 'branding_branch',
      },
    ],
  })

  replaceMethod(prisma as object, 'domainBinding', {
    findMany: async () => [
      {
        hostname: 'pets.local',
        id: 'domain_global',
        isPrimary: true,
        notes: null,
        status: 'VERIFIED',
        surface: 'PUBLIC_SITE',
        unitId: null,
      },
      {
        hostname: 'local.pets.local',
        id: 'domain_local',
        isPrimary: false,
        notes: null,
        status: 'VERIFIED',
        surface: 'TUTOR',
        unitId: 'unit_local',
      },
      {
        hostname: 'branch.pets.local',
        id: 'domain_branch',
        isPrimary: false,
        notes: null,
        status: 'VERIFIED',
        surface: 'TUTOR',
        unitId: 'unit_branch',
      },
    ],
  })

  replaceMethod(prisma as object, 'configurationPublish', {
    findFirst: async () => null,
  })
}

test('getBrandingAdminSnapshot filters live branding state to the selected unit context', async () => {
  installBrandingReadStubs()

  const snapshot = await getBrandingAdminSnapshot(localBrandingActor)

  assert.deepEqual(
    snapshot.serializableLiveState?.unitBrandings.map((entry) => entry.unitId),
    ['unit_local'],
  )
  assert.deepEqual(
    snapshot.serializableLiveState?.brandAssets.map((entry) => entry.id).sort(),
    ['asset_local', 'asset_tenant'],
  )
  assert.deepEqual(
    snapshot.serializableLiveState?.domainBindings.map((entry) => entry.id).sort(),
    ['domain_global', 'domain_local'],
  )
  assert.deepEqual(
    snapshot.serializableLiveState?.brandAssets.map((entry) => ({
      id: entry.id,
      scopeSummary: entry.scopeSummary,
    })),
    [
      {
        id: 'asset_tenant',
        scopeSummary: 'Tenant global',
      },
      {
        id: 'asset_local',
        scopeSummary: 'Unidade - PetOS Local',
      },
    ],
  )
  assert.deepEqual(
    snapshot.serializableLiveState?.domainBindings.map((entry) => ({
      id: entry.id,
      scopeSummary: entry.scopeSummary,
    })),
    [
      {
        id: 'domain_global',
        scopeSummary: 'Tenant global',
      },
      {
        id: 'domain_local',
        scopeSummary: 'Unidade - PetOS Local',
      },
    ],
  )
  assert.equal(snapshot.liveRuntime.identity.publicName, 'PetOS Local')
})

test('getBrandingAdminSnapshot blocks cross-unit reads for local branding operators', async () => {
  await assert.rejects(
    () => getBrandingAdminSnapshot(localBrandingActor, 'unit_branch'),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message ===
        'User is not allowed to read white label overrides for this unit context.',
  )
})

test('saveBrandAsset rejects cross-unit updates addressed by asset id', async () => {
  const transactionClient = {
    auditLog: {
      create: async () => ({}),
    },
    brandAsset: {
      create: async () => {
        throw new Error('brand asset should not be created when scope validation fails')
      },
      findFirst: async () => null,
      findUnique: async () => ({
        id: 'asset_branch',
        unitBranding: {
          unitId: 'unit_branch',
        },
        unitBrandingId: 'branding_branch',
      }),
      update: async () => {
        throw new Error('brand asset should not be updated when scope validation fails')
      },
    },
    unitBranding: {
      upsert: async () => ({
        id: 'branding_local',
      }),
    },
  }

  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  )

  await assert.rejects(
    () =>
      saveBrandAsset(localBrandingActor, {
        active: true,
        assetId: 'asset_branch',
        assetUrl: '/new-logo.svg',
        role: 'LOGO_PRIMARY',
        unitId: 'unit_local',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message ===
        'User is not allowed to edit white label overrides for this unit context.',
  )
})

test('saveDomainBinding rejects cross-unit updates addressed by binding id', async () => {
  const transactionClient = {
    auditLog: {
      create: async () => ({}),
    },
    domainBinding: {
      create: async () => {
        throw new Error('domain binding should not be created when scope validation fails')
      },
      findUnique: async () => ({
        hostname: 'branch.pets.local',
        id: 'binding_branch',
        isPrimary: false,
        notes: null,
        status: 'VERIFIED',
        surface: 'TUTOR',
        unitId: 'unit_branch',
      }),
      update: async () => {
        throw new Error('domain binding should not be updated when scope validation fails')
      },
    },
  }

  replaceMethod(
    prisma as object,
    '$transaction',
    async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  )

  await assert.rejects(
    () =>
      saveDomainBinding(localBrandingActor, {
        domainBindingId: 'binding_branch',
        hostname: 'local.pets.local',
        isPrimary: false,
        status: 'VERIFIED',
        surface: 'TUTOR',
        unitId: 'unit_local',
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.message ===
        'User is not allowed to edit white label overrides for this unit context.',
  )
})

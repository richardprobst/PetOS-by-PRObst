import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildBrandRuntimeFromSerializableState,
  buildBrandCssVariables,
  canEditWhiteLabel,
  canPublishWhiteLabel,
  getBrandBodyClassName,
} from '../../../features/branding/services'
import type { AuthenticatedUserData } from '../../../server/auth/types'

test('buildBrandRuntimeFromSerializableState merges tenant, unit and domain overrides', () => {
  const runtime = buildBrandRuntimeFromSerializableState(
    {
      brandAssets: [
        {
          active: true,
          altText: null,
          assetUrl: '/tenant-logo.svg',
          id: 'asset_tenant_logo',
          label: 'Logo tenant',
          role: 'LOGO_PRIMARY',
          tenantBrandingId: 'default',
          unitBrandingId: null,
        },
        {
          active: true,
          altText: null,
          assetUrl: '/unit-logo.svg',
          id: 'asset_unit_logo',
          label: 'Logo unidade',
          role: 'LOGO_PRIMARY',
          tenantBrandingId: null,
          unitBrandingId: 'branding_unit_1',
        },
      ],
      domainBindings: [
        {
          hostname: 'spa.pets.local',
          id: 'domain_1',
          isPrimary: true,
          notes: null,
          status: 'VERIFIED',
          surface: 'TUTOR',
          unitId: 'unit_1',
        },
      ],
      tenantBranding: {
        emailFooterText: 'Rodape tenant',
        emailSignatureName: 'Equipe tenant',
        id: 'default',
        legalName: 'PetOS LTDA',
        loginDescription: 'Descricao tenant',
        loginHeadline: 'Login tenant',
        primaryDomain: 'pets.local',
        publicName: 'PetOS Spa',
        publicTagline: 'Tagline tenant',
        reportCardFooterText: 'Rodape report card',
        reportCardHeaderText: 'Cabecalho report card',
        shortName: 'Spa',
        slug: 'petos-spa',
        supportEmail: 'suporte@pets.local',
        supportPhone: '11999999999',
        themeJson: {
          backgroundColor: '#fef4ea',
          backgroundStrongColor: '#fff7f0',
          fontPreset: 'FRIENDLY',
          foregroundColor: '#142020',
          mutedColor: '#4f6767',
          primaryColor: '#eb6b34',
          radiusScale: 'SOFT',
          secondaryColor: '#2c7a7b',
          surfaceColor: '#fffdfa',
        },
        tutorDescription: 'Descricao tutor tenant',
        tutorHeadline: 'Portal do tutor tenant',
      },
      unitBrandings: [
        {
          emailFooterTextOverride: null,
          emailSignatureNameOverride: null,
          id: 'branding_unit_1',
          loginDescriptionOverride: null,
          loginHeadlineOverride: 'Login unidade',
          publicNameOverride: 'Spa unidade',
          publicTaglineOverride: 'Tagline unidade',
          reportCardFooterOverride: null,
          reportCardHeaderOverride: null,
          shortNameOverride: 'Unidade',
          supportEmailOverride: null,
          supportPhoneOverride: null,
          themeOverridesJson: {
            primaryColor: '#1f7a72',
          },
          tutorDescriptionOverride: null,
          tutorHeadlineOverride: 'Tutor unidade',
          unitId: 'unit_1',
        },
      ],
    },
    {
      hostname: 'spa.pets.local',
      source: 'PUBLISHED',
      surface: 'TUTOR',
    },
  )

  assert.equal(runtime.identity.publicName, 'Spa unidade')
  assert.equal(runtime.copy.loginHeadline, 'Login unidade')
  assert.equal(runtime.copy.tutorHeadline, 'Tutor unidade')
  assert.equal(runtime.assets.logoPrimaryUrl, '/unit-logo.svg')
  assert.equal(runtime.domain.hostname, 'spa.pets.local')
  assert.equal(runtime.domain.unitId, 'unit_1')
  assert.equal(runtime.theme.primaryColor, '#1f7a72')
})

test('buildBrandCssVariables and getBrandBodyClassName expose runtime theme tokens', () => {
  const runtime = buildBrandRuntimeFromSerializableState(null, {
    hostname: null,
    source: 'LIVE',
    surface: 'PUBLIC_SITE',
  })

  const variables = buildBrandCssVariables(runtime)

  assert.equal(variables['--accent'], runtime.theme.primaryColor)
  assert.equal(getBrandBodyClassName(runtime), 'brand-font-manrope')
})

test('phase 5 white label permissions preserve legacy admin compatibility', () => {
  const legacyAdmin: AuthenticatedUserData = {
    active: true,
    email: 'admin@petos.app',
    id: 'user_admin',
    name: 'Administrador',
    permissions: [],
    profiles: ['Administrador'],
    unitId: 'unit_local',
    userType: 'ADMIN',
  }

  assert.equal(canEditWhiteLabel(legacyAdmin), true)
  assert.equal(canPublishWhiteLabel(legacyAdmin), true)
})

test('phase 5 white label permissions accept the legacy configuracao.editar alias', () => {
  const legacyEditor: AuthenticatedUserData = {
    active: true,
    email: 'config@petos.app',
    id: 'legacy_editor',
    name: 'Config Editor',
    permissions: ['configuracao.editar'],
    profiles: ['Recepcionista'],
    unitId: 'unit_local',
    userType: 'ADMIN',
  }

  assert.equal(canEditWhiteLabel(legacyEditor), true)
})

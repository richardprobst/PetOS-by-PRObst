'use server'

import type { Route } from 'next'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  saveBrandAsset,
  saveDomainBinding,
  saveTenantBranding,
  saveUnitBranding,
} from '@/features/branding/services'
import {
  configurationApprovalDecisionInputSchema,
  configurationPublishRequestInputSchema,
  configurationRollbackInputSchema,
  generalConfigurationInputSchema,
  aiAdministrativeConfigurationInputSchema,
  brandAssetInputSchema,
  domainBindingInputSchema,
  integrationConnectionInputSchema,
  integrationSecretInputSchema,
  integrationTestInputSchema,
  tenantBrandingInputSchema,
  unitBrandingInputSchema,
  unitConfigurationInputSchema,
} from '@/features/configuration/schemas'
import {
  decideConfigurationApproval,
  requestConfigurationPublish,
  rollbackConfigurationPublish,
  updateAiAdministrativeConfiguration,
  updateGeneralConfiguration,
  updateUnitConfiguration,
} from '@/features/configuration/management'
import {
  rotateIntegrationSecret,
  testIntegrationConnection,
  upsertIntegrationConnection,
} from '@/features/integrations-admin/services'
import { requireInternalAreaUser } from '@/server/authorization/guards'
import { getActionErrorMessage } from '@/server/http/action-feedback'
import {
  getBooleanFormValue,
  getOptionalFormValue,
  getRequiredFormValue,
} from '@/server/http/form-data'
import { enforceMutationRateLimit } from '@/server/security/operations'

const configurationPath = '/admin/configuracoes'
const runtimePaths = ['/', '/entrar', '/tutor', '/admin', '/admin/configuracoes', '/admin/sistema']

function buildConfigurationRedirect(input: {
  message?: string
  section?: string
  status: 'created' | 'error' | 'saved' | 'updated'
  unitId?: string | null
}): Route {
  const searchParams = new URLSearchParams({
    status: input.status,
  })

  if (input.message) {
    searchParams.set('message', input.message)
  }

  if (input.unitId) {
    searchParams.set('unitId', input.unitId)
  }

  const hash = input.section ? `#${input.section}` : ''
  return `${configurationPath}?${searchParams.toString()}${hash}` as Route
}

function revalidateConfigurationSurfaces() {
  for (const path of runtimePaths) {
    revalidatePath(path)
  }
}

function getSelectedUnitId(formData: FormData) {
  return getOptionalFormValue(formData, 'selectedUnitId')
}

function getOptionalIntegerField(formData: FormData, key: string) {
  const value = getOptionalFormValue(formData, key)
  return value ?? ''
}

function getThemePayload(formData: FormData) {
  return {
    backgroundColor: getRequiredFormValue(formData, 'backgroundColor'),
    backgroundStrongColor: getRequiredFormValue(formData, 'backgroundStrongColor'),
    fontPreset: getRequiredFormValue(formData, 'fontPreset'),
    foregroundColor: getRequiredFormValue(formData, 'foregroundColor'),
    mutedColor: getRequiredFormValue(formData, 'mutedColor'),
    primaryColor: getRequiredFormValue(formData, 'primaryColor'),
    radiusScale: getRequiredFormValue(formData, 'radiusScale'),
    secondaryColor: getRequiredFormValue(formData, 'secondaryColor'),
    surfaceColor: getRequiredFormValue(formData, 'surfaceColor'),
  }
}

function getOptionalThemeOverridePayload(formData: FormData) {
  return {
    backgroundColorOverride: getOptionalFormValue(formData, 'backgroundColorOverride'),
    backgroundStrongColorOverride: getOptionalFormValue(formData, 'backgroundStrongColorOverride'),
    foregroundColorOverride: getOptionalFormValue(formData, 'foregroundColorOverride'),
    mutedColorOverride: getOptionalFormValue(formData, 'mutedColorOverride'),
    primaryColorOverride: getOptionalFormValue(formData, 'primaryColorOverride'),
    secondaryColorOverride: getOptionalFormValue(formData, 'secondaryColorOverride'),
    surfaceColorOverride: getOptionalFormValue(formData, 'surfaceColorOverride'),
  }
}

function buildIntegrationConfigJson(formData: FormData) {
  const entries = Array.from(formData.entries())
  const configEntries = entries.filter(
    ([key, value]) => key.startsWith('config.') && typeof value === 'string' && value.trim() !== '',
  )

  if (configEntries.length === 0) {
    return undefined
  }

  return JSON.stringify(
    Object.fromEntries(configEntries.map(([key, value]) => [key.replace(/^config\./, ''), value])),
  )
}

export async function saveGeneralConfigurationAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.general.save')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = generalConfigurationInputSchema.parse({
      companyName: getRequiredFormValue(formData, 'companyName'),
      publicName: getRequiredFormValue(formData, 'publicName'),
      supportEmail: getOptionalFormValue(formData, 'supportEmail'),
      supportPhone: getOptionalFormValue(formData, 'supportPhone'),
    })

    await updateGeneralConfiguration(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'geral',
      status: 'saved',
      unitId: selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'geral',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function saveUnitConfigurationAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.unit.save')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = unitConfigurationInputSchema.parse({
      cancellationWindowHours: getRequiredFormValue(formData, 'cancellationWindowHours'),
      clientCreditExpirationDays: getRequiredFormValue(formData, 'clientCreditExpirationDays'),
      crmInactivityDays: getRequiredFormValue(formData, 'crmInactivityDays'),
      crmPostServiceDelayHours: getRequiredFormValue(formData, 'crmPostServiceDelayHours'),
      crmReviewDelayHours: getRequiredFormValue(formData, 'crmReviewDelayHours'),
      depositExpirationMinutes: getRequiredFormValue(formData, 'depositExpirationMinutes'),
      integrationRetentionDays: getRequiredFormValue(formData, 'integrationRetentionDays'),
      noShowToleranceMinutes: getRequiredFormValue(formData, 'noShowToleranceMinutes'),
      preCheckInWindowHours: getRequiredFormValue(formData, 'preCheckInWindowHours'),
      rescheduleWindowHours: getRequiredFormValue(formData, 'rescheduleWindowHours'),
      unitId: getRequiredFormValue(formData, 'unitId'),
    })

    await updateUnitConfiguration(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'unidades',
      status: 'saved',
      unitId: input.unitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'unidades',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function saveAiAdministrativeConfigurationAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.ai.save')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = aiAdministrativeConfigurationInputSchema.parse({
      assistantDesiredEnabled: getBooleanFormValue(formData, 'assistantDesiredEnabled'),
      assistantDesiredQuota: getOptionalIntegerField(formData, 'assistantDesiredQuota'),
      assistantExperienceMode: getRequiredFormValue(formData, 'assistantExperienceMode'),
      imageAnalysisDesiredEnabled: getBooleanFormValue(formData, 'imageAnalysisDesiredEnabled'),
      imageAnalysisDesiredQuota: getOptionalIntegerField(formData, 'imageAnalysisDesiredQuota'),
      predictiveDesiredEnabled: getBooleanFormValue(formData, 'predictiveDesiredEnabled'),
      predictiveDesiredQuota: getOptionalIntegerField(formData, 'predictiveDesiredQuota'),
    })

    await updateAiAdministrativeConfiguration(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'ia',
      status: 'saved',
      unitId: selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'ia',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function saveIntegrationConnectionAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.integrations.save')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = integrationConnectionInputSchema.parse({
      configJson: buildIntegrationConfigJson(formData),
      connectionId: getOptionalFormValue(formData, 'connectionId'),
      displayName: getRequiredFormValue(formData, 'displayName'),
      providerKey: getRequiredFormValue(formData, 'providerKey'),
      scope: getRequiredFormValue(formData, 'scope'),
      status: getRequiredFormValue(formData, 'status'),
      unitId: getOptionalFormValue(formData, 'unitId'),
    })

    await upsertIntegrationConnection(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'integracoes',
      status: input.connectionId ? 'updated' : 'created',
      unitId: input.unitId ?? selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'integracoes',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function rotateIntegrationSecretAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.integrations.rotate-secret')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = integrationSecretInputSchema.parse({
      connectionId: getRequiredFormValue(formData, 'connectionId'),
      secretKey: getRequiredFormValue(formData, 'secretKey'),
      secretValue: getRequiredFormValue(formData, 'secretValue'),
    })

    await rotateIntegrationSecret(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'integracoes',
      status: 'saved',
      unitId: selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'integracoes',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function testIntegrationConnectionAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.integrations.test')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = integrationTestInputSchema.parse({
      connectionId: getRequiredFormValue(formData, 'connectionId'),
    })

    await testIntegrationConnection(actor, input.connectionId)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'integracoes',
      status: 'saved',
      unitId: selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'integracoes',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function saveTenantBrandingAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.branding.tenant.save')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const parsed = tenantBrandingInputSchema.parse({
      ...getThemePayload(formData),
      emailFooterText: getOptionalFormValue(formData, 'emailFooterText'),
      emailSignatureName: getOptionalFormValue(formData, 'emailSignatureName'),
      legalName: getOptionalFormValue(formData, 'legalName'),
      loginDescription: getOptionalFormValue(formData, 'loginDescription'),
      loginHeadline: getRequiredFormValue(formData, 'loginHeadline'),
      primaryDomain: getOptionalFormValue(formData, 'primaryDomain'),
      publicName: getRequiredFormValue(formData, 'publicName'),
      publicTagline: getOptionalFormValue(formData, 'publicTagline'),
      reportCardFooterText: getOptionalFormValue(formData, 'reportCardFooterText'),
      reportCardHeaderText: getOptionalFormValue(formData, 'reportCardHeaderText'),
      shortName: getRequiredFormValue(formData, 'shortName'),
      supportEmail: getOptionalFormValue(formData, 'supportEmail'),
      supportPhone: getOptionalFormValue(formData, 'supportPhone'),
      tutorDescription: getOptionalFormValue(formData, 'tutorDescription'),
      tutorHeadline: getRequiredFormValue(formData, 'tutorHeadline'),
    })

    await saveTenantBranding(actor, {
      emailFooterText: parsed.emailFooterText,
      emailSignatureName: parsed.emailSignatureName,
      legalName: parsed.legalName,
      loginDescription: parsed.loginDescription,
      loginHeadline: parsed.loginHeadline,
      primaryDomain: parsed.primaryDomain,
      publicName: parsed.publicName,
      publicTagline: parsed.publicTagline,
      reportCardFooterText: parsed.reportCardFooterText,
      reportCardHeaderText: parsed.reportCardHeaderText,
      shortName: parsed.shortName,
      supportEmail: parsed.supportEmail,
      supportPhone: parsed.supportPhone,
      theme: {
        backgroundColor: parsed.backgroundColor,
        backgroundStrongColor: parsed.backgroundStrongColor,
        fontPreset: parsed.fontPreset,
        foregroundColor: parsed.foregroundColor,
        mutedColor: parsed.mutedColor,
        primaryColor: parsed.primaryColor,
        radiusScale: parsed.radiusScale,
        secondaryColor: parsed.secondaryColor,
        surfaceColor: parsed.surfaceColor,
      },
      tutorDescription: parsed.tutorDescription,
      tutorHeadline: parsed.tutorHeadline,
    })
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'white-label',
      status: 'saved',
      unitId: selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'white-label',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function saveUnitBrandingAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.branding.unit.save')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const parsed = unitBrandingInputSchema.parse({
      ...getOptionalThemeOverridePayload(formData),
      emailFooterTextOverride: getOptionalFormValue(formData, 'emailFooterTextOverride'),
      emailSignatureNameOverride: getOptionalFormValue(formData, 'emailSignatureNameOverride'),
      loginDescriptionOverride: getOptionalFormValue(formData, 'loginDescriptionOverride'),
      loginHeadlineOverride: getOptionalFormValue(formData, 'loginHeadlineOverride'),
      publicNameOverride: getOptionalFormValue(formData, 'publicNameOverride'),
      publicTaglineOverride: getOptionalFormValue(formData, 'publicTaglineOverride'),
      reportCardFooterOverride: getOptionalFormValue(formData, 'reportCardFooterOverride'),
      reportCardHeaderOverride: getOptionalFormValue(formData, 'reportCardHeaderOverride'),
      shortNameOverride: getOptionalFormValue(formData, 'shortNameOverride'),
      supportEmailOverride: getOptionalFormValue(formData, 'supportEmailOverride'),
      supportPhoneOverride: getOptionalFormValue(formData, 'supportPhoneOverride'),
      tutorDescriptionOverride: getOptionalFormValue(formData, 'tutorDescriptionOverride'),
      tutorHeadlineOverride: getOptionalFormValue(formData, 'tutorHeadlineOverride'),
      unitId: getRequiredFormValue(formData, 'unitId'),
    })

    await saveUnitBranding(actor, {
      emailFooterTextOverride: parsed.emailFooterTextOverride,
      emailSignatureNameOverride: parsed.emailSignatureNameOverride,
      loginDescriptionOverride: parsed.loginDescriptionOverride,
      loginHeadlineOverride: parsed.loginHeadlineOverride,
      publicNameOverride: parsed.publicNameOverride,
      publicTaglineOverride: parsed.publicTaglineOverride,
      reportCardFooterOverride: parsed.reportCardFooterOverride,
      reportCardHeaderOverride: parsed.reportCardHeaderOverride,
      shortNameOverride: parsed.shortNameOverride,
      supportEmailOverride: parsed.supportEmailOverride,
      supportPhoneOverride: parsed.supportPhoneOverride,
      themeOverrides: {
        backgroundColor: parsed.backgroundColorOverride,
        backgroundStrongColor: parsed.backgroundStrongColorOverride,
        foregroundColor: parsed.foregroundColorOverride,
        mutedColor: parsed.mutedColorOverride,
        primaryColor: parsed.primaryColorOverride,
        secondaryColor: parsed.secondaryColorOverride,
        surfaceColor: parsed.surfaceColorOverride,
      },
      tutorDescriptionOverride: parsed.tutorDescriptionOverride,
      tutorHeadlineOverride: parsed.tutorHeadlineOverride,
      unitId: parsed.unitId,
    })
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'white-label-unidade',
      status: 'saved',
      unitId: parsed.unitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'white-label-unidade',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function saveBrandAssetAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.branding.asset.save')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const assetScope = getOptionalFormValue(formData, 'assetScope') === 'UNIT' ? 'UNIT' : 'TENANT'
    const input = brandAssetInputSchema.parse({
      active: getBooleanFormValue(formData, 'active'),
      altText: getOptionalFormValue(formData, 'altText'),
      assetId: getOptionalFormValue(formData, 'assetId'),
      assetUrl: getOptionalFormValue(formData, 'assetUrl'),
      label: getOptionalFormValue(formData, 'label'),
      role: getRequiredFormValue(formData, 'role'),
      unitId: assetScope === 'UNIT' ? getOptionalFormValue(formData, 'unitId') : undefined,
    })

    await saveBrandAsset(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'assets',
      status: input.assetId ? 'updated' : 'created',
      unitId: input.unitId ?? selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'assets',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function saveDomainBindingAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.branding.domain.save')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const domainScope = getOptionalFormValue(formData, 'domainScope') === 'UNIT' ? 'UNIT' : 'TENANT'
    const input = domainBindingInputSchema.parse({
      domainBindingId: getOptionalFormValue(formData, 'domainBindingId'),
      hostname: getRequiredFormValue(formData, 'hostname'),
      isPrimary: getBooleanFormValue(formData, 'isPrimary'),
      notes: getOptionalFormValue(formData, 'notes'),
      status: getRequiredFormValue(formData, 'status'),
      surface: getRequiredFormValue(formData, 'surface'),
      unitId: domainScope === 'UNIT' ? getOptionalFormValue(formData, 'unitId') : undefined,
    })

    await saveDomainBinding(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'dominios',
      status: input.domainBindingId ? 'updated' : 'created',
      unitId: input.unitId ?? selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'dominios',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function requestConfigurationPublishAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.publish.request')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = configurationPublishRequestInputSchema.parse({
      summary: getOptionalFormValue(formData, 'summary'),
    })

    await requestConfigurationPublish(actor, input.summary)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'publicacao',
      status: 'created',
      unitId: selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'publicacao',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function decideConfigurationApprovalAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.publish.approval')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = configurationApprovalDecisionInputSchema.parse({
      approvalId: getRequiredFormValue(formData, 'approvalId'),
      decision: getRequiredFormValue(formData, 'decision'),
      reason: getOptionalFormValue(formData, 'reason'),
    })

    await decideConfigurationApproval(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'aprovacoes',
      status: 'updated',
      unitId: selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'aprovacoes',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

export async function rollbackConfigurationPublishAction(formData: FormData) {
  const actor = await requireInternalAreaUser(configurationPath)
  enforceMutationRateLimit(actor, 'admin.settings.publish.rollback')
  const selectedUnitId = getSelectedUnitId(formData)
  let destination: Route

  try {
    const input = configurationRollbackInputSchema.parse({
      publishId: getRequiredFormValue(formData, 'publishId'),
      summary: getOptionalFormValue(formData, 'summary'),
    })

    await rollbackConfigurationPublish(actor, input)
    revalidateConfigurationSurfaces()
    destination = buildConfigurationRedirect({
      section: 'historico-publicacao',
      status: 'created',
      unitId: selectedUnitId,
    })
  } catch (error) {
    destination = buildConfigurationRedirect({
      message: getActionErrorMessage(error),
      section: 'historico-publicacao',
      status: 'error',
      unitId: selectedUnitId,
    })
  }

  redirect(destination)
}

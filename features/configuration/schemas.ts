import { z } from 'zod'
import { brandAssetRoleLabels, domainBindingStatusLabels, domainSurfaceLabels } from '@/features/branding/domain'
import { assistantExperienceModes } from '@/features/configuration/domain'
import { integrationProviderKeys } from '@/features/integrations-admin/domain'

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const trimmedString = z.preprocess(emptyStringToUndefined, z.string().trim().min(1))
const optionalTrimmedString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
)
const optionalUrlString = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .refine(
      (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
      'Informe uma URL absoluta valida ou um caminho interno iniciado por /.',
    )
    .optional(),
)
const optionalEmailString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().email().optional(),
)
const optionalPhoneString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(4).max(32).optional(),
)
const optionalHostnameString = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i,
      'Informe um hostname valido.',
    )
    .optional(),
)
const integerFromForm = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value
    }

    return Number(value)
  },
  z.number().int().nonnegative(),
)
const optionalIntegerFromForm = z.preprocess(
  (value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return undefined
    }

    return Number(value)
  },
  z.number().int().nonnegative().optional(),
)
const colorHexString = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Informe uma cor hexadecimal valida.'),
)

export const generalConfigurationInputSchema = z.object({
  companyName: trimmedString,
  publicName: trimmedString,
  supportEmail: optionalEmailString,
  supportPhone: optionalPhoneString,
})

export const unitConfigurationInputSchema = z.object({
  crmInactivityDays: integerFromForm,
  crmPostServiceDelayHours: integerFromForm,
  crmReviewDelayHours: integerFromForm,
  depositExpirationMinutes: integerFromForm,
  integrationRetentionDays: integerFromForm,
  noShowToleranceMinutes: integerFromForm,
  preCheckInWindowHours: integerFromForm,
  rescheduleWindowHours: integerFromForm,
  unitId: trimmedString,
  cancellationWindowHours: integerFromForm,
  clientCreditExpirationDays: integerFromForm,
})

export const aiAdministrativeConfigurationInputSchema = z.object({
  assistantDesiredEnabled: z.boolean(),
  assistantDesiredQuota: optionalIntegerFromForm,
  imageAnalysisDesiredEnabled: z.boolean(),
  imageAnalysisDesiredQuota: optionalIntegerFromForm,
  predictiveDesiredEnabled: z.boolean(),
  predictiveDesiredQuota: optionalIntegerFromForm,
  assistantExperienceMode: z.enum(assistantExperienceModes),
})

export const integrationConnectionInputSchema = z.object({
  configJson: optionalTrimmedString,
  connectionId: optionalTrimmedString,
  displayName: trimmedString,
  providerKey: z.enum(integrationProviderKeys),
  scope: z.enum(['SYSTEM_GLOBAL', 'UNIT']),
  status: z.enum(['CONFIGURED', 'DISABLED', 'ERROR', 'READY']),
  unitId: optionalTrimmedString,
})

export const integrationSecretInputSchema = z.object({
  connectionId: trimmedString,
  secretKey: trimmedString,
  secretValue: trimmedString,
})

export const integrationTestInputSchema = z.object({
  connectionId: trimmedString,
})

export const tenantBrandingInputSchema = z.object({
  emailFooterText: optionalTrimmedString,
  emailSignatureName: optionalTrimmedString,
  fontPreset: z.enum(['FRIENDLY', 'MANROPE', 'SERIF', 'SYSTEM']),
  legalName: optionalTrimmedString,
  loginDescription: optionalTrimmedString,
  loginHeadline: trimmedString,
  primaryDomain: optionalHostnameString,
  publicName: trimmedString,
  publicTagline: optionalTrimmedString,
  radiusScale: z.enum(['BALANCED', 'SHARP', 'SOFT']),
  reportCardFooterText: optionalTrimmedString,
  reportCardHeaderText: optionalTrimmedString,
  shortName: trimmedString,
  supportEmail: optionalEmailString,
  supportPhone: optionalPhoneString,
  tutorDescription: optionalTrimmedString,
  tutorHeadline: trimmedString,
  backgroundColor: colorHexString,
  backgroundStrongColor: colorHexString,
  foregroundColor: colorHexString,
  mutedColor: colorHexString,
  primaryColor: colorHexString,
  secondaryColor: colorHexString,
  surfaceColor: colorHexString,
})

export const unitBrandingInputSchema = z.object({
  emailFooterTextOverride: optionalTrimmedString,
  emailSignatureNameOverride: optionalTrimmedString,
  loginDescriptionOverride: optionalTrimmedString,
  loginHeadlineOverride: optionalTrimmedString,
  publicNameOverride: optionalTrimmedString,
  publicTaglineOverride: optionalTrimmedString,
  reportCardFooterOverride: optionalTrimmedString,
  reportCardHeaderOverride: optionalTrimmedString,
  shortNameOverride: optionalTrimmedString,
  supportEmailOverride: optionalEmailString,
  supportPhoneOverride: optionalPhoneString,
  tutorDescriptionOverride: optionalTrimmedString,
  tutorHeadlineOverride: optionalTrimmedString,
  unitId: trimmedString,
  backgroundColorOverride: z.preprocess(emptyStringToUndefined, colorHexString.optional()),
  backgroundStrongColorOverride: z.preprocess(emptyStringToUndefined, colorHexString.optional()),
  foregroundColorOverride: z.preprocess(emptyStringToUndefined, colorHexString.optional()),
  mutedColorOverride: z.preprocess(emptyStringToUndefined, colorHexString.optional()),
  primaryColorOverride: z.preprocess(emptyStringToUndefined, colorHexString.optional()),
  secondaryColorOverride: z.preprocess(emptyStringToUndefined, colorHexString.optional()),
  surfaceColorOverride: z.preprocess(emptyStringToUndefined, colorHexString.optional()),
})

export const brandAssetInputSchema = z.object({
  active: z.boolean(),
  altText: optionalTrimmedString,
  assetId: optionalTrimmedString,
  assetUrl: optionalUrlString,
  label: optionalTrimmedString,
  role: z.enum(Object.keys(brandAssetRoleLabels) as [keyof typeof brandAssetRoleLabels, ...Array<keyof typeof brandAssetRoleLabels>]),
  unitId: optionalTrimmedString,
})

export const domainBindingInputSchema = z.object({
  domainBindingId: optionalTrimmedString,
  hostname: trimmedString.transform((value) => value.toLowerCase()),
  isPrimary: z.boolean(),
  notes: optionalTrimmedString,
  status: z.enum(Object.keys(domainBindingStatusLabels) as [keyof typeof domainBindingStatusLabels, ...Array<keyof typeof domainBindingStatusLabels>]),
  surface: z.enum(Object.keys(domainSurfaceLabels) as [keyof typeof domainSurfaceLabels, ...Array<keyof typeof domainSurfaceLabels>]),
  unitId: optionalTrimmedString,
})

export const configurationPublishRequestInputSchema = z.object({
  summary: optionalTrimmedString,
})

export const configurationApprovalDecisionInputSchema = z.object({
  approvalId: trimmedString,
  decision: z.enum(['APPROVED', 'CANCELED', 'REJECTED']),
  reason: optionalTrimmedString,
})

export const configurationRollbackInputSchema = z.object({
  publishId: trimmedString,
  summary: optionalTrimmedString,
})

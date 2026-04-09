import {
  CrmCampaignRecipientStatus,
  CrmCampaignStatus,
  CrmCampaignType,
  MessageChannel,
  PetSizeCategory,
} from '@prisma/client'
import { z } from 'zod'

const optionalString = z.string().trim().min(1).optional()
const optionalBoolean = z.preprocess((value) => {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return value
}, z.boolean().optional())

const nonNegativeInteger = z.coerce.number().int().nonnegative()

const optionalStringArray = z
  .union([z.array(z.string().trim().min(1)), z.string().trim().min(1)])
  .transform((value) =>
    (Array.isArray(value) ? value : value.split(','))
      .map((entry) => entry.trim())
      .filter(Boolean),
  )
  .optional()

const optionalPetSizeCategoryArray = z
  .union([z.array(z.nativeEnum(PetSizeCategory)), z.nativeEnum(PetSizeCategory)])
  .transform((value) => (Array.isArray(value) ? value : [value]))
  .optional()

export const crmCampaignCriteriaSchema = z.object({
  breeds: optionalStringArray,
  inactivityDays: nonNegativeInteger.optional(),
  minimumCompletedAppointments: nonNegativeInteger.optional(),
  offerName: optionalString,
  onlyClientsWithoutFutureAppointments: optionalBoolean,
  petSizeCategories: optionalPetSizeCategoryArray,
  postServiceDelayHours: nonNegativeInteger.optional(),
  reviewDelayHours: nonNegativeInteger.optional(),
})

export const upsertClientCommunicationPreferenceInputSchema = z.object({
  clientId: z.string().trim().min(1),
  emailOptIn: z.boolean(),
  whatsappOptIn: z.boolean(),
  marketingOptIn: z.boolean(),
  reviewOptIn: z.boolean(),
  postServiceOptIn: z.boolean(),
  source: optionalString,
  notes: optionalString,
})

export const createCrmCampaignInputSchema = z.object({
  channel: z.nativeEnum(MessageChannel),
  criteria: crmCampaignCriteriaSchema,
  description: optionalString,
  name: z.string().trim().min(1),
  status: z.nativeEnum(CrmCampaignStatus).optional(),
  templateId: z.string().trim().min(1),
  type: z.nativeEnum(CrmCampaignType),
})

export const updateCrmCampaignInputSchema = z
  .object({
    channel: z.nativeEnum(MessageChannel).optional(),
    criteria: crmCampaignCriteriaSchema.optional(),
    description: optionalString,
    name: optionalString,
    status: z.nativeEnum(CrmCampaignStatus).optional(),
    templateId: optionalString,
    type: z.nativeEnum(CrmCampaignType).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const prepareCrmCampaignExecutionInputSchema = z.object({
  campaignId: z.string().trim().min(1),
  reason: optionalString,
})

export const listCrmCampaignsQuerySchema = z.object({
  status: z.nativeEnum(CrmCampaignStatus).optional(),
  type: z.nativeEnum(CrmCampaignType).optional(),
  unitId: optionalString,
})

export const listCrmExecutionsQuerySchema = z.object({
  campaignId: optionalString,
  recipientStatus: z.nativeEnum(CrmCampaignRecipientStatus).optional(),
  unitId: optionalString,
})

export type CrmCampaignCriteriaInput = z.infer<typeof crmCampaignCriteriaSchema>
export type UpsertClientCommunicationPreferenceInput = z.infer<
  typeof upsertClientCommunicationPreferenceInputSchema
>
export type CreateCrmCampaignInput = z.infer<typeof createCrmCampaignInputSchema>
export type UpdateCrmCampaignInput = z.infer<typeof updateCrmCampaignInputSchema>
export type PrepareCrmCampaignExecutionInput = z.infer<
  typeof prepareCrmCampaignExecutionInputSchema
>
export type ListCrmCampaignsQuery = z.infer<typeof listCrmCampaignsQuerySchema>
export type ListCrmExecutionsQuery = z.infer<typeof listCrmExecutionsQuerySchema>

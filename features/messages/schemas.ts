import { MessageChannel, MessageDeliveryStatus } from '@prisma/client'
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

const optionalDate = z.coerce.date().optional()
const optionalStringArray = z
  .union([z.array(z.string().trim().min(1)), z.string().trim().min(1)])
  .transform((value) =>
    (Array.isArray(value) ? value : value.split(','))
      .map((entry) => entry.trim())
      .filter(Boolean),
  )
  .optional()

export const createMessageTemplateInputSchema = z.object({
  unitId: optionalString,
  name: z.string().trim().min(1),
  channel: z.nativeEnum(MessageChannel),
  subject: optionalString,
  body: z.string().trim().min(1),
  availableVariables: optionalStringArray,
  active: z.boolean().optional(),
})

export const updateMessageTemplateInputSchema = z
  .object({
    unitId: optionalString,
    name: optionalString,
    channel: z.nativeEnum(MessageChannel).optional(),
    subject: optionalString,
    body: optionalString,
    availableVariables: optionalStringArray,
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export const listMessageTemplatesQuerySchema = z.object({
  unitId: optionalString,
  search: optionalString,
  channel: z.nativeEnum(MessageChannel).optional(),
  active: optionalBoolean,
})

export const createMessageLogInputSchema = z.object({
  appointmentId: optionalString,
  clientId: optionalString,
  templateId: optionalString,
  channel: z.nativeEnum(MessageChannel),
  messageContent: z.string().trim().min(1),
  deliveryStatus: z.nativeEnum(MessageDeliveryStatus).optional(),
  sentAt: optionalDate,
})

export const createManualMessageLaunchInputSchema = z
  .object({
    appointmentId: optionalString,
    clientId: optionalString,
    templateId: optionalString,
    channel: z.nativeEnum(MessageChannel),
    messageContent: optionalString,
  })
  .superRefine((value, context) => {
    if (!value.messageContent && !value.templateId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide manual message content or select a template.',
        path: ['messageContent'],
      })
    }
  })

export const listMessageLogsQuerySchema = z.object({
  unitId: optionalString,
  appointmentId: optionalString,
  clientId: optionalString,
  channel: z.nativeEnum(MessageChannel).optional(),
  deliveryStatus: z.nativeEnum(MessageDeliveryStatus).optional(),
})

export type CreateMessageTemplateInput = z.infer<typeof createMessageTemplateInputSchema>
export type UpdateMessageTemplateInput = z.infer<typeof updateMessageTemplateInputSchema>
export type ListMessageTemplatesQuery = z.infer<typeof listMessageTemplatesQuerySchema>
export type CreateMessageLogInput = z.infer<typeof createMessageLogInputSchema>
export type CreateManualMessageLaunchInput = z.infer<typeof createManualMessageLaunchInputSchema>
export type ListMessageLogsQuery = z.infer<typeof listMessageLogsQuerySchema>

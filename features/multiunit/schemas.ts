import { z } from 'zod'

export const MULTIUNIT_GLOBAL_READ_PERMISSION =
  'multiunidade.global.visualizar'
export const MULTIUNIT_GLOBAL_WRITE_PERMISSION =
  'multiunidade.global.editar'

export const multiUnitContextStatusSchema = z.enum([
  'RESOLVED',
  'UNRESOLVED',
])

export type MultiUnitContextStatus = z.infer<
  typeof multiUnitContextStatusSchema
>

export const multiUnitContextTypeSchema = z.enum([
  'LOCAL',
  'GLOBAL_AUTHORIZED',
])

export type MultiUnitContextType = z.infer<typeof multiUnitContextTypeSchema>

export const multiUnitContextOriginSchema = z.enum([
  'SESSION_DEFAULT',
  'SESSION_OVERRIDE',
  'REQUEST_OVERRIDE',
])

export type MultiUnitContextOrigin = z.infer<
  typeof multiUnitContextOriginSchema
>

export const multiUnitOperationSchema = z.enum(['READ', 'STRUCTURAL_WRITE'])

export type MultiUnitOperation = z.infer<typeof multiUnitOperationSchema>

export const multiUnitOwnershipKindSchema = z.enum([
  'LOCAL_RECORD',
  'MASTER_RECORD_WITH_UNIT_LINK',
])

export type MultiUnitOwnershipKind = z.infer<
  typeof multiUnitOwnershipKindSchema
>

export const multiUnitSessionContextSchema = z.object({
  status: multiUnitContextStatusSchema,
  homeUnitId: z.string().trim().min(1).nullable().default(null),
  activeUnitId: z.string().trim().min(1).nullable().default(null),
  requestedUnitId: z.string().trim().min(1).nullable().default(null),
  contextType: multiUnitContextTypeSchema.nullable().default(null),
  contextOrigin: multiUnitContextOriginSchema.nullable().default(null),
  crossUnitRequested: z.boolean().default(false),
  crossUnitAccess: z.boolean().default(false),
  globalReadAccess: z.boolean().default(false),
  globalWriteAccess: z.boolean().default(false),
})

export type MultiUnitSessionContext = z.infer<
  typeof multiUnitSessionContextSchema
>

export const multiUnitOwnershipBindingSchema = z.object({
  kind: multiUnitOwnershipKindSchema,
  primaryUnitId: z.string().trim().min(1),
  linkedUnitIds: z.array(z.string().trim().min(1)).default([]),
  reassignmentAuditRequired: z.literal(true),
})

export type MultiUnitOwnershipBinding = z.infer<
  typeof multiUnitOwnershipBindingSchema
>

export const multiUnitScopeDecisionReasonSchema = z.enum([
  'ALLOWED_LOCAL_SCOPE',
  'ALLOWED_GLOBAL_SCOPE',
  'MISSING_UNIT_CONTEXT',
  'CROSS_UNIT_CONTEXT_FORBIDDEN',
  'RECORD_OUTSIDE_CONTEXT_SCOPE',
  'STRUCTURAL_WRITE_FORBIDDEN',
])

export type MultiUnitScopeDecisionReason = z.infer<
  typeof multiUnitScopeDecisionReasonSchema
>

export const multiUnitScopeAccessModeSchema = z.enum([
  'LOCAL',
  'GLOBAL_AUTHORIZED',
  'BLOCKED',
])

export type MultiUnitScopeAccessMode = z.infer<
  typeof multiUnitScopeAccessModeSchema
>

export const multiUnitScopeDecisionSchema = z.object({
  allowed: z.boolean(),
  operation: multiUnitOperationSchema,
  accessMode: multiUnitScopeAccessModeSchema,
  reasonCode: multiUnitScopeDecisionReasonSchema,
  context: multiUnitSessionContextSchema,
  ownership: multiUnitOwnershipBindingSchema.nullable().default(null),
})

export type MultiUnitScopeDecision = z.infer<
  typeof multiUnitScopeDecisionSchema
>

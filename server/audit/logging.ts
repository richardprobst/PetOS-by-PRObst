import { sanitizeAuditDetails } from '@/server/audit/sanitize'

type AuditWriter = {
  auditLog: {
    create(args: {
      data: {
        unitId?: string | null
        userId?: string | null
        action: string
        entityName: string
        entityId?: string | null
        details?: unknown
      }
    }): Promise<unknown>
  }
}

interface AuditLogInput {
  unitId?: string | null
  userId?: string | null
  action: string
  entityName: string
  entityId?: string | null
  details?: unknown
}

export async function writeAuditLog(writer: AuditWriter, input: AuditLogInput) {
  await writer.auditLog.create({
    data: {
      unitId: input.unitId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityName: input.entityName,
      entityId: input.entityId ?? null,
      details: sanitizeAuditDetails(input.details),
    },
  })
}

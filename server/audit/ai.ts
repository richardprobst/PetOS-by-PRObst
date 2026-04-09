import { resolveMultiUnitSessionContext } from '@/features/multiunit/context'
import {
  createAiAuditEntries,
  type AiHumanDecisionAuditInput,
} from '@/features/ai/audit'
import type { AiExecutionEnvelope } from '@/features/ai/schemas'
import type { AuthenticatedUserData } from '@/server/auth/types'
import { writeAuditLog, type AuditWriter } from './logging'

export interface WriteAiExecutionAuditLogsInput {
  actor?: AuthenticatedUserData | null
  envelope: AiExecutionEnvelope
  humanDecision?: AiHumanDecisionAuditInput
}

export async function writeAiExecutionAuditLogs(
  writer: AuditWriter,
  input: WriteAiExecutionAuditLogsInput,
) {
  const actor = input.actor ?? null
  const multiUnitContext = actor
    ? resolveMultiUnitSessionContext(actor, {
        requestedUnitId: input.envelope.request.unitId,
      })
    : null
  const entries = createAiAuditEntries(input.envelope, {
    actorUserId: actor?.id ?? null,
    humanDecision: input.humanDecision,
    multiUnitContext,
  })

  for (const entry of entries) {
    await writeAuditLog(writer, entry)
  }
}

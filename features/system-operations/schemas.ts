import { z } from 'zod'

export const enterMaintenanceModeInputSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(8, 'Descreva um motivo objetivo para a janela de manutencao.')
    .max(255, 'Use no maximo 255 caracteres no motivo de manutencao.'),
})

export const openRecoveryIncidentInputSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(12, 'Descreva o incidente com detalhes suficientes para auditoria.')
    .max(4000, 'Use no maximo 4000 caracteres no resumo do incidente.'),
  title: z
    .string()
    .trim()
    .min(5, 'Informe um titulo curto para o incidente.')
    .max(191, 'Use no maximo 191 caracteres no titulo do incidente.'),
})

export const resolveRecoveryIncidentInputSchema = z.object({
  incidentId: z.string().trim().min(1, 'Incidente obrigatorio.'),
  resolutionSummary: z
    .string()
    .trim()
    .min(8, 'Descreva rapidamente como o incidente foi resolvido.')
    .max(4000, 'Use no maximo 4000 caracteres na resolucao.'),
  targetLifecycleState: z.enum(['INSTALLED', 'NOT_INSTALLED']),
})

export type EnterMaintenanceModeInput = z.infer<typeof enterMaintenanceModeInputSchema>
export type OpenRecoveryIncidentInput = z.infer<typeof openRecoveryIncidentInputSchema>
export type ResolveRecoveryIncidentInput = z.infer<typeof resolveRecoveryIncidentInputSchema>

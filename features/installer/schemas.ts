import { z } from 'zod'

export const installerBootstrapInputSchema = z.object({
  bootstrapToken: z.string().trim().min(32, 'Informe o token de bootstrap completo.'),
})

export const installerSetupDraftSchema = z
  .object({
    adminEmail: z.string().trim().email('Informe um e-mail administrativo valido.'),
    adminName: z.string().trim().min(3, 'Informe o nome do administrador inicial.'),
    adminPassword: z.string().min(8, 'Use uma senha com pelo menos 8 caracteres.'),
    adminPasswordConfirmation: z.string().min(8, 'Confirme a senha administrativa.'),
    companyName: z.string().trim().min(3, 'Informe o nome da empresa.'),
    unitEmail: z.string().trim().email('Informe um e-mail valido.').optional().or(z.literal('')),
    unitName: z.string().trim().min(3, 'Informe o nome da unidade inicial.'),
    unitPhone: z.string().trim().min(8, 'Informe um telefone valido.').max(32).optional().or(z.literal('')),
    unitTimezone: z.string().trim().min(3, 'Informe o fuso horario da unidade.'),
  })
  .superRefine((input, context) => {
    if (input.adminPassword !== input.adminPasswordConfirmation) {
      context.addIssue({
        code: 'custom',
        message: 'A confirmacao da senha precisa ser identica a senha principal.',
        path: ['adminPasswordConfirmation'],
      })
    }
  })

export type InstallerBootstrapInput = z.infer<typeof installerBootstrapInputSchema>
export type InstallerSetupDraftInput = z.infer<typeof installerSetupDraftSchema>

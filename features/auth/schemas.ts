import { z } from 'zod'

export const credentialsSignInSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Informe uma senha com pelo menos 8 caracteres.'),
})

export type CredentialsSignInInput = z.infer<typeof credentialsSignInSchema>

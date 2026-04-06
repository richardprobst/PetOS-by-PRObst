'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { FormField } from '@/components/ui/form-field'
import {
  credentialsSignInSchema,
  type CredentialsSignInInput,
} from '@/features/auth/schemas'

export function SignInForm() {
  const searchParams = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<CredentialsSignInInput>({
    resolver: zodResolver(credentialsSignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const callbackUrl = searchParams.get('callbackUrl') ?? '/acesso'

  const handleSubmit = form.handleSubmit((values) => {
    setAuthError(null)

    startTransition(async () => {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        callbackUrl,
        redirect: false,
      })

      if (!result) {
        setAuthError('Não foi possível iniciar a sessão agora.')
        return
      }

      if (result.error) {
        setAuthError('E-mail ou senha inválidos.')
        return
      }

      window.location.assign(result.url ?? callbackUrl)
    })
  })

  return (
    <div className="mt-8 space-y-5">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField
          description="Use o e-mail vinculado ao seu acesso no PetOS."
          error={form.formState.errors.email?.message}
          label="E-mail"
        >
          <input
            autoComplete="email"
            className="ui-input"
            placeholder="nome@petos.app"
            type="email"
            {...form.register('email')}
          />
        </FormField>

        <FormField error={form.formState.errors.password?.message} label="Senha">
          <input
            autoComplete="current-password"
            className="ui-input"
            placeholder="••••••••"
            type="password"
            {...form.register('password')}
          />
        </FormField>

        <button className="ui-button-primary w-full" disabled={isPending} type="submit">
          {isPending ? 'Entrando...' : 'Continuar'}
        </button>
      </form>

      {authError ? (
        <FeedbackMessage
          description={authError}
          title="Falha na autenticação"
          tone="error"
        />
      ) : (
        <FeedbackMessage
          description="Usuários internos seguem para a área administrativa; tutores seguem para o portal."
          title="Acesso separado por contexto"
          tone="info"
        />
      )}
    </div>
  )
}

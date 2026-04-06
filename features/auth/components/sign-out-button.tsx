'use client'

import { signOut } from 'next-auth/react'
import { useTransition } from 'react'

interface SignOutButtonProps {
  callbackUrl?: string
  className?: string
}

export function SignOutButton({
  callbackUrl = '/entrar',
  className,
}: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      className={className ?? 'ui-button-secondary'}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await signOut({
            callbackUrl,
          })
        })
      }}
      type="button"
    >
      {isPending ? 'Saindo...' : 'Sair'}
    </button>
  )
}

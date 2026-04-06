'use client'

import { useActionState, useEffect, useRef } from 'react'
import { FeedbackMessage } from '@/components/ui/feedback-message'
import { initialCrmRecipientLaunchState } from '@/features/crm/action-state'
import { launchCrmRecipientAction } from '@/features/crm/actions'

interface CrmRecipientLaunchButtonProps {
  recipientId: string
}

export function CrmRecipientLaunchButton({ recipientId }: CrmRecipientLaunchButtonProps) {
  const [state, formAction, isPending] = useActionState(
    launchCrmRecipientAction,
    initialCrmRecipientLaunchState,
  )
  const lastOpenedUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (state.status !== 'success' || !state.launchUrl || lastOpenedUrlRef.current === state.launchUrl) {
      return
    }

    lastOpenedUrlRef.current = state.launchUrl
    window.open(state.launchUrl, '_blank', 'noopener,noreferrer')
  }, [state])

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input name="recipientId" type="hidden" value={recipientId} />
        <button
          className="ui-link text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Preparando...' : 'Abrir canal'}
        </button>
      </form>

      {state.status === 'error' ? (
        <FeedbackMessage
          description={state.message ?? 'Nao foi possivel preparar o contato.'}
          title="Falha no disparo controlado"
          tone="error"
        />
      ) : null}
    </div>
  )
}

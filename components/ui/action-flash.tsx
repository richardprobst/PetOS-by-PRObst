import { FeedbackMessage } from '@/components/ui/feedback-message'

interface ActionFlashProps {
  status?: string
  message?: string
}

const flashByStatus: Record<
  string,
  {
    title: string
    tone: 'success' | 'error' | 'info'
    description: string
  }
> = {
  created: {
    title: 'Registro criado',
    tone: 'success',
    description: 'A operação foi concluída com sucesso.',
  },
  updated: {
    title: 'Registro atualizado',
    tone: 'success',
    description: 'As alterações foram aplicadas com sucesso.',
  },
  saved: {
    title: 'Alterações salvas',
    tone: 'success',
    description: 'As alterações foram persistidas com sucesso.',
  },
  sent: {
    title: 'Registro de envio criado',
    tone: 'success',
    description: 'A comunicação manual foi registrada no histórico.',
  },
  scheduled: {
    title: 'Agendamento registrado',
    tone: 'success',
    description: 'O novo agendamento entrou no fluxo operacional do MVP.',
  },
  error: {
    title: 'Não foi possível concluir a ação',
    tone: 'error',
    description: 'Revise os dados informados e tente novamente.',
  },
}

export function ActionFlash({ status, message }: ActionFlashProps) {
  if (!status || !flashByStatus[status]) {
    return null
  }

  const flash = flashByStatus[status]

  return (
    <FeedbackMessage
      title={flash.title}
      description={message ?? flash.description}
      tone={flash.tone}
    />
  )
}

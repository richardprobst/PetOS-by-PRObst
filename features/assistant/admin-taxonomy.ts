export function getTutorAssistantResponseStatusLabel(status: string) {
  switch (status) {
    case 'ANSWERED':
      return 'Respondida'
    case 'NEEDS_CONFIRMATION':
      return 'Aguardando confirmacao'
    case 'NEEDS_CLARIFICATION':
      return 'Pede esclarecimento'
    case 'BLOCKED':
      return 'Bloqueada'
    default:
      return status
  }
}

export function getTutorAssistantChannelLabel(channel: string | null | undefined) {
  switch (channel) {
    case 'TEXT':
      return 'Texto'
    case 'VOICE':
      return 'Voz'
    case null:
    case undefined:
      return null
    default:
      return channel
  }
}

export function getTutorAssistantIntentLabel(intent: string) {
  const labels: Record<string, string> = {
    HELP: 'Ajuda',
    QUERY_FINANCE_SUMMARY: 'Financeiro',
    QUERY_PENDING_DOCUMENTS: 'Documentos',
    QUERY_REPORT_CARDS: 'Report cards',
    QUERY_UPCOMING_APPOINTMENTS: 'Agenda',
    QUERY_WAITLIST_STATUS: 'Waitlist',
    SCHEDULE_APPOINTMENT: 'Agendamento',
    UNKNOWN: 'Nao identificado',
  }

  return labels[intent] ?? intent
}

export function getTutorAssistantOperationalValidationStatusLabel(status: string) {
  switch (status) {
    case 'NO_ACTIVITY':
      return 'Sem uso observado'
    case 'EARLY_USAGE':
      return 'Uso inicial'
    case 'READY_WITH_GUARDRAILS':
      return 'Pronto com guardrails'
    case 'ATTENTION_REQUIRED':
      return 'Atencao necessaria'
    default:
      return status
  }
}

export function getTutorAssistantVoiceCoverageStatusLabel(status: string) {
  switch (status) {
    case 'NOT_OBSERVED':
      return 'Voz nao observada'
    case 'PARTIAL':
      return 'Cobertura parcial'
    case 'OBSERVED':
      return 'Cobertura observada'
    default:
      return status
  }
}

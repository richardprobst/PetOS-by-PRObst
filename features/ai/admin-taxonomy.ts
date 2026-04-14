export function getAiModuleLabel(module: string) {
  switch (module) {
    case 'IMAGE_ANALYSIS':
      return 'Analise de imagem'
    case 'PREDICTIVE_INSIGHTS':
      return 'Insights preditivos'
    case 'VIRTUAL_ASSISTANT':
      return 'Assistente virtual'
    default:
      return module
  }
}

export function getAiFlagStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'ENABLED':
      return 'Habilitada'
    case 'DISABLED':
      return 'Desligada'
    case 'MISSING':
      return 'Nao configurada'
    case 'INVALID':
      return 'Configuracao invalida'
    case 'NOT_EVALUATED':
      return 'Nao avaliada'
    case null:
    case undefined:
      return 'Sem status'
    default:
      return status
  }
}

export function getAiPolicyReasonLabel(reasonCode: string | null | undefined) {
  switch (reasonCode) {
    case 'ENABLED':
      return 'Politica habilitada'
    case 'DISABLED_BY_POLICY':
      return 'Bloqueado por politica'
    case 'MISSING_CONFIGURATION':
      return 'Configuracao ausente'
    case 'NOT_SUPPORTED':
      return 'Nao suportado'
    case 'QUOTA_EXCEEDED':
      return 'Quota excedida'
    case 'QUOTA_NOT_CONFIGURED':
      return 'Quota nao configurada'
    case 'TEMPORARILY_UNAVAILABLE':
      return 'Indisponibilidade temporaria'
    case null:
    case undefined:
      return 'Politica nao avaliada'
    default:
      return reasonCode
  }
}

export function getAiGateReasonLabel(reasonCode: string | null | undefined) {
  switch (reasonCode) {
    case 'ENABLED':
      return 'Gating habilitado'
    case 'DISABLED_BY_POLICY':
      return 'Gating bloqueado por politica'
    case 'MISSING_CONFIGURATION':
      return 'Gating sem configuracao'
    case 'NOT_SUPPORTED':
      return 'Gating nao suportado'
    case null:
    case undefined:
      return 'Gating nao avaliado'
    default:
      return reasonCode
  }
}

export function getAiQuotaStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'AVAILABLE':
      return 'Disponivel'
    case 'EXCEEDED':
      return 'Excedida'
    case 'NOT_CONFIGURED':
      return 'Nao configurada'
    case 'INVALID_CONFIGURATION':
      return 'Configuracao invalida'
    case 'NOT_EVALUATED':
      return 'Nao avaliada'
    case null:
    case undefined:
      return 'Nao avaliada'
    default:
      return status
  }
}

export function getAiConsentDecisionLabel(status: string | null | undefined) {
  switch (status) {
    case 'GRANTED':
      return 'Consentimento valido'
    case 'MISSING':
      return 'Consentimento ausente'
    case 'INCOMPATIBLE':
      return 'Consentimento incompativel'
    case 'NOT_APPLICABLE':
      return 'Consentimento nao exigido'
    case 'NOT_EVALUATED':
      return 'Consentimento nao avaliado'
    case null:
    case undefined:
      return 'Consentimento nao avaliado'
    default:
      return status
  }
}

export function getAiConsentReasonLabel(reasonCode: string | null | undefined) {
  switch (reasonCode) {
    case 'CONSENT_GRANTED':
      return 'Consentimento registrado'
    case 'CONSENT_MISSING':
      return 'Consentimento ausente'
    case 'PURPOSE_NOT_ALLOWED':
      return 'Finalidade nao autorizada'
    case 'NOT_APPLICABLE':
      return 'Consentimento nao aplicavel'
    case 'NOT_EVALUATED':
      return 'Consentimento nao avaliado'
    case null:
    case undefined:
      return 'Consentimento nao avaliado'
    default:
      return reasonCode
  }
}

export function getAiCostStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'NOT_EVALUATED':
      return 'Custo nao avaliado'
    case 'ESTIMATED':
      return 'Custo estimado'
    case 'UNAVAILABLE':
      return 'Custo indisponivel'
    case 'NOT_CONFIGURED':
      return 'Custo nao configurado'
    case null:
    case undefined:
      return 'Custo nao avaliado'
    default:
      return status
  }
}

export function getAiOperationalStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'NOT_EVALUATED':
      return 'Operacional nao avaliado'
    case 'NOT_CONFIGURED':
      return 'Operacional nao configurado'
    case 'DECLARED':
      return 'Declarado para baseline'
    case 'TEMPORARILY_UNAVAILABLE':
      return 'Temporariamente indisponivel'
    case null:
    case undefined:
      return 'Operacional nao avaliado'
    default:
      return status
  }
}

export function getAiOperationalReasonLabel(reasonCode: string | null | undefined) {
  switch (reasonCode) {
    case 'NOT_EVALUATED':
      return 'Caminho operacional ainda nao avaliado'
    case 'PROVIDER_NOT_CONFIGURED':
      return 'Provider nao configurado'
    case 'DECLARED_FOR_FUTURE_EXECUTION':
      return 'Declarado para execucao futura'
    case 'POLICY_TEMPORARILY_UNAVAILABLE':
      return 'Bloqueado por indisponibilidade temporaria'
    case 'OPERATIONAL_FAILURE':
      return 'Falha operacional controlada'
    case null:
    case undefined:
      return 'Motivo operacional nao avaliado'
    default:
      return reasonCode
  }
}

export function getAiFallbackStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'NOT_EVALUATED':
      return 'Fallback nao avaliado'
    case 'NOT_CONFIGURED':
      return 'Fallback nao configurado'
    case 'ELIGIBLE':
      return 'Fallback elegivel'
    case 'NOT_ELIGIBLE':
      return 'Fallback nao elegivel'
    case 'DECLARED':
      return 'Fallback declarado'
    case 'UNAVAILABLE':
      return 'Fallback indisponivel'
    case null:
    case undefined:
      return 'Fallback nao avaliado'
    default:
      return status
  }
}

export function getAiFallbackReasonLabel(reasonCode: string | null | undefined) {
  switch (reasonCode) {
    case 'NOT_YET_EVALUATED':
      return 'Fallback ainda nao avaliado'
    case 'FALLBACK_NOT_CONFIGURED':
      return 'Fallback nao configurado'
    case 'DECLARED_FOR_FUTURE_USE':
      return 'Fallback apenas declarado'
    case 'PRIMARY_OPERATIONAL_FAILURE':
      return 'Falha operacional no caminho principal'
    case 'PRIMARY_TEMPORARILY_UNAVAILABLE':
      return 'Principal temporariamente indisponivel'
    case 'PRIMARY_NOT_SUPPORTED':
      return 'Principal nao suportado'
    case 'BLOCKED_BY_POLICY':
      return 'Fallback bloqueado por politica'
    case 'BLOCKED_BY_QUOTA':
      return 'Fallback bloqueado por quota'
    case 'FALLBACK_TARGET_UNAVAILABLE':
      return 'Destino do fallback indisponivel'
    case null:
    case undefined:
      return 'Motivo do fallback nao avaliado'
    default:
      return reasonCode
  }
}

export function getAiExecutionStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'ACCEPTED':
      return 'Admitido'
    case 'QUEUED':
      return 'Em fila'
    case 'RUNNING':
      return 'Executando'
    case 'BLOCKED':
      return 'Bloqueado'
    case 'COMPLETED':
      return 'Concluido'
    case 'FAILED':
      return 'Falhou'
    case 'DISCARDED':
      return 'Descartado'
    case null:
    case undefined:
      return 'Sem status'
    default:
      return status
  }
}

export function getAiExecutionModeLabel(mode: string | null | undefined) {
  switch (mode) {
    case 'IMMEDIATE':
      return 'Imediato'
    case 'DEFERRED':
      return 'Adiado'
    case null:
    case undefined:
      return 'Nao informado'
    default:
      return mode
  }
}

export function getAiExecutionProviderStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'NOT_STARTED':
      return 'Provider nao iniciado'
    case 'RUNNING':
      return 'Provider em execucao'
    case 'COMPLETED':
      return 'Provider concluido'
    case 'FAILED':
      return 'Provider falhou'
    case 'NOT_SUPPORTED':
      return 'Provider nao suportado'
    case null:
    case undefined:
      return 'Provider nao avaliado'
    default:
      return status
  }
}

export function getAiJobStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'NOT_SCHEDULED':
      return 'Job nao agendado'
    case 'QUEUED':
      return 'Job em fila'
    case 'RUNNING':
      return 'Job em execucao'
    case 'COMPLETED':
      return 'Job concluido'
    case 'BLOCKED':
      return 'Job bloqueado'
    case 'FAILED':
      return 'Job falhou'
    case 'NOT_SUPPORTED':
      return 'Job nao suportado'
    case null:
    case undefined:
      return 'Job nao avaliado'
    default:
      return status
  }
}

export function getAiOperationalEventLabel(eventCode: string) {
  switch (eventCode) {
    case 'COST_BLOCKED_BY_QUOTA':
      return 'Quota bloqueou a execucao'
    case 'COST_GUARD_NOT_CONFIGURED':
      return 'Guardrail de custo sem configuracao'
    case 'COST_CONSUMPTION_PREVENTED':
      return 'Consumo evitado por shutdown'
    case 'COST_ESTIMATE_AVAILABLE':
      return 'Estimativa de custo disponivel'
    case 'COST_UNAVAILABLE':
      return 'Custo indisponivel'
    case 'COST_NOT_CONFIGURED':
      return 'Custo nao configurado'
    case 'ERROR_OPERATIONAL_FAILURE':
      return 'Falha operacional controlada'
    case 'ERROR_FALLBACK_ELIGIBLE':
      return 'Fallback elegivel para revisao'
    case 'ERROR_TERMINAL_WITHOUT_FALLBACK':
      return 'Falha terminal sem fallback'
    case 'ERROR_TEMPORARILY_UNAVAILABLE':
      return 'Indisponibilidade temporaria'
    case 'ERROR_NOT_SUPPORTED':
      return 'Caminho nao suportado'
    case 'ERROR_MISSING_CONFIGURATION':
      return 'Configuracao ausente'
    case 'RAPID_SHUTDOWN_ACTIVE':
      return 'Rapid shutdown ativo'
    default:
      return eventCode
  }
}

export function getPredictiveInsightExecutionLabel(status: string | null | undefined) {
  return getAiExecutionStatusLabel(status)
}

export function getImageAnalysisReviewStatusLabel(status: string | null | undefined) {
  switch (status) {
    case 'NOT_REQUIRED':
      return 'Sem revisao obrigatoria'
    case 'PENDING_REVIEW':
      return 'Aguardando revisao humana'
    case 'APPROVED':
      return 'Aprovada'
    case 'REJECTED':
      return 'Rejeitada'
    case null:
    case undefined:
      return 'Sem revisao'
    default:
      return status
  }
}

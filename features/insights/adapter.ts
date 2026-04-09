import type { AiProviderAdapter } from '@/server/integrations/ai/contract'
import { parseAppointmentDemandInputSummary } from './domain'
import type {
  AppointmentDemandInsightExplanation,
  PredictiveInsightHistoryMode,
  PredictiveInsightWeekday,
} from './schemas'

const weekdayLabels: Record<PredictiveInsightWeekday, string> = {
  FRIDAY: 'sexta-feira',
  MONDAY: 'segunda-feira',
  SATURDAY: 'sabado',
  SUNDAY: 'domingo',
  THURSDAY: 'quinta-feira',
  TUESDAY: 'terca-feira',
  WEDNESDAY: 'quarta-feira',
}

const historyModeLabels: Record<PredictiveInsightHistoryMode, string> = {
  BOOTSTRAP_FALLBACK: 'fallback inicial para unidade com pouco historico',
  FULL_HISTORY: 'historico completo de referencia',
  LIMITED_HISTORY: 'historico parcial controlado',
}

function formatWeekday(weekday: PredictiveInsightWeekday) {
  return weekdayLabels[weekday] ?? weekday.toLowerCase()
}

function buildTopDemandDays(explanation: AppointmentDemandInsightExplanation) {
  return [...explanation.forecastDays]
    .sort((left, right) => right.predictedAppointments - left.predictedAppointments)
    .slice(0, 2)
}

function createSummary(explanation: AppointmentDemandInsightExplanation) {
  const topDemandDays = buildTopDemandDays(explanation)
  const leadDaysLabel =
    topDemandDays.length > 0
      ? topDemandDays
          .map((day) => `${formatWeekday(day.weekday)} (${day.predictedAppointments.toFixed(1)})`)
          .join(' e ')
      : 'sem pico relevante no horizonte'

  if (explanation.totalAppointmentsInHistory === 0) {
    return `Insight preditivo inicial para ${explanation.unitName}: ainda nao ha base historica suficiente para projetar demanda com confianca. O painel permanece apenas como recomendacao operacional sem automacao.`
  }

  return `Previsao assistiva para ${explanation.unitName} nos proximos 7 dias: ${explanation.forecastNext7Days.toFixed(1)} atendimentos estimados, com maior pressao em ${leadDaysLabel}. Base usada: ${historyModeLabels[explanation.historyMode]}.`
}

function createRecommendations(explanation: AppointmentDemandInsightExplanation) {
  const topDemandDays = buildTopDemandDays(explanation)
  const topDemandLabel =
    topDemandDays.length > 0
      ? topDemandDays.map((day) => formatWeekday(day.weekday)).join(', ')
      : 'os proximos dias'
  const recommendations = [
    `Revisar capacidade, bloqueios e folgas em ${topDemandLabel} antes de abrir novos encaixes.`,
    'Tratar este insight apenas como apoio operacional. Nenhuma alteracao de agenda deve ser automatizada a partir deste painel.',
  ]

  if (explanation.historyMode !== 'FULL_HISTORY') {
    recommendations.push(
      'Interpretar a projeção com cautela ate completar historico mais estavel por unidade.',
    )
  } else {
    recommendations.push(
      'Cruzar a previsao com waitlist, cancelamentos recentes e disponibilidade real da equipe antes de qualquer ajuste.',
    )
  }

  if (explanation.activeEmployeeCount <= 1 && explanation.forecastNext7Days >= 8) {
    recommendations.push(
      'A unidade opera com equipe ativa muito enxuta para o volume previsto; priorize revisao manual de cobertura.',
    )
  }

  return recommendations
}

function createSignals(explanation: AppointmentDemandInsightExplanation) {
  const topDemandDay = buildTopDemandDays(explanation)[0] ?? null

  return [
    {
      key: 'historyMode',
      label: 'History mode',
      value: explanation.historyMode,
    },
    {
      key: 'confidence',
      label: 'Confidence',
      value: explanation.confidence,
    },
    {
      key: 'historyDaysAvailable',
      label: 'History days available',
      value: explanation.historyDaysAvailable,
    },
    {
      key: 'forecastNext7Days',
      label: 'Forecast next 7 days',
      value: explanation.forecastNext7Days,
    },
    {
      key: 'peakDay',
      label: 'Peak day',
      value: topDemandDay ? topDemandDay.weekday : 'NONE',
    },
    {
      key: 'activeEmployeeCount',
      label: 'Active employee count',
      value: explanation.activeEmployeeCount,
    },
  ]
}

export function createInternalAppointmentDemandInsightAdapter(): AiProviderAdapter {
  return {
    adapterId: 'internal-appointment-demand-adapter',
    contractVersion: 'phase3-block4-internal-v1',
    modelId: 'weekday-demand-baseline-v1',
    providerId: 'internal-appointment-demand',
    supportedModules: ['PREDICTIVE_INSIGHTS'],
    async execute({ request }) {
      const handledAt = new Date()

      if (!request.inferenceKey.startsWith('predictive.appointment-demand.')) {
        return {
          error: {
            code: 'NOT_SUPPORTED',
            message:
              'The internal predictive adapter only supports appointment demand insights in this first cut.',
            retryable: false,
          },
          status: 'NOT_SUPPORTED',
          technicalMetadata: {
            handledAt,
            latencyMs: 4,
            modelId: null,
            providerId: null,
            providerRequestId: null,
          },
        }
      }

      const parsed = parseAppointmentDemandInputSummary(request.inputSummary)

      if (!parsed) {
        return {
          error: {
            code: 'OPERATIONAL_FAILURE',
            message:
              'The predictive adapter could not parse the normalized appointment-demand summary.',
            retryable: false,
          },
          status: 'FAILED',
          technicalMetadata: {
            handledAt,
            latencyMs: 4,
            modelId: null,
            providerId: null,
            providerRequestId: null,
          },
        }
      }

      return {
        interpretedResult: {
          humanReviewRequired: false,
          recommendations: createRecommendations(parsed.explanation),
          signals: createSignals(parsed.explanation),
          summary: createSummary(parsed.explanation),
        },
        status: 'COMPLETED',
        technicalMetadata: {
          handledAt,
          latencyMs: 12,
          modelId: null,
          providerId: null,
          providerRequestId: null,
        },
      }
    },
  }
}

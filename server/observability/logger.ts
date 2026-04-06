import { sanitizeAuditDetails } from '@/server/audit/sanitize'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function resolveConfiguredLogLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL

  if (
    configured === 'debug' ||
    configured === 'info' ||
    configured === 'warn' ||
    configured === 'error'
  ) {
    return configured
  }

  return 'info'
}

function shouldEmit(level: LogLevel) {
  return levelPriority[level] >= levelPriority[resolveConfiguredLogLevel()]
}

function writeLine(level: LogLevel, payload: string) {
  if (level === 'error') {
    console.error(payload)
    return
  }

  if (level === 'warn') {
    console.warn(payload)
    return
  }

  if (level === 'debug') {
    console.debug(payload)
    return
  }

  console.info(payload)
}

function serializeLogEntry(level: LogLevel, message: string, context?: LogContext) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context: sanitizeAuditDetails(context) } : {}),
  })
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldEmit(level)) {
    return
  }

  writeLine(level, serializeLogEntry(level, message, context))
}

export function logDebug(message: string, context?: LogContext) {
  emit('debug', message, context)
}

export function logInfo(message: string, context?: LogContext) {
  emit('info', message, context)
}

export function logWarn(message: string, context?: LogContext) {
  emit('warn', message, context)
}

export function logError(message: string, context?: LogContext) {
  emit('error', message, context)
}

export function serializeErrorForLogs(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
  }
}

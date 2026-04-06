const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatDateTime(value: Date | string) {
  return dateFormatter.format(value instanceof Date ? value : new Date(value))
}

export function toDateTimeLocalValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

export function formatFileSize(value: bigint | number) {
  const sizeBytes = typeof value === 'bigint' ? Number(value) : value

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

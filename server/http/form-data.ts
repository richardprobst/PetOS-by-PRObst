export function getOptionalFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export function getRequiredFormValue(formData: FormData, key: string) {
  const value = getOptionalFormValue(formData, key)

  if (!value) {
    throw new Error(`Missing required form field: ${key}`)
  }

  return value
}

export function getFormValueList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function hasCheckedFormValue(formData: FormData, key: string) {
  return formData.get(key) === 'on'
}

export function getBooleanFormValue(formData: FormData, key: string) {
  const value = formData.get(key)

  return value === 'on' || value === 'true'
}

export function getOptionalFile(formData: FormData, key: string) {
  const value = formData.get(key)

  if (!(value instanceof File) || value.size === 0) {
    return undefined
  }

  return value
}

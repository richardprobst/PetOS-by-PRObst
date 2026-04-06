import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  description?: string
  error?: string
  children: ReactNode
}

export function FormField({
  label,
  description,
  error,
  children,
}: FormFieldProps) {
  return (
    <label className="block space-y-2.5">
      <span className="block text-sm font-semibold text-[color:var(--foreground)]">{label}</span>
      {description ? (
        <span className="block text-sm leading-6 text-[color:var(--foreground-soft)]">{description}</span>
      ) : null}
      <div>{children}</div>
      {error ? <span className="block text-sm text-[color:var(--danger)]">{error}</span> : null}
    </label>
  )
}

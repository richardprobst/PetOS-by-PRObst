interface FeedbackMessageProps {
  title: string
  description: string
  tone?: 'info' | 'success' | 'warning' | 'error'
  className?: string
}

const toneClasses: Record<NonNullable<FeedbackMessageProps['tone']>, string> = {
  info: 'border-[color:var(--accent-soft)] bg-[rgba(31,122,114,0.08)] text-[color:var(--foreground)]',
  success: 'border-[color:var(--success-soft)] bg-[rgba(47,127,81,0.09)] text-[color:var(--foreground)]',
  warning: 'border-[color:var(--warning-soft)] bg-[rgba(184,117,26,0.09)] text-[color:var(--foreground)]',
  error: 'border-[color:var(--danger-soft)] bg-[rgba(177,79,63,0.08)] text-[color:var(--foreground)]',
}

export function FeedbackMessage({
  title,
  description,
  tone = 'info',
  className,
}: FeedbackMessageProps) {
  return (
    <div className={`rounded-[1.5rem] border p-5 ${toneClasses[tone]} ${className ?? ''}`.trim()}>
      <p className="text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">{description}</p>
    </div>
  )
}

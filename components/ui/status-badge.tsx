interface StatusBadgeProps {
  children: React.ReactNode
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  neutral: 'border-[color:var(--line)] bg-white/60 text-[color:var(--foreground-soft)]',
  info: 'border-transparent bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]',
  success: 'border-transparent bg-[color:var(--success-soft)] text-[color:var(--success)]',
  warning: 'border-transparent bg-[color:var(--warning-soft)] text-[color:var(--warning)]',
  danger: 'border-transparent bg-[color:var(--danger-soft)] text-[color:var(--danger)]',
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

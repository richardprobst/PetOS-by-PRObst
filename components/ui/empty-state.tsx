interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  className?: string
}

export function EmptyState({
  title,
  description,
  actionLabel,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`surface-panel rounded-[1.75rem] p-6 text-center ${className ?? ''}`.trim()}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(31,122,114,0.12)] text-sm font-bold uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">
        PO
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-[color:var(--foreground)]">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[color:var(--foreground-soft)]">
        {description}
      </p>
      {actionLabel ? (
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">
          {actionLabel}
        </p>
      ) : null}
    </div>
  )
}

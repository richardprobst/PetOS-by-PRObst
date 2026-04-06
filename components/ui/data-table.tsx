import type { ReactNode } from 'react'
import { EmptyState } from './empty-state'

interface DataTableColumn<T> {
  id: string
  header: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  rows: T[]
  columns: DataTableColumn<T>[]
  className?: string
}

export function DataTable<T>({
  rows,
  columns,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        className={className}
        description="Nenhum item disponível para a tabela neste estágio."
        title="Tabela vazia"
      />
    )
  }

  return (
    <div className={`overflow-hidden rounded-[1.5rem] border border-[color:var(--line)] ${className ?? ''}`.trim()}>
      <table className="min-w-full border-collapse">
        <thead className="bg-[rgba(255,255,255,0.54)]">
          <tr>
            {columns.map((column) => (
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground-soft)]"
                key={column.id}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              className="border-t border-[color:var(--line)] bg-[rgba(255,255,255,0.32)]"
              key={rowIndex}
            >
              {columns.map((column) => (
                <td className="px-4 py-4 text-sm leading-6 text-[color:var(--foreground-soft)]" key={column.id}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

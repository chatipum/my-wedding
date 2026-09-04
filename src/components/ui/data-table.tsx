import { cn } from '@/lib/cn'
import { EmptyState } from './empty-state'

export type Column = { key: string; label: string; numeric?: boolean }

export function DataTable({
  caption,
  columns,
  children,
  isEmpty,
  emptyMessage = 'ยังไม่มีข้อมูล',
}: {
  caption: string
  columns: Column[]
  children: React.ReactNode
  isEmpty: boolean
  emptyMessage?: string
}) {
  if (isEmpty) return <EmptyState message={emptyMessage} />

  return (
    <table className="table">
      <caption className="text-muted text-left text-sm mb-2">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={cn(column.numeric && 'num')}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

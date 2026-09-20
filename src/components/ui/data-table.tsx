import { cn } from '@/lib/cn'
import { EmptyState } from './empty-state'

export type Column<K extends string = string> = {
  key: K
  label: string
  numeric?: boolean
  /** มีผลเฉพาะตอน DataTable ใช้ mobile='cards' (ค่าตั้งต้น) — โหมด 'scroll' ไม่มี CSS อ่านคลาสนี้ */
  hideOnMobile?: boolean
}

/** ป้ายบนการ์ดกับการซ่อนคอลัมน์มาจาก COLUMNS ที่เดียว row component ไม่ต้องรู้เรื่องนี้ */
export function cellAttributes(columns: readonly Column[], key: string) {
  const column = columns.find((candidate) => candidate.key === key)
  if (!column) throw new Error(`ไม่มีคอลัมน์ "${key}" ในตารางนี้`)

  return {
    'data-label': column.label,
    className: cn(column.numeric && 'num', column.hideOnMobile && 'hide-sm') || undefined,
  }
}

/** ผูก Cell เข้ากับ COLUMNS ของตารางหนึ่ง — name จึงเป็น union ของ key จริง พิมพ์ผิด TS ฟ้อง */
export function createCell<K extends string>(columns: readonly Column<K>[]) {
  return function Cell({
    name,
    className,
    children,
  }: {
    name: K
    className?: string
    children?: React.ReactNode
  }) {
    const { className: columnClass, ...rest } = cellAttributes(columns, name)
    return (
      <td {...rest} className={cn(columnClass, className)}>
        {children}
      </td>
    )
  }
}

export function DataTable({
  caption,
  columns,
  children,
  isEmpty,
  emptyMessage = 'ยังไม่มีข้อมูล',
  mobile = 'cards',
}: {
  caption: string
  columns: readonly Column[]
  children: React.ReactNode
  isEmpty: boolean
  emptyMessage?: string
  /** cards = ยุบเป็นการ์ดต่อแถวบนจอแคบ · scroll = คงตารางไว้เหมือนเดิมทุกขนาดจอ */
  mobile?: 'cards' | 'scroll'
}) {
  if (isEmpty) return <EmptyState message={emptyMessage} />

  return (
    <div className="overflow-x-auto">
      <table className={cn('data-table', mobile === 'cards' && 'data-table-cards')}>
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
    </div>
  )
}

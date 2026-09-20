import { createCell } from '@/components/ui/data-table'

export const COLUMNS = [
  { key: 'received', label: 'รับเมื่อ' },
  { key: 'amount', label: 'ยอด', numeric: true },
  { key: 'actions', label: '' },
] as const

export const Cell = createCell(COLUMNS)

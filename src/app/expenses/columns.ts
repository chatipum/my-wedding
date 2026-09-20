import { createCell } from '@/components/ui/data-table'

export const COLUMNS = [
  { key: 'paid', label: 'จ่ายแล้ว' },
  { key: 'name', label: 'รายการ' },
  { key: 'category', label: 'หมวด', hideOnMobile: true },
  { key: 'vendor', label: 'ผู้ให้บริการ', hideOnMobile: true },
  { key: 'due', label: 'กำหนดจ่าย', hideOnMobile: true },
  { key: 'amount', label: 'ยอด', numeric: true },
  { key: 'status', label: 'สถานะ' },
  { key: 'actions', label: '' },
] as const

export const Cell = createCell(COLUMNS)

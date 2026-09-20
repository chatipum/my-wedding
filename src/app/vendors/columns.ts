import { createCell } from '@/components/ui/data-table'

export const COLUMNS = [
  { key: 'name', label: 'ผู้ให้บริการ' },
  { key: 'role', label: 'หน้าที่' },
  { key: 'phone', label: 'เบอร์โทร' },
  { key: 'line', label: 'LINE', hideOnMobile: true },
  { key: 'agreed', label: 'ราคาที่ตกลง', numeric: true, hideOnMobile: true },
  { key: 'paid', label: 'จ่ายแล้ว', numeric: true },
  { key: 'unpaid', label: 'ค้างจ่าย', numeric: true },
  { key: 'unknown', label: 'ยังไม่ระบุยอด', numeric: true, hideOnMobile: true },
  { key: 'actions', label: '' },
] as const

export const Cell = createCell(COLUMNS)

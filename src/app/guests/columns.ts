import { createCell } from '@/components/ui/data-table'

export const COLUMNS = [
  { key: 'name', label: 'ชื่อ' },
  { key: 'side', label: 'ฝ่าย', hideOnMobile: true },
  { key: 'group', label: 'กลุ่ม' },
  { key: 'confirmed', label: 'ผู้ติดตาม', numeric: true },
  { key: 'rsvp', label: 'ตอบรับ' },
  { key: 'invitation', label: 'แจกซอง' },
  { key: 'actions', label: '' },
] as const

export const Cell = createCell(COLUMNS)

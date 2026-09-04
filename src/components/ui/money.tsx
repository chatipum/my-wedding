import { formatBaht } from '@/lib/money'

/** จุดเดียวในระบบที่เรียก formatBaht — ทำให้กฎ "format ตอนแสดงเท่านั้น" เกิดขึ้นจริง */
export function Money({ value }: { value: number | null }) {
  if (value === null) return <span className="text-unknown">ยังไม่ระบุ</span>
  return <data value={String(value)}>{formatBaht(value)}</data>
}

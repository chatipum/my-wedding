import type { Guest, Side } from '@/db/schema'
import { headcount } from '@/lib/totals'

/** ผังตาม docs/เวที4.png — เลขช่อง = (แถว-1) × 6 + คอลัมน์ นับจากแถวติดเวที ซ้ายไปขวา (ดู docs/superpowers/specs/2026-11-21-seating-design.md) */
export const PLAN_COLUMNS = 6
export const PLAN_ROWS = 9
export const SEATS_PER_TABLE = 8

/** โต๊ะยาวประธานและครอบครัว ฝั่งเจ้าบ่าว คอลัมน์ 4 กินแถว 1–2 */
export const LONG_TABLE_INDEX = 3
const LONG_TABLE_SEATS = 16

const CELLS_WITHOUT_TABLE = new Set([
  LONG_TABLE_INDEX + PLAN_COLUMNS,
  (PLAN_ROWS - 1) * PLAN_COLUMNS,
  PLAN_ROWS * PLAN_COLUMNS - 1,
])

export const TABLE_INDEXES = Array.from(
  { length: PLAN_COLUMNS * PLAN_ROWS },
  (_, index) => index,
).filter((index) => !CELLS_WITHOUT_TABLE.has(index))

export function tableSeats(index: number): number {
  return index === LONG_TABLE_INDEX ? LONG_TABLE_SEATS : SEATS_PER_TABLE
}

export const TOTAL_SEATS = TABLE_INDEXES.reduce((sum, index) => sum + tableSeats(index), 0)

export function tableSide(index: number): Side {
  return index % PLAN_COLUMNS < PLAN_COLUMNS / 2 ? 'bride' : 'groom'
}

export function tableRow(index: number): number {
  return Math.floor(index / PLAN_COLUMNS) + 1
}

export function tableColumn(index: number): number {
  return (index % PLAN_COLUMNS) + 1
}

type SeatedGuest = Pick<Guest, 'name' | 'nickname' | 'rsvp' | 'companionsConfirmed'>

function nicknameOf(guest: SeatedGuest): string {
  if (guest.nickname) return guest.nickname
  // ตัดตามตัวอักษรที่เห็น ไม่ใช่ code unit — สระ/วรรณยุกต์ไทยต้องติดไปกับพยัญชนะ
  const graphemes = [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(guest.name)]
  return graphemes
    .slice(0, 2)
    .map((part) => part.segment)
    .join('')
}

/** ป้ายเก้าอี้ตามลำดับ: แขกหลักใช้ชื่อย่อ ผู้ติดตามต่อเลข (สช สช2 สช3) */
export function chairLabels(guests: SeatedGuest[]): string[] {
  return guests.flatMap((guest) => {
    const nickname = nicknameOf(guest)
    return Array.from({ length: headcount(guest) }, (_, order) =>
      order === 0 ? nickname : `${nickname}${order + 1}`,
    )
  })
}

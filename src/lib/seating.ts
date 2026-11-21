import type { Side } from '@/db/schema'
import { type GuestRow, headcount } from '@/lib/totals'

/** ผังตาม docs/เวที.png — นับ index จากแถวหน้าติดเวที ซ้ายไปขวา (ดู docs/superpowers/specs/2026-11-21-seating-design.md) */
export const PLAN_COLUMNS = 6
export const PLAN_ROWS = 8
export const TABLE_COUNT = PLAN_COLUMNS * PLAN_ROWS
export const SEATS_PER_TABLE = 8

export const TABLE_INDEXES = Array.from({ length: TABLE_COUNT }, (_, index) => index)

export function tableSide(index: number): Side {
  return index % PLAN_COLUMNS < PLAN_COLUMNS / 2 ? 'bride' : 'groom'
}

export function tableRow(index: number): number {
  return Math.floor(index / PLAN_COLUMNS) + 1
}

export type SeatedRow = Pick<GuestRow, 'rsvp' | 'companionsConfirmed'> & {
  tableIndex: number | null
}

export function seatsUsedByTable(rows: SeatedRow[]): Map<number, number> {
  return rows.reduce((used, row) => {
    if (row.tableIndex === null) return used
    return used.set(row.tableIndex, (used.get(row.tableIndex) ?? 0) + headcount(row))
  }, new Map<number, number>())
}

import type { Rsvp, Side } from '@/db/schema'

export const NO_CATEGORY = 'ไม่ระบุหมวด'

export type AmountRow = { amount: number | null; isPaid: boolean }
export type MoneySummary = { paid: number; unpaid: number; unknownCount: number }

export function summarizeExpenses(rows: AmountRow[]): MoneySummary {
  return rows.reduce<MoneySummary>(
    (acc, row) => {
      // null = ยังไม่รู้ยอด ห้ามนับเป็น 0 เพราะทำให้ตัวเลขค้างจ่ายต่ำกว่าความจริงเงียบๆ
      if (row.amount === null) {
        return { paid: acc.paid, unpaid: acc.unpaid, unknownCount: acc.unknownCount + 1 }
      }
      if (row.isPaid) {
        return { paid: acc.paid + row.amount, unpaid: acc.unpaid, unknownCount: acc.unknownCount }
      }
      return { paid: acc.paid, unpaid: acc.unpaid + row.amount, unknownCount: acc.unknownCount }
    },
    { paid: 0, unpaid: 0, unknownCount: 0 },
  )
}

export type CategoryRow = AmountRow & { category: string | null }
export type CategorySummary = MoneySummary & { category: string; total: number; count: number }

export function summarizeByCategory(rows: CategoryRow[]): CategorySummary[] {
  const buckets = new Map<string, CategoryRow[]>()

  rows.forEach((row) => {
    const key = row.category?.trim() || NO_CATEGORY
    buckets.set(key, [...(buckets.get(key) ?? []), row])
  })

  return [...buckets.entries()]
    .map(([category, bucketRows]) => {
      const summary = summarizeExpenses(bucketRows)
      return {
        category,
        ...summary,
        total: summary.paid + summary.unpaid,
        count: bucketRows.length,
      }
    })
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'th'))
}

export function sumEnvelopes(rows: { amount: number }[]): number {
  return rows.reduce((total, row) => total + row.amount, 0)
}

export type NetSummary = MoneySummary & { received: number; net: number }

export function summarizeNet(
  expenseRows: AmountRow[],
  envelopeRows: { amount: number }[],
): NetSummary {
  const expenses = summarizeExpenses(expenseRows)
  const received = sumEnvelopes(envelopeRows)
  return { ...expenses, received, net: received - expenses.paid - expenses.unpaid }
}

export type GuestRow = {
  rsvp: Rsvp
  companionsConfirmed: number | null
  invitationGiven: boolean
}
export type GuestCounts = {
  /** คน — ตัวแขกเอง + ผู้ติดตามที่ยืนยันแล้ว นับเฉพาะแถวที่ตอบว่ามา */
  confirmed: number
  /** แถว ไม่ใช่คน — จำนวนแขกที่ตอบว่ามา เป็นตัวหารของคนเฉลี่ยต่อซอง */
  confirmedRows: number
  declined: number
  pending: number
  invitationsGiven: number
  /** จำนวนแถวแขก ไม่ใช่จำนวนคน — เป็นตัวหารของยอดแจกซอง เพราะซองแจกต่อแถว ไม่ได้แจกรายผู้ติดตาม */
  total: number
}

export function countGuests(rows: GuestRow[]): GuestCounts {
  return rows.reduce<GuestCounts>(
    (acc, row) => {
      // นับก่อนแยกทาง rsvp — คนที่ตอบว่าไม่มาก็ได้รับการ์ดไปแล้วจริง ต่างจากยอดประมาณการที่ตัดเขาออก
      const invitationsGiven = row.invitationGiven ? acc.invitationsGiven + 1 : acc.invitationsGiven
      const total = acc.total + 1

      if (row.rsvp === 'no') {
        return {
          confirmed: acc.confirmed,
          confirmedRows: acc.confirmedRows,
          declined: acc.declined + 1,
          pending: acc.pending,
          invitationsGiven,
          total,
        }
      }

      const pending = row.rsvp === 'pending' ? acc.pending + 1 : acc.pending
      // null = ยังไม่ได้ถามผู้ติดตาม นับแค่ตัวแขกเอง ไม่เดาจำนวนให้ — ตัวเลขต่ำไว้ดีกว่าสูงเกินจริง
      const confirmed =
        row.rsvp === 'yes' ? acc.confirmed + 1 + (row.companionsConfirmed ?? 0) : acc.confirmed
      const confirmedRows = row.rsvp === 'yes' ? acc.confirmedRows + 1 : acc.confirmedRows

      return { confirmed, confirmedRows, declined: acc.declined, pending, invitationsGiven, total }
    },
    { confirmed: 0, confirmedRows: 0, declined: 0, pending: 0, invitationsGiven: 0, total: 0 },
  )
}

export type SidedGuestRow = GuestRow & { side: Side }

/**
 * filter แล้วเรียก countGuests ซ้ำต่อฝั่ง ไม่ก๊อปตรรกะการนับมาไว้ที่นี่ —
 * กฎ companionsConfirmed = null และการตัดคนที่ตอบว่าไม่มา ต้องอยู่ที่เดียว
 */
export function countGuestsBySide(rows: SidedGuestRow[]): Record<Side, GuestCounts> {
  return {
    groom: countGuests(rows.filter((row) => row.side === 'groom')),
    bride: countGuests(rows.filter((row) => row.side === 'bride')),
  }
}

export type VendorExpenseRow = AmountRow & { vendorId: number | null }
export type VendorSummary = MoneySummary & { total: number; count: number }

export function summarizeByVendor(rows: VendorExpenseRow[]): Map<number, VendorSummary> {
  const buckets = new Map<number, VendorExpenseRow[]>()

  rows
    .filter((row): row is VendorExpenseRow & { vendorId: number } => row.vendorId !== null)
    .forEach((row) => {
      buckets.set(row.vendorId, [...(buckets.get(row.vendorId) ?? []), row])
    })

  return new Map(
    [...buckets.entries()].map(([vendorId, bucketRows]): [number, VendorSummary] => {
      const summary = summarizeExpenses(bucketRows)
      return [
        vendorId,
        { ...summary, total: summary.paid + summary.unpaid, count: bucketRows.length },
      ]
    }),
  )
}

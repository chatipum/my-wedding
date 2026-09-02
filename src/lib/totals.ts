import type { ChecklistStatus, Rsvp } from '@/db/schema'

export const NO_CATEGORY = 'ไม่ระบุหมวด'

export type AmountRow = { amount: number | null; isPaid: boolean }
export type MoneySummary = { paid: number; unpaid: number; unknownCount: number }

export function summarizeExpenses(rows: AmountRow[]): MoneySummary {
  let paid = 0
  let unpaid = 0
  let unknownCount = 0

  for (const row of rows) {
    // null = ยังไม่รู้ยอด ห้ามนับเป็น 0 เพราะทำให้ตัวเลขค้างจ่ายต่ำกว่าความจริงเงียบๆ
    if (row.amount === null) unknownCount += 1
    else if (row.isPaid) paid += row.amount
    else unpaid += row.amount
  }

  return { paid, unpaid, unknownCount }
}

export type CategoryRow = AmountRow & { category: string | null }
export type CategorySummary = MoneySummary & { category: string; total: number; count: number }

export function summarizeByCategory(rows: CategoryRow[]): CategorySummary[] {
  const buckets = new Map<string, CategoryRow[]>()

  for (const row of rows) {
    const key = row.category?.trim() || NO_CATEGORY
    const bucket = buckets.get(key)
    if (bucket) bucket.push(row)
    else buckets.set(key, [row])
  }

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
  companionsEstimated: number
  companionsConfirmed: number | null
}
export type GuestCounts = {
  estimated: number
  confirmed: number
  declined: number
  pending: number
}

export function countGuests(rows: GuestRow[]): GuestCounts {
  let estimated = 0
  let confirmed = 0
  let declined = 0
  let pending = 0

  for (const row of rows) {
    if (row.rsvp === 'no') {
      declined += 1
      continue
    }
    if (row.rsvp === 'pending') pending += 1
    estimated += 1 + row.companionsEstimated
    if (row.rsvp === 'yes') {
      // null = ยังไม่ได้ถามผู้ติดตาม จึงยังต้องใช้ตัวเลขที่คาดไว้
      confirmed += 1 + (row.companionsConfirmed ?? row.companionsEstimated)
    }
  }

  return { estimated, confirmed, declined, pending }
}

export type VendorExpenseRow = AmountRow & { vendorId: number | null }
export type VendorSummary = MoneySummary & { total: number; count: number }

export function summarizeByVendor(rows: VendorExpenseRow[]): Map<number, VendorSummary> {
  const buckets = new Map<number, VendorExpenseRow[]>()

  for (const row of rows) {
    if (row.vendorId === null) continue
    const bucket = buckets.get(row.vendorId)
    if (bucket) bucket.push(row)
    else buckets.set(row.vendorId, [row])
  }

  const result = new Map<number, VendorSummary>()
  for (const [vendorId, bucketRows] of buckets) {
    const summary = summarizeExpenses(bucketRows)
    result.set(vendorId, {
      ...summary,
      total: summary.paid + summary.unpaid,
      count: bucketRows.length,
    })
  }
  return result
}

export type DeadlineRow = {
  id: number
  name: string
  status: ChecklistStatus
  deadline: string | null
}

export function upcomingDeadlines(rows: DeadlineRow[], limit = 5): DeadlineRow[] {
  return rows
    .filter(
      (row): row is DeadlineRow & { deadline: string } =>
        row.status !== 'done' && row.deadline !== null,
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, limit)
}

import 'server-only'
import { asc, desc, eq } from 'drizzle-orm'
import { connection } from 'next/server'
import { db } from '@/db'
import type { Envelope } from '@/db/schema'
import { checklistItems, envelopes, expenses, guests, vendors } from '@/db/schema'
import type { AmountRow, DeadlineRow, GuestRow } from '@/lib/totals'

export type VendorOption = { id: number; name: string }

export type ExpenseWithVendor = {
  id: number
  name: string
  category: string | null
  amount: number | null
  isPaid: boolean
  vendorId: number | null
  vendorName: string | null
  dueDate: string | null
  note: string | null
}

/**
 * connection() อยู่ที่นี่ที่เดียว — ถ้าไม่มี Next จะ prerender หน้าตอน build
 * แล้วยอดเงินบนเว็บจะค้างอยู่ ณ วันนั้นตลอดไปโดยไม่มี error ให้เห็น
 */
export async function loadExpensesPage(): Promise<{
  rows: ExpenseWithVendor[]
  vendorOptions: VendorOption[]
}> {
  await connection()

  const [rows, vendorOptions] = await db.batch([
    db
      .select({
        id: expenses.id,
        name: expenses.name,
        category: expenses.category,
        amount: expenses.amount,
        isPaid: expenses.isPaid,
        vendorId: expenses.vendorId,
        vendorName: vendors.name,
        dueDate: expenses.dueDate,
        note: expenses.note,
      })
      .from(expenses)
      .leftJoin(vendors, eq(expenses.vendorId, vendors.id))
      .orderBy(asc(expenses.id)),
    db.select({ id: vendors.id, name: vendors.name }).from(vendors).orderBy(asc(vendors.id)),
  ])

  return { rows, vendorOptions }
}

export async function listEnvelopes(): Promise<Envelope[]> {
  await connection()
  return db.select().from(envelopes).orderBy(desc(envelopes.id))
}

/**
 * Neon HTTP คิด 1 query = 1 HTTP round trip — batch 4 statement ให้เหลือรอบเดียว
 * แล้วดึงแถวดิบมาคำนวณด้วยฟังก์ชันบริสุทธิ์ ไม่ยิง GROUP BY เพิ่มเพื่อประหยัดการบวกเลข 35 ตัว
 */
export async function loadDashboard(): Promise<{
  expenseRows: AmountRow[]
  envelopeRows: { amount: number }[]
  guestRows: GuestRow[]
  checklistRows: DeadlineRow[]
}> {
  await connection()

  const [expenseRows, envelopeRows, guestRows, checklistRows] = await db.batch([
    db.select({ amount: expenses.amount, isPaid: expenses.isPaid }).from(expenses),
    db.select({ amount: envelopes.amount }).from(envelopes),
    db
      .select({
        rsvp: guests.rsvp,
        companionsEstimated: guests.companionsEstimated,
        companionsConfirmed: guests.companionsConfirmed,
      })
      .from(guests),
    db
      .select({
        id: checklistItems.id,
        name: checklistItems.name,
        status: checklistItems.status,
        deadline: checklistItems.deadline,
      })
      .from(checklistItems),
  ])

  return { expenseRows, envelopeRows, guestRows, checklistRows }
}

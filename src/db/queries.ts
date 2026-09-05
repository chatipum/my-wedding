import 'server-only'
import { asc, desc, eq } from 'drizzle-orm'
import { connection } from 'next/server'
import { db } from '@/db'
import type { Envelope, Guest, Vendor } from '@/db/schema'
import { envelopes, expenses, guests, vendors } from '@/db/schema'
import type { AmountRow, SidedGuestRow, VendorExpenseRow } from '@/lib/totals'

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

/** โหลดทั้ง 400 แถวรวดเดียว — ค้นหา/filter ทำฝั่ง client ไม่ยิง query เพิ่ม */
export async function listGuests(): Promise<Guest[]> {
  await connection()
  return db.select().from(guests).orderBy(asc(guests.id))
}

/**
 * Neon HTTP คิด 1 query = 1 HTTP round trip — batch 3 statement ให้เหลือรอบเดียว
 * แล้วดึงแถวดิบมาคำนวณด้วยฟังก์ชันบริสุทธิ์ ไม่ยิง GROUP BY เพิ่มเพื่อประหยัดการบวกเลข 35 ตัว
 */
export async function loadDashboard(): Promise<{
  expenseRows: AmountRow[]
  envelopeRows: { amount: number }[]
  guestRows: SidedGuestRow[]
}> {
  await connection()

  const [expenseRows, envelopeRows, guestRows] = await db.batch([
    db.select({ amount: expenses.amount, isPaid: expenses.isPaid }).from(expenses),
    db.select({ amount: envelopes.amount }).from(envelopes),
    db
      .select({
        rsvp: guests.rsvp,
        side: guests.side,
        companionsEstimated: guests.companionsEstimated,
        companionsConfirmed: guests.companionsConfirmed,
        invitationGiven: guests.invitationGiven,
      })
      .from(guests),
  ])

  return { expenseRows, envelopeRows, guestRows }
}

/**
 * JOIN ครั้งเดียวแล้วรวมยอดใน JS — ห้ามวน query หายอดทีละเจ้า (N+1)
 * และไม่ใช้ GROUP BY เพราะตรรกะการเงินที่อยู่ใน SQL ทดสอบด้วย unit test ไม่ได้
 */
export async function loadVendorsPage(): Promise<{
  vendorRows: Vendor[]
  expenseRows: VendorExpenseRow[]
}> {
  await connection()

  const joined = await db
    .select({
      vendor: vendors,
      amount: expenses.amount,
      isPaid: expenses.isPaid,
      expenseId: expenses.id,
    })
    .from(vendors)
    .leftJoin(expenses, eq(expenses.vendorId, vendors.id))
    .orderBy(asc(vendors.id), asc(expenses.id))

  const vendorMap = new Map(joined.map((row) => [row.vendor.id, row.vendor]))
  // leftJoin ให้แถวที่ไม่มี expense กลับมาด้วย — แถวแบบนั้นไม่ใช่ค่าใช้จ่าย
  // (isPaid เป็น NOT NULL ในตาราง expenses จริง แต่ leftJoin ทำให้ type เป็น nullable — แคบ type ตรงนี้)
  const expenseRows: VendorExpenseRow[] = joined
    .filter(
      (row): row is typeof row & { expenseId: number; isPaid: boolean } => row.expenseId !== null,
    )
    .map((row) => ({ vendorId: row.vendor.id, amount: row.amount, isPaid: row.isPaid }))

  return { vendorRows: [...vendorMap.values()], expenseRows }
}

import 'server-only'
import { asc, desc, eq } from 'drizzle-orm'
import { connection } from 'next/server'
import { db } from '@/db'
import type { Envelope } from '@/db/schema'
import { envelopes, expenses, vendors } from '@/db/schema'

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

import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { envelopes, expenses } from '@/db/schema'
import type { EnvelopeValues } from '@/lib/schemas/envelope'
import type { ExpenseValues } from '@/lib/schemas/expense'

export async function createExpense(values: ExpenseValues): Promise<void> {
  await db.insert(expenses).values(values)
}

export async function updateExpense(id: number, values: ExpenseValues): Promise<void> {
  await db
    .update(expenses)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(expenses.id, id))
}

export async function setExpensePaid(id: number, isPaid: boolean): Promise<void> {
  await db.update(expenses).set({ isPaid, updatedAt: new Date() }).where(eq(expenses.id, id))
}

export async function deleteExpense(id: number): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id))
}

export async function createEnvelope(values: EnvelopeValues): Promise<void> {
  await db.insert(envelopes).values(values)
}

export async function deleteEnvelope(id: number): Promise<void> {
  await db.delete(envelopes).where(eq(envelopes.id, id))
}

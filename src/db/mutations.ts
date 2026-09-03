import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import type { Rsvp } from '@/db/schema'
import { envelopes, expenses, guests } from '@/db/schema'
import type { EnvelopeValues } from '@/lib/schemas/envelope'
import type { ExpenseValues } from '@/lib/schemas/expense'
import type { GuestValues } from '@/lib/schemas/guest'

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

export async function createGuest(values: GuestValues): Promise<void> {
  await db.insert(guests).values(values)
}

export async function setGuestRsvp(id: number, rsvp: Rsvp): Promise<void> {
  await db.update(guests).set({ rsvp }).where(eq(guests.id, id))
}

export async function deleteGuest(id: number): Promise<void> {
  await db.delete(guests).where(eq(guests.id, id))
}

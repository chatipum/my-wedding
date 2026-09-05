import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { envelopes, expenses, guests, vendors } from '@/db/schema'
import type { EnvelopeValues } from '@/lib/schemas/envelope'
import type { ExpenseValues } from '@/lib/schemas/expense'
import type { GuestValues } from '@/lib/schemas/guest'
import type { VendorValues } from '@/lib/schemas/vendor'

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

export async function updateEnvelope(id: number, values: EnvelopeValues): Promise<void> {
  await db.update(envelopes).set(values).where(eq(envelopes.id, id))
}

export async function deleteEnvelope(id: number): Promise<void> {
  await db.delete(envelopes).where(eq(envelopes.id, id))
}

export async function createGuest(values: GuestValues): Promise<void> {
  await db.insert(guests).values(values)
}

export async function updateGuest(id: number, values: GuestValues): Promise<void> {
  await db.update(guests).set(values).where(eq(guests.id, id))
}

export async function setGuestInvitationGiven(id: number, invitationGiven: boolean): Promise<void> {
  await db.update(guests).set({ invitationGiven }).where(eq(guests.id, id))
}

export async function deleteGuest(id: number): Promise<void> {
  await db.delete(guests).where(eq(guests.id, id))
}

export async function createVendor(values: VendorValues): Promise<void> {
  await db.insert(vendors).values(values)
}

export async function updateVendor(id: number, values: VendorValues): Promise<void> {
  await db.update(vendors).set(values).where(eq(vendors.id, id))
}

export async function deleteVendor(id: number): Promise<void> {
  await db.delete(vendors).where(eq(vendors.id, id))
}

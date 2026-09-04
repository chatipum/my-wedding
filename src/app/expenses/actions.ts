'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createExpense, deleteExpense, setExpensePaid, updateExpense } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { expenseInputSchema, expenseUpdateSchema, togglePaidSchema } from '@/lib/schemas/expense'
import { idSchema } from '@/lib/schemas/shared'

function revalidate(): void {
  revalidatePath('/expenses')
  revalidatePath('/vendors')
  revalidatePath('/')
}

export async function createExpenseAction(raw: unknown): Promise<ActionResult> {
  try {
    // client validate ไปแล้วก็ต้อง parse ซ้ำที่นี่ — ฝั่ง client เป็นเรื่อง UX ไม่ใช่การรับประกันข้อมูล
    const values = v.parse(expenseInputSchema, raw)
    await createExpense(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateExpenseAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, ...values } = v.parse(expenseUpdateSchema, raw)
    await updateExpense(id, values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function togglePaidAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, isPaid } = v.parse(togglePaidSchema, raw)
    await setExpensePaid(id, isPaid)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteExpenseAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteExpense(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

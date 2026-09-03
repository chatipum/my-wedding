'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createVendor, deleteVendor, updateVendor } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { idSchema } from '@/lib/schemas/shared'
import { vendorInputSchema, vendorUpdateSchema } from '@/lib/schemas/vendor'

function revalidate(): void {
  revalidatePath('/vendors')
  revalidatePath('/expenses')
  revalidatePath('/checklist')
  revalidatePath('/')
}

export async function createVendorAction(raw: unknown): Promise<ActionResult> {
  try {
    const values = v.parse(vendorInputSchema, raw)
    await createVendor(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateVendorAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, ...values } = v.parse(vendorUpdateSchema, raw)
    await updateVendor(id, values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteVendorAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteVendor(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    // ลบ vendor ที่ยังมี expense ผูกอยู่จะติด FK — ข้อความจริงจาก Postgres โผล่ใน <details>
    return toActionResult(error)
  }
}

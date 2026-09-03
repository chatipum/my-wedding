'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createChecklistItem, deleteChecklistItem, setChecklistStatus } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { checklistInputSchema, toggleChecklistStatusSchema } from '@/lib/schemas/checklist'
import { idSchema } from '@/lib/schemas/shared'

function revalidate(): void {
  revalidatePath('/checklist')
  revalidatePath('/')
}

export async function createChecklistItemAction(raw: unknown): Promise<ActionResult> {
  try {
    const values = v.parse(checklistInputSchema, raw)
    await createChecklistItem(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function setChecklistStatusAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, status } = v.parse(toggleChecklistStatusSchema, raw)
    await setChecklistStatus(id, status)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteChecklistItemAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteChecklistItem(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

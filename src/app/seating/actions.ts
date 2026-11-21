'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { setGuestTable } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { assignTableSchema } from '@/lib/schemas/guest'

export async function assignTableAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, tableIndex } = v.parse(assignTableSchema, raw)
    await setGuestTable(id, tableIndex)
    revalidatePath('/seating')
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

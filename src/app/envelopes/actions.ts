'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createEnvelope, deleteEnvelope } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { envelopeInputSchema } from '@/lib/schemas/envelope'
import { idSchema } from '@/lib/schemas/shared'

function revalidate(): void {
  revalidatePath('/envelopes')
  revalidatePath('/')
}

export async function createEnvelopeAction(raw: unknown): Promise<ActionResult> {
  try {
    const values = v.parse(envelopeInputSchema, raw)
    await createEnvelope(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteEnvelopeAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteEnvelope(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

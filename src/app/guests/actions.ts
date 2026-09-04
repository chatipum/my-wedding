'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createGuest, deleteGuest, setGuestRsvp, updateGuest } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { guestInputSchema, guestUpdateSchema, toggleRsvpSchema } from '@/lib/schemas/guest'
import { idSchema } from '@/lib/schemas/shared'

function revalidate(): void {
  revalidatePath('/guests')
  revalidatePath('/')
}

export async function createGuestAction(raw: unknown): Promise<ActionResult> {
  try {
    const values = v.parse(guestInputSchema, raw)
    await createGuest(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function setRsvpAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, rsvp } = v.parse(toggleRsvpSchema, raw)
    await setGuestRsvp(id, rsvp)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateGuestAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, ...values } = v.parse(guestUpdateSchema, raw)
    await updateGuest(id, values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteGuestAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteGuest(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

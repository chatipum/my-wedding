'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import {
  createGuest,
  createGuests,
  deleteGuest,
  setGuestInvitationGiven,
  updateGuest,
} from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import {
  guestImportSchema,
  guestInputSchema,
  guestUpdateSchema,
  toggleInvitationSchema,
} from '@/lib/schemas/guest'
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

export async function importGuestsAction(raw: unknown): Promise<ActionResult> {
  try {
    const { names, side, group } = v.parse(guestImportSchema, raw)
    // แขกที่ import มาจากรายชื่อที่ตอบรับแล้ว จึงลงเป็น 'มาแน่' และผู้ติดตาม 0 ไม่ใช่ค่าเริ่มต้นของฟอร์ม
    await createGuests(
      names.map((name) => ({
        name,
        side,
        group,
        companionsConfirmed: 0,
        rsvp: 'yes' as const,
        note: null,
      })),
    )
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function setInvitationGivenAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, invitationGiven } = v.parse(toggleInvitationSchema, raw)
    await setGuestInvitationGiven(id, invitationGiven)
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

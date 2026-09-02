import * as v from 'valibot'
import { idNumber, optionalCount, optionalText, requiredCount, requiredText } from './shared'

export const sideSchema = v.picklist(['groom', 'bride'], 'เลือกฝ่ายเจ้าบ่าวหรือเจ้าสาว')
export const rsvpSchema = v.picklist(['pending', 'yes', 'no'], 'สถานะตอบรับไม่ถูกต้อง')

export const guestInputSchema = v.object({
  name: requiredText('ชื่อแขก'),
  side: sideSchema,
  group: optionalText,
  companionsEstimated: requiredCount,
  companionsConfirmed: optionalCount,
  rsvp: rsvpSchema,
  note: optionalText,
})

export const guestUpdateSchema = v.object({ id: idNumber, ...guestInputSchema.entries })

export const toggleRsvpSchema = v.object({ id: idNumber, rsvp: rsvpSchema })

export type GuestInput = v.InferInput<typeof guestInputSchema>
export type GuestValues = v.InferOutput<typeof guestInputSchema>

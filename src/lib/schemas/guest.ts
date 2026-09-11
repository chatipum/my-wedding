import * as v from 'valibot'
import { idNumber, optionalInteger, optionalText, requiredText } from './shared'

export const sideSchema = v.picklist(['groom', 'bride'], 'เลือกฝ่ายเจ้าบ่าวหรือเจ้าสาว')
export const rsvpSchema = v.picklist(['pending', 'yes', 'no'], 'สถานะตอบรับไม่ถูกต้อง')

export const guestInputSchema = v.object({
  name: requiredText('ชื่อแขก'),
  side: sideSchema,
  group: optionalText,
  companionsConfirmed: optionalInteger,
  rsvp: rsvpSchema,
  note: optionalText,
})

export const guestUpdateSchema = v.object({ id: idNumber, ...guestInputSchema.entries })

/**
 * แยกจาก guestInputSchema ตั้งใจ — ฟอร์มเพิ่ม/แก้ไขไม่มีช่องนี้
 * ถ้ารวมเข้าไป updateGuest จะ set ค่ากลับเป็น false ทุกครั้งที่แก้ชื่อแขก
 */
export const toggleInvitationSchema = v.object({ id: idNumber, invitationGiven: v.boolean() })

export type GuestInput = v.InferInput<typeof guestInputSchema>
export type GuestValues = v.InferOutput<typeof guestInputSchema>

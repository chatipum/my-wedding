import * as v from 'valibot'
import { TABLE_COUNT } from '@/lib/seating'
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

/** แยกจาก guestInputSchema ด้วยเหตุผลเดียวกับ toggleInvitationSchema — แก้แขกต้องไม่ล้างโต๊ะ */
export const assignTableSchema = v.object({
  id: idNumber,
  tableIndex: v.nullable(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(TABLE_COUNT - 1, 'ไม่มีโต๊ะนี้')),
  ),
})

/**
 * นำเข้าจาก Excel: ไฟล์ให้มาแค่ชื่อ ฝ่ายกับกลุ่มเลือกบนหน้าจอครั้งเดียวใช้กับทุกแถว
 * แขกที่ import ถือว่าตอบรับแล้วและมาคนเดียว (rsvp/ผู้ติดตามจึงไม่ได้อยู่ในนี้ — ดู importGuestsAction)
 */
export const guestImportSchema = v.object({
  names: v.pipe(v.array(requiredText('ชื่อแขก')), v.minLength(1, 'เลือกอย่างน้อย 1 ชื่อ')),
  side: sideSchema,
  group: optionalText,
})

export type GuestInput = v.InferInput<typeof guestInputSchema>
export type GuestValues = v.InferOutput<typeof guestInputSchema>

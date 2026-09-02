import * as v from 'valibot'
import { isBahtInput, parseBaht } from '@/lib/money'

export const idSchema = v.object({
  id: v.pipe(v.number(), v.integer(), v.minValue(1)),
})

export const idNumber = v.pipe(v.number(), v.integer(), v.minValue(1))

export const requiredText = (label: string) =>
  v.pipe(v.string(), v.trim(), v.minLength(1, `ต้องใส่${label}`))

/** ช่องข้อความที่เว้นว่างได้ — '' กลายเป็น null ไม่ใช่สตริงว่างใน DB */
export const optionalText = v.pipe(
  v.string(),
  v.trim(),
  v.transform((s): string | null => (s === '' ? null : s)),
)

/** string เข้า → number | null ออก · '' = ยังไม่ระบุยอด */
export const optionalBaht = v.pipe(
  v.string(),
  v.check(isBahtInput, 'ยอดเงินต้องเป็นจำนวนเต็มบาท เช่น 70,000'),
  v.transform((s): number | null => parseBaht(s)),
)

export const requiredBaht = v.pipe(
  v.string(),
  v.check(isBahtInput, 'ยอดเงินต้องเป็นจำนวนเต็มบาท เช่น 1,000'),
  v.check((s) => s.trim() !== '', 'ต้องใส่ยอดเงิน'),
  v.transform((s): number => parseBaht(s) as number),
)

export const optionalId = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || /^\d+$/.test(s.trim()), 'เลือกจากรายการเท่านั้น'),
  v.transform((s): number | null => (s.trim() === '' ? null : Number(s))),
)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const optionalDate = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || ISO_DATE.test(s.trim()), 'วันที่ต้องอยู่ในรูปแบบ ปปปป-ดด-วว'),
  v.transform((s): string | null => (s.trim() === '' ? null : s.trim())),
)

export const requiredDate = v.pipe(v.string(), v.trim(), v.regex(ISO_DATE, 'ต้องใส่วันที่'))

/** จำนวนคน — ว่างเปล่าถือเป็น 0 */
export const requiredCount = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || /^\d+$/.test(s.trim()), 'ต้องเป็นจำนวนเต็มไม่ติดลบ'),
  v.transform((s): number => (s.trim() === '' ? 0 : Number(s))),
)

/** จำนวนคน — ว่างเปล่า = ยังไม่ได้ถาม (null) ต่างจาก 0 = ถามแล้วมาคนเดียว */
export const optionalCount = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || /^\d+$/.test(s.trim()), 'ต้องเป็นจำนวนเต็มไม่ติดลบ'),
  v.transform((s): number | null => (s.trim() === '' ? null : Number(s))),
)

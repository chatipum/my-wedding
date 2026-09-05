import * as v from 'valibot'

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

const MAX_INT = 2_147_483_647

/** ช่องกรอกตัวเลข: ตัดจุลภาคกับช่องว่างทิ้งก่อน แล้วรับเฉพาะจำนวนเต็มไม่ติดลบ */
const digits = (s: string) => s.replace(/[,\s]/g, '')

const isValidDigits = (s: string) => digits(s) === '' || /^\d+$/.test(digits(s))
const isWithinRange = (s: string) => digits(s) === '' || Number(digits(s)) <= MAX_INT

/** string เข้า → number | null ออก · '' = ยังไม่ระบุ (เช่น ยอดค่าใช้จ่าย · ราคาเหมา vendor) */
export const optionalInteger = v.pipe(
  v.string(),
  v.check(isValidDigits, 'ต้องเป็นจำนวนเต็มไม่ติดลบ'),
  v.check(isWithinRange, 'ตัวเลขใหญ่เกินไป'),
  v.transform((s): number | null => (digits(s) === '' ? null : Number(digits(s)))),
)

/** string เข้า → number ออกเสมอ · '' = error เพราะเป็นช่องบังคับ (เช่น ยอดซอง) */
export const requiredInteger = (label: string) =>
  v.pipe(
    v.string(),
    v.check((s) => digits(s) !== '', `ต้องใส่${label}`),
    v.check(isValidDigits, 'ต้องเป็นจำนวนเต็มไม่ติดลบ'),
    v.check(isWithinRange, 'ตัวเลขใหญ่เกินไป'),
    v.transform((s): number => Number(digits(s))),
  )

/** จำนวนคน — ว่างเปล่าถือเป็น 0 (เช่น companionsEstimated) */
export const countOrZero = v.pipe(
  v.string(),
  v.check(isValidDigits, 'ต้องเป็นจำนวนเต็มไม่ติดลบ'),
  v.check(isWithinRange, 'ตัวเลขใหญ่เกินไป'),
  v.transform((s): number => (digits(s) === '' ? 0 : Number(digits(s)))),
)

export const optionalId = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || /^\d+$/.test(s.trim()), 'เลือกจากรายการเท่านั้น'),
  v.transform((s): number | null => (s.trim() === '' ? null : Number(s))),
)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** ตรวจว่าเป็นวันที่ที่มีอยู่จริง (กัน 2026-13-45 / 2026-02-31 ที่ผ่านแค่รูปแบบแต่ Postgres ปฏิเสธ) */
const isValidCalendarDate = (s: string) => {
  const trimmed = s.trim()
  if (trimmed === '') return true
  const parsed = new Date(`${trimmed}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === trimmed
}

export const optionalDate = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || ISO_DATE.test(s.trim()), 'วันที่ต้องอยู่ในรูปแบบ ปปปป-ดด-วว'),
  v.check(isValidCalendarDate, 'ไม่มีวันที่นี้อยู่จริง'),
  v.transform((s): string | null => (s.trim() === '' ? null : s.trim())),
)

export const requiredDate = v.pipe(
  v.string(),
  v.trim(),
  v.regex(ISO_DATE, 'ต้องใส่วันที่'),
  v.check(isValidCalendarDate, 'ไม่มีวันที่นี้อยู่จริง'),
)

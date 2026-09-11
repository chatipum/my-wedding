const MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

/** '2026-11-28' → '28 พ.ย. 69' — ค่าดิบยังเก็บใน dateTime ของ <time> */
export function formatThaiDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) throw new Error(`รูปแบบวันที่ไม่ถูกต้อง: ${iso}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const buddhistYear = (year + 543) % 100
  return `${day} ${MONTHS[month - 1]} ${String(buddhistYear).padStart(2, '0')}`
}

const TODAY_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' })

/** วันที่ "วันนี้" ตามเวลาไทย (ไม่ใช่ UTC) — en-CA ให้รูปแบบ ปปปป-ดด-วว อยู่แล้ว */
export function todayIso(): string {
  return TODAY_FORMAT.format(new Date())
}

const BANGKOK_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** timestamp จาก DB → '28 พ.ย. 69 19:05' ตามเวลาไทย (ใช้กับเวลารับซอง) */
export function formatThaiDateTime(value: Date): string {
  // en-CA ให้ 'ปปปป-ดด-วว, ชช:นน' — แยกวันกับเวลาแล้วส่งวันต่อให้ formatThaiDate
  const [iso, time] = BANGKOK_PARTS.format(value).split(', ')
  return `${formatThaiDate(iso)} ${time}`
}

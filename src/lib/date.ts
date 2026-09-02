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

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

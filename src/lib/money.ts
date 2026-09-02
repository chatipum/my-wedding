const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'

export class InvalidBahtError extends Error {
  constructor(input: string) {
    super(`ยอดเงินไม่ถูกต้อง: ${JSON.stringify(input)}`)
    this.name = 'InvalidBahtError'
  }
}

function normalize(input: string): string {
  return input
    .replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)))
    .replace(/฿/g, '')
    .replace(/บาท/g, '')
    .replace(/[,\s ]/g, '')
}

/** เรียกได้จาก valibot schema เท่านั้น — สตริงว่าง = ยังไม่ระบุยอด (null) */
export function parseBaht(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const s = normalize(input)
  if (!/^\d+$/.test(s)) throw new InvalidBahtError(input)
  const n = Number(s)
  if (!Number.isSafeInteger(n)) throw new InvalidBahtError(input)
  return n
}

export function isBahtInput(input: string): boolean {
  try {
    parseBaht(input)
    return true
  } catch {
    return false
  }
}

const BAHT_FORMAT = new Intl.NumberFormat('th-TH', {
  numberingSystem: 'latn',
  maximumFractionDigits: 0,
})

/** เรียกได้จาก component เท่านั้น — ปกติผ่าน <Money> */
export function formatBaht(n: number): string {
  return BAHT_FORMAT.format(n)
}

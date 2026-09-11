const BAHT_FORMAT = new Intl.NumberFormat('th-TH', {
  numberingSystem: 'latn',
  maximumFractionDigits: 0,
})

/** เรียกได้จาก component เท่านั้น — ปกติผ่าน <Money> */
export function formatBaht(n: number): string {
  return `${BAHT_FORMAT.format(n)} บาท`
}

/**
 * ปุ่มยอดด่วนในหน้าซองรับ — บวกยอดของปุ่มเข้ากับค่าที่อยู่ในช่องกรอก
 * ค่าที่ไม่ใช่ตัวเลข (รวมช่องว่าง) ถือเป็น 0 เพื่อให้กดปุ่มแล้วได้ยอดเสมอ
 */
export function addQuickAmount(current: string, delta: number): string {
  const digits = current.replace(/[,\s]/g, '')
  const base = /^\d+$/.test(digits) ? Number(digits) : 0
  return String(base + delta)
}

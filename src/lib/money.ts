const BAHT_FORMAT = new Intl.NumberFormat('th-TH', {
  numberingSystem: 'latn',
  maximumFractionDigits: 0,
})

/** เรียกได้จาก component เท่านั้น — ปกติผ่าน <Money> */
export function formatBaht(n: number): string {
  return `${BAHT_FORMAT.format(n)} บาท`
}

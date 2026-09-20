/** แถวที่อ่านได้จากไฟล์ Excel พร้อมธงว่าชื่อนี้น่าจะมีอยู่แล้ว */
export type ImportRow = { name: string; duplicate: boolean }

/** เทียบชื่อแบบหลวมๆ เพราะชื่อที่พิมพ์มาจากคนละไฟล์มักต่างกันแค่ช่องว่างหรือตัวพิมพ์ */
function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * แถวแรกเป็นหัวตารางเสมอจึงตัดทิ้ง — ไฟล์ที่ใช้ import มาจาก export ของหน้านี้หรือพิมพ์เองโดยมีหัวคอลัมน์
 * ชื่อซ้ำไม่ถูกตัดทิ้ง แค่ติดธงไว้ให้หน้าจอติ๊กออกให้ ผู้ใช้ยังติ๊กกลับเองได้
 */
export function toImportRows(
  rows: readonly unknown[][],
  existingNames: readonly string[],
): ImportRow[] {
  const seen = new Set(existingNames.map(normalize))

  return rows.slice(1).flatMap((row) => {
    const name = String(row?.[0] ?? '').trim()
    if (name === '') return []

    const key = normalize(name)
    const duplicate = seen.has(key)
    seen.add(key)
    return [{ name, duplicate }]
  })
}

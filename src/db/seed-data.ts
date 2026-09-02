import * as v from 'valibot'

const bahtInteger = v.pipe(v.number(), v.integer('ยอดเงินต้องเป็นจำนวนเต็มบาท'), v.minValue(0))

const seedVendorSchema = v.object({
  id: v.pipe(v.number(), v.integer(), v.minValue(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  role: v.nullable(v.string()),
  phone: v.nullable(v.string()),
  line: v.nullable(v.string()),
  totalPrice: v.nullable(bahtInteger),
  note: v.nullable(v.string()),
})

const seedExpenseSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  category: v.nullable(v.string()),
  /** notion = มาจาก Notion ตรงๆ · filled-in = เติมเองตอนย้ายข้อมูล ต้องตรวจได้ */
  categorySource: v.picklist(['notion', 'filled-in']),
  amount: v.nullable(bahtInteger),
  isPaid: v.boolean(),
  vendorId: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1))),
  dueDate: v.nullable(v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/))),
  note: v.nullable(v.string()),
})

const seedFileSchema = v.object({
  vendors: v.array(seedVendorSchema),
  expenses: v.array(seedExpenseSchema),
})

export type SeedVendor = v.InferOutput<typeof seedVendorSchema>
export type SeedExpense = v.InferOutput<typeof seedExpenseSchema>
export type SeedFile = v.InferOutput<typeof seedFileSchema>

export function parseSeedFile(raw: unknown): SeedFile {
  const file = v.parse(seedFileSchema, raw)

  const ids = file.vendors.reduce((seen, vendor) => {
    if (seen.has(vendor.id)) throw new Error(`vendor id ซ้ำ: ${vendor.id}`)
    return seen.add(vendor.id)
  }, new Set<number>())

  const unknownVendorExpenses = file.expenses.filter(
    (expense) => expense.vendorId !== null && !ids.has(expense.vendorId),
  )
  const firstUnknown = unknownVendorExpenses[0]
  if (firstUnknown) {
    throw new Error(
      `vendorId ${firstUnknown.vendorId} ของรายการ "${firstUnknown.name}" ไม่มีอยู่ในรายชื่อ vendor`,
    )
  }

  return file
}

export function seedStats(file: SeedFile) {
  return {
    vendorCount: file.vendors.length,
    expenseCount: file.expenses.length,
    unknownAmountCount: file.expenses.filter((e) => e.amount === null).length,
    filledCategoryCount: file.expenses.filter((e) => e.categorySource === 'filled-in').length,
  }
}

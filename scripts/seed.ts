import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { expenses, vendors } from '@/db/schema'
import { parseSeedFile, seedStats } from '@/db/seed-data'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const force = args.has('--force')

const raw = await Bun.file('data/notion-export.json').json()
const file = parseSeedFile(raw)
const stats = seedStats(file)

console.log(`vendors: ${stats.vendorCount} · expenses: ${stats.expenseCount}`)
console.log(
  `ยังไม่ระบุยอด: ${stats.unknownAmountCount} รายการ · หมวดที่เติมเอง: ${stats.filledCategoryCount} รายการ`,
)

if (dryRun) {
  file.vendors.forEach((vendor) => {
    console.log(`[vendor ${vendor.id}] ${vendor.name}`)
  })
  file.expenses.forEach((expense) => {
    const amount = expense.amount === null ? 'ยังไม่ระบุ' : expense.amount.toLocaleString('en-US')
    const paid = expense.isPaid ? 'จ่ายแล้ว' : 'ค้างจ่าย'
    console.log(
      `[expense] ${expense.name} · ${expense.category ?? 'ไม่ระบุหมวด'} · ${amount} · ${paid} · vendor ${expense.vendorId ?? '-'}`,
    )
  })
  console.log('\n--dry-run: ไม่ได้เขียนอะไรลง DB')
  process.exit(0)
}

const existingVendors = await db.select({ id: vendors.id }).from(vendors).limit(1)
const existingExpenses = await db.select({ id: expenses.id }).from(expenses).limit(1)

if ((existingVendors.length > 0 || existingExpenses.length > 0) && !force) {
  console.error('ตารางมีข้อมูลอยู่แล้ว — ถ้าตั้งใจจะ seed ทับให้ใส่ --force')
  process.exit(1)
}

// neon-http ไม่รองรับ db.transaction() — batch คือวิธีเดียวที่ได้ all-or-nothing
await db.batch([
  db.insert(vendors).values(file.vendors),
  db.insert(expenses).values(
    file.expenses.map((e) => ({
      name: e.name,
      category: e.category,
      amount: e.amount,
      isPaid: e.isPaid,
      vendorId: e.vendorId,
      dueDate: e.dueDate,
      note: e.note,
    })),
  ),
])

// insert id ตรงๆ ลงคอลัมน์ serial ไม่ขยับ sequence — ถ้าไม่ setval แถวที่เพิ่มในเว็บจะชน id ทันที
await db.execute(
  sql`select setval(pg_get_serial_sequence('vendors', 'id'), (select max(id) from vendors))`,
)

console.log(`seed สำเร็จ: vendor ${stats.vendorCount} แถว · expense ${stats.expenseCount} แถว`)

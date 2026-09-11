import { boolean, date, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export type Side = 'groom' | 'bride'
export type Rsvp = 'pending' | 'yes' | 'no'

export const vendors = pgTable('vendors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role'),
  phone: text('phone'),
  line: text('line'),
  totalPrice: integer('total_price'),
  note: text('note'),
})

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  /** บาทเต็ม — null = ยังไม่รู้ยอด ห้ามแปลงเป็น 0 */
  amount: integer('amount'),
  isPaid: boolean('is_paid').notNull().default(false),
  vendorId: integer('vendor_id').references(() => vendors.id),
  dueDate: date('due_date'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/** วันงานต้องกรอกเร็ว — เก็บแค่ยอด เวลารับใช้ createdAt ตอนกดบันทึก */
export const envelopes = pgTable('envelopes', {
  id: serial('id').primaryKey(),
  amount: integer('amount').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const guests = pgTable('guests', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  side: text('side').$type<Side>().notNull(),
  /** คอลัมน์ชื่อ guest_group เพราะ group เป็นคำสงวนของ SQL */
  group: text('guest_group'),
  companionsEstimated: integer('companions_estimated').notNull().default(0),
  /** null = ยังไม่ได้ถาม ต่างจาก 0 = ถามแล้ว มาคนเดียว */
  companionsConfirmed: integer('companions_confirmed'),
  rsvp: text('rsvp').$type<Rsvp>().notNull().default('pending'),
  /** แจกการ์ด/ซองเชิญให้แขกรายนี้แล้วหรือยัง — คนละเรื่องกับตาราง envelopes ที่เก็บซองเงินที่ได้รับ */
  invitationGiven: boolean('invitation_given').notNull().default(false),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Vendor = typeof vendors.$inferSelect
export type NewVendor = typeof vendors.$inferInsert
export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
export type Envelope = typeof envelopes.$inferSelect
export type NewEnvelope = typeof envelopes.$inferInsert
export type Guest = typeof guests.$inferSelect
export type NewGuest = typeof guests.$inferInsert

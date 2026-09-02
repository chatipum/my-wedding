# Wedding Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เว็บส่วนตัวของบ่าวสาว 6 หน้า (dashboard / ค่าใช้จ่าย / ซองรับ / แขก / checklist / vendor) บน Next.js + Neon แทนการใช้ Notion

**Architecture:** Next.js App Router — ทุกหน้าเป็น server component อ่านผ่าน `src/db/queries.ts` (ที่มี `await connection()` กันการ prerender ตอน build) เขียนผ่าน `'use server'` action ในโฟลเดอร์ของแต่ละโมดูลเท่านั้น ยอดรวมเงิน/แขกทั้งหมดคำนวณด้วยฟังก์ชันบริสุทธิ์ใน `src/lib/totals.ts` เพื่อให้ `bun test` ครอบตรรกะการเงินได้โดยไม่แตะ DB

**Tech Stack:** Bun · Next.js App Router · Neon Postgres · Drizzle (`drizzle-orm/neon-http`) + drizzle-kit · Tailwind v4 (`@theme` ใน CSS) · react-hook-form + valibot · Biome

**Spec:** `docs/superpowers/specs/2026-09-01-wedding-dashboard-design.md` — อ่านคู่กับ plan นี้เสมอ

## Global Constraints

- **เงินเป็น `integer` บาทเต็ม** ทุกที่ ไม่มี `numeric` / `float` / สตริงเงินในชั้น logic ตัวแปรเงินใน query / action / totals เป็น `number` เสมอ
- **`expenses.amount` เป็น `null` ได้** และห้ามแปลง `null` เป็น `0` ทุกที่ที่แสดงยอดรวมต้องมีตัวนับ "ยังไม่ระบุยอด N รายการ" กำกับ
- **format เงินตอนแสดงผลเท่านั้น** ผ่าน `<Money>` เท่านั้น — `formatBaht` ถูกเรียกได้จาก component เท่านั้น, `parseBaht` ถูกเรียกได้จาก valibot schema เท่านั้น
- **ตัวเลขบนจอต้องเป็นเลขอาราบิกเสมอ** (`numberingSystem: 'latn'`)
- **`page.tsx` / `layout.tsx` ห้าม import `@/db/mutations`** และห้ามมี `'use client'` — บังคับด้วย Biome `noRestrictedImports`
- **ทุก write อยู่ใน `actions.ts` ที่ขึ้นต้นด้วย `'use server'`** เท่านั้น ไม่มีข้อยกเว้น
- **Server action ไม่ throw** คืน `{ ok: true } | { ok: false, message, detail?, fieldErrors? }` เสมอ
- **server ต้อง `v.parse` ซ้ำเสมอ** ด้วย schema ตัวเดียวกับที่ client ใช้
- **`await connection()` อยู่ใน `src/db/queries.ts` ที่เดียว** ห้ามตั้ง `export const dynamic` เอง
- **TypeScript `strict: true`** · ไม่มี `any` ที่ไม่จำเป็น
- **`bun test` ห้ามแตะ DB** ไม่มี env สำหรับเทส
- **1 query ต่อ 1 หน้า** — `/` ใช้ `db.batch()`, `/vendors` ใช้ JOIN ครั้งเดียว ห้าม N+1
- **`'use client'` เฉพาะ leaf** ที่ต้องโต้ตอบ (ฟอร์ม / toggle / ช่อง filter)
- ทุกตารางใช้ `<table><thead><th scope="col">` + `<caption>` · วันที่ใช้ `<time dateTime>` · เงินใช้ `<data value>` · toggle ใช้ `<input type="checkbox">` จริง
- ข้อความ UI ทั้งหมดเป็นภาษาไทย · `<html lang="th">` · `robots: { index: false }`

## File Structure

```
app/layout.tsx                    nav + metadata + next/font  (server)
app/globals.css                   @theme token + @layer components ทั้งหมด
app/page.tsx                      dashboard
app/error.tsx / loading.tsx / not-found.tsx
app/<module>/page.tsx             server component: query → render
app/<module>/actions.ts           'use server': create / update / toggle / delete
app/<module>/<module>-form.tsx    'use client': react-hook-form
app/<module>/*-toggle.tsx         'use client': useOptimistic

src/db/schema.ts                  5 ตาราง
src/db/env.ts                     requireDatabaseUrl (pure, มีเทส)
src/db/index.ts                   neon client + logger
src/db/queries.ts                 อ่านอย่างเดียว + await connection()
src/db/mutations.ts               เขียนอย่างเดียว
src/db/seed-data.ts               parse/validate notion-export.json (pure, มีเทส)

src/lib/money.ts                  parseBaht / isBahtInput / formatBaht
src/lib/totals.ts                 ยอดรวมทั้งหมด (pure)
src/lib/action-result.ts          ActionResult + toActionResult
src/lib/cn.ts                     clsx wrapper
src/lib/ui.ts                     map สถานะ → class
src/lib/schemas/{expense,envelope,guest,checklist,vendor}.ts

src/components/ui/*.tsx           Card Button Field Money Badge DataTable
                                  PageHeader ConfirmButton EmptyState Spinner

data/notion-export.json           ข้อมูล seed (commit ลง repo)
scripts/seed.ts                   bun run db:seed [--dry-run] [--force]
tests/**/*.test.ts                bun test
drizzle/                          migration ที่ drizzle-kit generate ให้
```

---

### Task 1: Scaffold — Bun + Next.js + Biome + Tailwind v4

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `biome.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `src/lib/cn.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: ไม่มี (task แรก)
- Produces: path alias `@/*` → `./src/*` · script `bun run lint` / `bun test` / `bun run build` · `cn(...)` จาก `@/lib/cn`

- [ ] **Step 1: สร้าง package.json และติดตั้ง dependency**

```bash
cd /home/developer/B4S/my-wedding
cat > package.json <<'JSON'
{
  "name": "my-wedding",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "format": "biome check --write .",
    "test": "bun test",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "bun run scripts/seed.ts"
  }
}
JSON
bun add next react react-dom drizzle-orm @neondatabase/serverless server-only clsx react-hook-form valibot @hookform/resolvers
bun add -d typescript @types/react @types/react-dom @types/bun drizzle-kit @biomejs/biome tailwindcss @tailwindcss/postcss
```

- [ ] **Step 2: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "noEmit": true,
    "types": ["bun"],
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: config ของ Next / PostCSS และหน้าเปล่าให้ build ผ่าน**

`next.config.ts`:
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

`postcss.config.mjs`:
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

`app/globals.css` (token ตัวจริงมาใน Task 7):
```css
@import "tailwindcss";
```

`app/layout.tsx`:
```tsx
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
```

`app/page.tsx`:
```tsx
export default function Page() {
  return <main>wedding dashboard</main>
}
```

`src/lib/cn.ts`:
```ts
import clsx, { type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}
```

- [ ] **Step 4: biome.json พร้อมกฎ a11y และกฎห้าม page/layout import mutations**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "files": { "includes": ["**", "!node_modules/**", "!.next/**", "!drizzle/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "a11y": { "recommended": true }
    }
  },
  "overrides": [
    {
      "includes": ["app/**/page.tsx", "app/**/layout.tsx"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "level": "error",
              "options": {
                "paths": {
                  "@/db/mutations": "page.tsx / layout.tsx อ่านได้อย่างเดียว ให้ย้าย write ไป actions.ts"
                }
              }
            }
          }
        }
      }
    }
  ]
}
```

ถ้า `bun run lint` บ่นว่า schema เวอร์ชันไม่ตรง ให้รัน `bunx biome migrate --write` แล้วตรวจว่า override ยังอยู่ครบ

- [ ] **Step 5: พิสูจน์ว่ากฎ noRestrictedImports ทำงานจริง (นี่คือเทสของ task นี้)**

```bash
mkdir -p app/_probe
cat > app/_probe/page.tsx <<'TSX'
import { createExpense } from '@/db/mutations'

export default function Page() {
  return <main>{String(createExpense)}</main>
}
TSX
bun run lint
```
Expected: FAIL — Biome รายงาน `noRestrictedImports` ที่ `app/_probe/page.tsx`

- [ ] **Step 6: ลบ probe แล้วยืนยันว่า lint กับ build เขียว**

```bash
rm -rf app/_probe
bun run lint
bun run build
```
Expected: lint PASS, build สำเร็จ

- [ ] **Step 7: README บอกวิธีรันและข้อควรระวังเรื่อง region**

```markdown
# my-wedding

เว็บส่วนตัวสำหรับจัดงานแต่ง — ดู `docs/superpowers/specs/2026-09-01-wedding-dashboard-design.md`

## รัน

    bun install
    cp .env.example .env    # ใส่ DATABASE_URL ของ Neon
    bun run db:migrate
    bun run db:seed --dry-run
    bun run dev

## ข้อควรระวัง

**region ของ Neon ต้องตรงกับ region ที่ deploy** ข้าม region คือ 100–200ms ต่อ query
เทียบกับ ~10–20ms ใน region เดียวกัน และแก้ทีหลังยากที่สุด

เว็บนี้ไม่มีระบบ login โดยตั้งใจ ใครรู้ URL เห็นข้อมูลทั้งหมด
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js + bun + biome + tailwind v4"
```

---

### Task 2: `src/lib/money.ts` — parseBaht / formatBaht

**Files:**
- Create: `src/lib/money.ts`, `tests/lib/money.test.ts`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - `parseBaht(input: string): number | null` — สตริงว่าง → `null` · อินพุตไม่ถูกต้อง → `throw InvalidBahtError`
  - `isBahtInput(input: string): boolean` — ใช้ใน `v.check` ของ schema
  - `formatBaht(n: number): string`
  - `class InvalidBahtError extends Error`

- [ ] **Step 1: เขียนเทสให้ fail ก่อน**

`tests/lib/money.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { formatBaht, isBahtInput, parseBaht } from '@/lib/money'

describe('parseBaht', () => {
  it('รับตัวเลขล้วน', () => {
    expect(parseBaht('70000')).toBe(70000)
  })

  it('ตัด comma ออก', () => {
    expect(parseBaht('70,000')).toBe(70000)
  })

  it('ตัดสัญลักษณ์บาทและคำว่าบาท', () => {
    expect(parseBaht('70000฿')).toBe(70000)
    expect(parseBaht('70,000 บาท')).toBe(70000)
  })

  it('ตัดช่องว่างรวมถึง non-breaking space', () => {
    expect(parseBaht('70 000')).toBe(70000)
    expect(parseBaht('70 000')).toBe(70000)
  })

  it('แปลงเลขไทยเป็นอาราบิก', () => {
    expect(parseBaht('๗๐๐๐๐')).toBe(70000)
  })

  it('สตริงว่างคือยังไม่ระบุยอด ไม่ใช่ศูนย์', () => {
    expect(parseBaht('')).toBeNull()
    expect(parseBaht('   ')).toBeNull()
  })

  it('ศูนย์คือศูนย์จริง ไม่ใช่ null', () => {
    expect(parseBaht('0')).toBe(0)
  })

  it('ปฏิเสธข้อความที่ไม่ใช่ตัวเลข ห้ามเดาเป็น 70', () => {
    expect(() => parseBaht('abc')).toThrow()
    expect(() => parseBaht('70k')).toThrow()
    expect(() => parseBaht('ประมาณ 70000')).toThrow()
  })

  it('ปฏิเสธค่าติดลบและทศนิยม', () => {
    expect(() => parseBaht('-500')).toThrow()
    expect(() => parseBaht('70.5')).toThrow()
  })

  it('ปฏิเสธตัวเลขที่ใหญ่เกินช่วงจำนวนเต็มที่ปลอดภัย', () => {
    expect(() => parseBaht('9'.repeat(20))).toThrow()
  })
})

describe('isBahtInput', () => {
  it('ตรงกับสิ่งที่ parseBaht ยอมรับ', () => {
    expect(isBahtInput('70,000')).toBe(true)
    expect(isBahtInput('')).toBe(true)
    expect(isBahtInput('abc')).toBe(false)
  })
})

describe('formatBaht', () => {
  it('ใส่ comma คั่นหลัก', () => {
    expect(formatBaht(70000)).toBe('70,000')
    expect(formatBaht(0)).toBe('0')
  })

  it('ไม่มีเลขไทยหลุดออกมา', () => {
    expect(formatBaht(70000)).not.toMatch(/[๐-๙]/)
  })

  it('ไม่มีทศนิยม', () => {
    expect(formatBaht(1234567)).toBe('1,234,567')
  })
})
```

- [ ] **Step 2: รันเทสให้เห็นว่า fail**

Run: `bun test tests/lib/money.test.ts`
Expected: FAIL — `Cannot find module '@/lib/money'`

- [ ] **Step 3: เขียน implementation**

`src/lib/money.ts`:
```ts
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
    .replace(/[,\s ]/g, '')
}

/** เรียกได้จาก valibot schema เท่านั้น — สตริงว่าง = ยังไม่ระบุยอด (null) */
export function parseBaht(input: string): number | null {
  // เช็คว่าง "จากอินพุตดิบ" ไม่ใช่หลัง normalize — ไม่งั้น '฿' หรือ ',' เดี่ยวๆ จะกลายเป็น null
  // ทั้งที่มันคืออินพุตผิดรูป ต้อง throw
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
```

- [ ] **Step 4: รันเทสให้ผ่าน**

Run: `bun test tests/lib/money.test.ts`
Expected: PASS ทุกเคส

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts tests/lib/money.test.ts
git commit -m "feat: add parseBaht/formatBaht with tests"
```

---

### Task 3: Schema · Drizzle client · migration แรก

**Files:**
- Create: `src/db/schema.ts`, `src/db/env.ts`, `src/db/index.ts`, `drizzle.config.ts`, `tests/db/env.test.ts`
- Generate: `drizzle/0000_*.sql`

**Interfaces:**
- Consumes: ไม่มี
- Produces:
  - ตาราง `vendors` `expenses` `envelopes` `guests` `checklistItems` จาก `@/db/schema`
  - type `Expense` `NewExpense` `Envelope` `NewEnvelope` `Guest` `NewGuest` `ChecklistItem` `NewChecklistItem` `Vendor` `NewVendor`
  - `requireDatabaseUrl(raw: string | undefined): string` จาก `@/db/env`
  - `db` จาก `@/db` (drizzle neon-http instance)

- [ ] **Step 1: เขียนเทสของตัวตรวจ env ให้ fail ก่อน**

`tests/db/env.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { requireDatabaseUrl } from '@/db/env'

describe('requireDatabaseUrl', () => {
  it('คืนค่าเดิมเมื่อรูปแบบถูกต้อง', () => {
    const url = 'postgresql://user:pw@ep-x.ap-southeast-1.aws.neon.tech/wedding?sslmode=require'
    expect(requireDatabaseUrl(url)).toBe(url)
  })

  it('รับ postgres:// ด้วย', () => {
    expect(requireDatabaseUrl('postgres://u:p@h/db')).toBe('postgres://u:p@h/db')
  })

  it('ไม่มีค่า → error ที่บอกชื่อตัวแปร', () => {
    expect(() => requireDatabaseUrl(undefined)).toThrow(/DATABASE_URL/)
    expect(() => requireDatabaseUrl('')).toThrow(/DATABASE_URL/)
    expect(() => requireDatabaseUrl('   ')).toThrow(/DATABASE_URL/)
  })

  it('รูปแบบผิด → error ที่บอกว่าต้องขึ้นต้นด้วยอะไร', () => {
    expect(() => requireDatabaseUrl('mysql://u:p@h/db')).toThrow(/postgres/)
  })
})
```

- [ ] **Step 2: รันเทสให้เห็นว่า fail**

Run: `bun test tests/db/env.test.ts`
Expected: FAIL — `Cannot find module '@/db/env'`

- [ ] **Step 3: เขียน `src/db/env.ts`**

```ts
export function requireDatabaseUrl(raw: string | undefined): string {
  if (!raw || raw.trim() === '') {
    throw new Error('DATABASE_URL ยังไม่ได้ตั้งค่า — คัดลอก .env.example เป็น .env แล้วใส่ connection string ของ Neon')
  }
  if (!/^postgres(ql)?:\/\//.test(raw)) {
    throw new Error('DATABASE_URL รูปแบบผิด — ต้องขึ้นต้นด้วย postgres:// หรือ postgresql://')
  }
  return raw
}
```

- [ ] **Step 4: รันเทสให้ผ่าน**

Run: `bun test tests/db/env.test.ts`
Expected: PASS

- [ ] **Step 5: เขียน `src/db/schema.ts`**

```ts
import { boolean, date, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export type Side = 'groom' | 'bride'
export type Rsvp = 'pending' | 'yes' | 'no'
export type ChecklistStatus = 'not_started' | 'in_progress' | 'done'

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

export const envelopes = pgTable('envelopes', {
  id: serial('id').primaryKey(),
  /** null ได้ — วันงานต้องกรอกเร็ว บางซองไม่รู้ชื่อ */
  giverName: text('giver_name'),
  amount: integer('amount').notNull(),
  receivedAt: date('received_at').notNull(),
  note: text('note'),
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
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const checklistItems = pgTable('checklist_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  status: text('status').$type<ChecklistStatus>().notNull().default('not_started'),
  /** "เงินที่ตั้งไว้" — ไม่ถูกนำไปบวกที่ใดทั้งสิ้น ยอดรวมนับจาก expenses เท่านั้น */
  budget: integer('budget'),
  deadline: date('deadline'),
  depositPaid: boolean('deposit_paid').notNull().default(false),
  vendorId: integer('vendor_id').references(() => vendors.id),
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
export type ChecklistItem = typeof checklistItems.$inferSelect
export type NewChecklistItem = typeof checklistItems.$inferInsert
```

- [ ] **Step 6: เขียน `src/db/index.ts` และ `drizzle.config.ts`**

`src/db/index.ts`:
```ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { requireDatabaseUrl } from './env'
import * as schema from './schema'

const client = neon(requireDatabaseUrl(process.env.DATABASE_URL))

export const db = drizzle({
  client,
  schema,
  logger: process.env.APP_ENV === 'development',
})

export { schema }
```

`drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit'
import { requireDatabaseUrl } from './src/db/env'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: requireDatabaseUrl(process.env.DATABASE_URL) },
})
```

- [ ] **Step 7: generate migration แล้วอ่าน SQL ที่ได้ด้วยตา**

```bash
bun run db:generate
cat drizzle/0000_*.sql
```
Expected: `CREATE TABLE` 5 ตาราง · `expenses.amount` ไม่มี `NOT NULL` · `guests.companions_confirmed` ไม่มี `NOT NULL` · มี FK จาก `expenses.vendor_id` และ `checklist_items.vendor_id` ไป `vendors.id`

- [ ] **Step 8: รัน migration จริงกับ Neon**

```bash
bun run db:migrate
```
Expected: สำเร็จ ไม่มี error

- [ ] **Step 9: lint + test ทั้งหมด แล้ว commit**

```bash
bun run lint && bun test
git add -A
git commit -m "feat: add drizzle schema, neon client and first migration"
```

---

### Task 4: Seed จาก `data/notion-export.json`

**Files:**
- Create: `data/notion-export.json`, `src/db/seed-data.ts`, `scripts/seed.ts`, `tests/db/seed-data.test.ts`

**Interfaces:**
- Consumes: `@/db/schema` (ตาราง + type), `@/db` (`db`)
- Produces:
  - `type SeedFile = { vendors: SeedVendor[]; expenses: SeedExpense[] }`
  - `parseSeedFile(raw: unknown): SeedFile` — โยน error ที่อ่านรู้เรื่องถ้าไฟล์ผิดรูป
  - `seedStats(file: SeedFile): { vendorCount: number; expenseCount: number; unknownAmountCount: number; filledCategoryCount: number }`

> **ต้องมีก่อนเริ่ม task นี้:** ข้อมูล 35 แถวจาก data source `ค่าใช้จ่ายงานแต่ง (อัตโนมัติ)` ใน Notion — คนสั่งงานต้องส่งลิงก์ data source มาให้ หรือส่งไฟล์ที่ export แล้วมาให้ ห้ามไปค้นหาเองใน workspace

- [ ] **Step 1: เขียนเทสของตัว parse ให้ fail ก่อน**

`tests/db/seed-data.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { parseSeedFile, seedStats } from '@/db/seed-data'

const valid = {
  vendors: [{ id: 1, name: 'APN Organize (คุณปอนด์)', role: 'ออร์แกไนเซอร์', phone: null, line: null, totalPrice: 79000, note: null }],
  expenses: [
    { name: 'มัดจำ APN', category: 'ออร์แกไนเซอร์', categorySource: 'notion', amount: 20000, isPaid: true, vendorId: 1, dueDate: null, note: null },
    { name: 'เครื่องดื่ม', category: 'เครื่องดื่ม', categorySource: 'filled-in', amount: null, isPaid: false, vendorId: null, dueDate: null, note: null },
  ],
}

describe('parseSeedFile', () => {
  it('รับไฟล์ที่ถูกต้อง', () => {
    const file = parseSeedFile(valid)
    expect(file.expenses).toHaveLength(2)
  })

  it('เก็บ amount null ไว้เป็น null ไม่แปลงเป็น 0', () => {
    const file = parseSeedFile(valid)
    expect(file.expenses[1]?.amount).toBeNull()
  })

  it('ปฏิเสธ amount ที่เป็นสตริง', () => {
    expect(() => parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], amount: '20,000' }] })).toThrow()
  })

  it('ปฏิเสธ amount ที่มีทศนิยมหรือติดลบ', () => {
    expect(() => parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], amount: 20000.5 }] })).toThrow()
    expect(() => parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], amount: -1 }] })).toThrow()
  })

  it('ปฏิเสธ vendorId ที่ไม่มีใน vendors', () => {
    expect(() => parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], vendorId: 99 }] })).toThrow(/vendorId/)
  })

  it('ปฏิเสธ categorySource ที่ไม่ใช่ notion หรือ filled-in', () => {
    expect(() => parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], categorySource: 'guess' }] })).toThrow()
  })

  it('ปฏิเสธ vendor id ซ้ำ', () => {
    expect(() => parseSeedFile({ ...valid, vendors: [valid.vendors[0], valid.vendors[0]] })).toThrow(/ซ้ำ/)
  })
})

describe('seedStats', () => {
  it('นับรายการที่ยังไม่ระบุยอดและหมวดที่เติมเอง', () => {
    const stats = seedStats(parseSeedFile(valid))
    expect(stats).toEqual({ vendorCount: 1, expenseCount: 2, unknownAmountCount: 1, filledCategoryCount: 1 })
  })
})
```

- [ ] **Step 2: รันเทสให้เห็นว่า fail**

Run: `bun test tests/db/seed-data.test.ts`
Expected: FAIL — `Cannot find module '@/db/seed-data'`

- [ ] **Step 3: เขียน `src/db/seed-data.ts`**

```ts
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

  const ids = new Set<number>()
  for (const vendor of file.vendors) {
    if (ids.has(vendor.id)) throw new Error(`vendor id ซ้ำ: ${vendor.id}`)
    ids.add(vendor.id)
  }

  for (const expense of file.expenses) {
    if (expense.vendorId !== null && !ids.has(expense.vendorId)) {
      throw new Error(`vendorId ${expense.vendorId} ของรายการ "${expense.name}" ไม่มีอยู่ในรายชื่อ vendor`)
    }
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
```

- [ ] **Step 4: รันเทสให้ผ่าน**

Run: `bun test tests/db/seed-data.test.ts`
Expected: PASS

- [ ] **Step 5: สร้าง `data/notion-export.json` จากข้อมูล 35 แถว**

กติกาการกรอก (ตามสเปคข้อ 7):
- vendor id **1–8** ตามตารางในสเปค — 1 APN Organize (คุณปอนด์) · 2 สโมสรร่วมเริงไชย · 3 ช่างภาพวันงาน · 4 ช่างแต่งหน้าวันงาน · 5 โต๊ะจีน · 6 ร้านของชำร่วย · 7 วงดนตรี · 8 ร้านชุด (แถวเปล่า ไม่ผูก expense ให้)
- ชื่อ/เบอร์/LINE ของ vendor 3–8 ใส่ `null` ไว้ให้เจ้าของงานเติมเองในเว็บ
- **8 แถวที่ไม่มียอด ใส่ `"amount": null`** (จ่ายของรับไหว้, จ่ายเครื่องดื่มวันงาน, จ่ายอาหารเช้าแขก, มัดจำวงดันตรีวันงาน, จ่ายวงดันตรีวันงาน, จ่ายของชำร่วย, จ่ายสังฆทาน 9 ชุด, จ่ายเซ็ตอาหารพระ 9 เซ็ต) ห้ามใส่ 0
  > สเปคเขียนว่า 6 เพราะนับแบบรวม "มัดจำ+จ่าย" ของวงดนตรีเป็นรายการเดียวและตกแถว "จ่ายของรับไหว้" ไป — ข้อมูลจริงคือ 8 แถว
- **25 แถวที่ Notion เว้น `หมวด` ว่าง ต้องเติม category เองและใส่ `"categorySource": "filled-in"`** แถวที่ Notion มีหมวดอยู่แล้ว (10 แถว: อาหาร 1 · สถานที่ 2 · ตกแต่ง 4 · ความสวยงาม 3) ใส่ `"notion"` และห้ามแก้ค่าหมวดเดิม
  > สเปคเขียนว่า 11 เพราะนับแบบรวม "มัดจำ+จ่าย" เป็นรายการเดียวและไม่ได้ไล่ครบทุกแถว — ข้อมูลจริงมี 25 แถวที่หมวดว่าง เติมให้ครบทุกแถว อย่าปล่อย null
- **"มัดจำ X" กับ "จ่าย X" เก็บเป็น 2 แถว** ไม่ยุบรวม
- 9 แถวเรื่องชุด และ 3 แถวงานพรีเวดดิ้ง ใส่ `"vendorId": null` ไว้ก่อน (เดาไม่ได้ว่าเจ้าเดียวกันหรือไม่) ให้เจ้าของงานผูกเองในเว็บ

โครงไฟล์:
```json
{
  "vendors": [
    { "id": 1, "name": "APN Organize (คุณปอนด์)", "role": "ออร์แกไนเซอร์", "phone": null, "line": null, "totalPrice": 79000, "note": null },
    { "id": 8, "name": "ร้านชุด", "role": "ชุดบ่าวสาว", "phone": null, "line": null, "totalPrice": null, "note": "ยังไม่รู้ว่าชุดทั้งหมดมาจากร้านเดียวหรือหลายร้าน ถ้าหลายร้านให้เพิ่ม vendor ใหม่ในเว็บ" }
  ],
  "expenses": [
    { "name": "มัดจำ APN", "category": "ออร์แกไนเซอร์", "categorySource": "notion", "amount": 20000, "isPaid": true, "vendorId": 1, "dueDate": null, "note": null },
    { "name": "เครื่องดื่ม", "category": "เครื่องดื่ม", "categorySource": "filled-in", "amount": null, "isPaid": false, "vendorId": null, "dueDate": null, "note": "ยังไม่รู้ยอด" }
  ]
}
```

- [ ] **Step 6: เขียน `scripts/seed.ts`**

```ts
import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { parseSeedFile, seedStats } from '@/db/seed-data'
import { expenses, vendors } from '@/db/schema'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const force = args.has('--force')

const raw = await Bun.file('data/notion-export.json').json()
const file = parseSeedFile(raw)
const stats = seedStats(file)

console.log(`vendors: ${stats.vendorCount} · expenses: ${stats.expenseCount}`)
console.log(`ยังไม่ระบุยอด: ${stats.unknownAmountCount} รายการ · หมวดที่เติมเอง: ${stats.filledCategoryCount} รายการ`)

if (dryRun) {
  for (const vendor of file.vendors) {
    console.log(`[vendor ${vendor.id}] ${vendor.name}`)
  }
  for (const expense of file.expenses) {
    const amount = expense.amount === null ? 'ยังไม่ระบุ' : expense.amount.toLocaleString('en-US')
    const paid = expense.isPaid ? 'จ่ายแล้ว' : 'ค้างจ่าย'
    console.log(`[expense] ${expense.name} · ${expense.category ?? 'ไม่ระบุหมวด'} · ${amount} · ${paid} · vendor ${expense.vendorId ?? '-'}`)
  }
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
```

- [ ] **Step 7: dry-run แล้วตรวจข้อมูลด้วยตา**

```bash
bun run db:seed --dry-run
```
Expected: พิมพ์ 8 vendor + 35 expense · บรรทัดสรุปบอก "ยังไม่ระบุยอด: 8 รายการ · หมวดที่เติมเอง: 25 รายการ" ถ้าตัวเลขไม่ตรง ให้กลับไปแก้ JSON ก่อน

- [ ] **Step 8: seed จริงแล้วนับแถว**

```bash
bun run db:seed
bun run db:seed --dry-run   # ต้องยังทำงานได้ ไม่ยุ่งกับ DB
```
Expected: บรรทัด "seed สำเร็จ: vendor 8 แถว · expense 35 แถว"

- [ ] **Step 9: ยืนยันว่า seed ซ้ำถูกปฏิเสธ**

```bash
bun run db:seed
```
Expected: exit code 1 พร้อมข้อความ "ตารางมีข้อมูลอยู่แล้ว — ถ้าตั้งใจจะ seed ทับให้ใส่ --force"

- [ ] **Step 10: Commit**

```bash
bun run lint && bun test
git add data/notion-export.json src/db/seed-data.ts scripts/seed.ts tests/db/seed-data.test.ts
git commit -m "feat: import 35 expense rows and 8 vendors from notion export"
```

---

### Task 5: `src/lib/totals.ts` — ยอดรวมทุกตัวในระบบ

**Files:**
- Create: `src/lib/totals.ts`, `tests/lib/totals.test.ts`

**Interfaces:**
- Consumes: type `Rsvp` `ChecklistStatus` จาก `@/db/schema`
- Produces:
  - `summarizeExpenses(rows: AmountRow[]): MoneySummary` — `{ paid, unpaid, unknownCount }`
  - `summarizeByCategory(rows: CategoryRow[]): CategorySummary[]` — เรียงยอดรวมมาก→น้อย
  - `sumEnvelopes(rows: { amount: number }[]): number`
  - `summarizeNet(expenseRows, envelopeRows): NetSummary` — `{ received, paid, unpaid, net, unknownCount }`
  - `countGuests(rows: GuestRow[]): GuestCounts` — `{ estimated, confirmed, declined, pending }`
  - `summarizeByVendor(rows: VendorExpenseRow[]): Map<number, VendorSummary>`
  - `upcomingDeadlines(rows: DeadlineRow[], limit?: number): DeadlineRow[]`
  - `NO_CATEGORY = 'ไม่ระบุหมวด'`

- [ ] **Step 1: เขียนเทสให้ fail ก่อน**

`tests/lib/totals.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import {
  NO_CATEGORY,
  countGuests,
  summarizeByCategory,
  summarizeByVendor,
  summarizeExpenses,
  summarizeNet,
  sumEnvelopes,
  upcomingDeadlines,
} from '@/lib/totals'

describe('summarizeExpenses', () => {
  it('แยกจ่ายแล้วกับค้างจ่าย', () => {
    expect(
      summarizeExpenses([
        { amount: 20000, isPaid: true },
        { amount: 50000, isPaid: false },
      ]),
    ).toEqual({ paid: 20000, unpaid: 50000, unknownCount: 0 })
  })

  it('แถวที่ amount เป็น null ไม่ถูกนับเป็น 0 แต่ไปโผล่ที่ unknownCount', () => {
    const summary = summarizeExpenses([
      { amount: 1000, isPaid: true },
      { amount: null, isPaid: false },
      { amount: null, isPaid: true },
    ])
    expect(summary).toEqual({ paid: 1000, unpaid: 0, unknownCount: 2 })
  })

  it('ไม่มีแถวเลยก็ไม่พัง', () => {
    expect(summarizeExpenses([])).toEqual({ paid: 0, unpaid: 0, unknownCount: 0 })
  })
})

describe('summarizeByCategory', () => {
  it('รวมตามหมวดและเรียงยอดมากไปน้อย', () => {
    const result = summarizeByCategory([
      { category: 'สถานที่', amount: 20800, isPaid: true },
      { category: 'อาหาร', amount: 70000, isPaid: false },
      { category: 'สถานที่', amount: 5000, isPaid: false },
    ])
    expect(result.map((r) => r.category)).toEqual(['อาหาร', 'สถานที่'])
    expect(result[0]).toEqual({ category: 'อาหาร', paid: 0, unpaid: 70000, total: 70000, unknownCount: 0, count: 1 })
    expect(result[1]).toEqual({ category: 'สถานที่', paid: 20800, unpaid: 5000, total: 25800, unknownCount: 0, count: 2 })
  })

  it('หมวดว่างถูกจัดเข้า NO_CATEGORY และยังนับ unknownCount ของตัวเอง', () => {
    const result = summarizeByCategory([{ category: null, amount: null, isPaid: false }])
    expect(result[0]).toEqual({ category: NO_CATEGORY, paid: 0, unpaid: 0, total: 0, unknownCount: 1, count: 1 })
  })
})

describe('sumEnvelopes', () => {
  it('บวกยอดซองทั้งหมด', () => {
    expect(sumEnvelopes([{ amount: 1000 }, { amount: 2000 }])).toBe(3000)
    expect(sumEnvelopes([])).toBe(0)
  })
})

describe('summarizeNet', () => {
  it('สุทธิ = ซองรับ − จ่ายแล้ว − ค้างจ่าย', () => {
    const net = summarizeNet(
      [
        { amount: 20000, isPaid: true },
        { amount: 50000, isPaid: false },
        { amount: null, isPaid: false },
      ],
      [{ amount: 100000 }],
    )
    expect(net).toEqual({ received: 100000, paid: 20000, unpaid: 50000, net: 30000, unknownCount: 1 })
  })

  it('ติดลบได้ ไม่ปัดขึ้นเป็นศูนย์', () => {
    expect(summarizeNet([{ amount: 500, isPaid: true }], []).net).toBe(-500)
  })
})

describe('countGuests', () => {
  it('ประมาณการนับทุกแถวที่ยังไม่ปฏิเสธ บวกผู้ติดตามที่คาดไว้', () => {
    const counts = countGuests([
      { rsvp: 'pending', companionsEstimated: 2, companionsConfirmed: null },
      { rsvp: 'yes', companionsEstimated: 1, companionsConfirmed: null },
      { rsvp: 'no', companionsEstimated: 3, companionsConfirmed: null },
    ])
    expect(counts.estimated).toBe(5)
  })

  it('ยืนยันแล้วนับเฉพาะ rsvp=yes และใช้ confirmed ถ้ามี', () => {
    const counts = countGuests([
      { rsvp: 'yes', companionsEstimated: 2, companionsConfirmed: 0 },
      { rsvp: 'yes', companionsEstimated: 1, companionsConfirmed: 3 },
      { rsvp: 'pending', companionsEstimated: 5, companionsConfirmed: null },
    ])
    expect(counts.confirmed).toBe(5)
  })

  it('companionsConfirmed เป็น null (ยังไม่ได้ถาม) ตกกลับไปใช้ค่าที่คาดไว้', () => {
    expect(countGuests([{ rsvp: 'yes', companionsEstimated: 2, companionsConfirmed: null }]).confirmed).toBe(3)
  })

  it('confirmed = 0 ต่างจาก null — ถามแล้วมาคนเดียว', () => {
    expect(countGuests([{ rsvp: 'yes', companionsEstimated: 2, companionsConfirmed: 0 }]).confirmed).toBe(1)
  })

  it('นับจำนวนคนที่ปฏิเสธและที่ยังไม่ตอบ', () => {
    const counts = countGuests([
      { rsvp: 'no', companionsEstimated: 0, companionsConfirmed: null },
      { rsvp: 'pending', companionsEstimated: 0, companionsConfirmed: null },
      { rsvp: 'pending', companionsEstimated: 0, companionsConfirmed: null },
    ])
    expect(counts.declined).toBe(1)
    expect(counts.pending).toBe(2)
  })
})

describe('summarizeByVendor', () => {
  it('รวมยอดต่อ vendor และข้ามแถวที่ไม่ได้ผูก vendor', () => {
    const map = summarizeByVendor([
      { vendorId: 1, amount: 20000, isPaid: true },
      { vendorId: 1, amount: 59000, isPaid: false },
      { vendorId: 2, amount: null, isPaid: false },
      { vendorId: null, amount: 9999, isPaid: false },
    ])
    expect(map.get(1)).toEqual({ paid: 20000, unpaid: 59000, total: 79000, unknownCount: 0, count: 2 })
    expect(map.get(2)).toEqual({ paid: 0, unpaid: 0, total: 0, unknownCount: 1, count: 1 })
    expect(map.has(0)).toBe(false)
    expect(map.size).toBe(2)
  })
})

describe('upcomingDeadlines', () => {
  it('เอาเฉพาะงานที่ยังไม่เสร็จและมี deadline เรียงจากใกล้ที่สุด', () => {
    const rows = upcomingDeadlines([
      { id: 1, name: 'จองช่างภาพ', status: 'done', deadline: '2026-09-10' },
      { id: 2, name: 'ส่งการ์ด', status: 'in_progress', deadline: '2026-10-01' },
      { id: 3, name: 'ลองชุด', status: 'not_started', deadline: '2026-09-20' },
      { id: 4, name: 'ของชำร่วย', status: 'not_started', deadline: null },
    ])
    expect(rows.map((r) => r.id)).toEqual([3, 2])
  })

  it('จำกัดจำนวนตาม limit', () => {
    const rows = upcomingDeadlines(
      [
        { id: 1, name: 'a', status: 'not_started', deadline: '2026-09-01' },
        { id: 2, name: 'b', status: 'not_started', deadline: '2026-09-02' },
      ],
      1,
    )
    expect(rows.map((r) => r.id)).toEqual([1])
  })
})
```

- [ ] **Step 2: รันเทสให้เห็นว่า fail**

Run: `bun test tests/lib/totals.test.ts`
Expected: FAIL — `Cannot find module '@/lib/totals'`

- [ ] **Step 3: เขียน `src/lib/totals.ts`**

```ts
import type { ChecklistStatus, Rsvp } from '@/db/schema'

export const NO_CATEGORY = 'ไม่ระบุหมวด'

export type AmountRow = { amount: number | null; isPaid: boolean }
export type MoneySummary = { paid: number; unpaid: number; unknownCount: number }

export function summarizeExpenses(rows: AmountRow[]): MoneySummary {
  let paid = 0
  let unpaid = 0
  let unknownCount = 0

  for (const row of rows) {
    // null = ยังไม่รู้ยอด ห้ามนับเป็น 0 เพราะทำให้ตัวเลขค้างจ่ายต่ำกว่าความจริงเงียบๆ
    if (row.amount === null) unknownCount += 1
    else if (row.isPaid) paid += row.amount
    else unpaid += row.amount
  }

  return { paid, unpaid, unknownCount }
}

export type CategoryRow = AmountRow & { category: string | null }
export type CategorySummary = MoneySummary & { category: string; total: number; count: number }

export function summarizeByCategory(rows: CategoryRow[]): CategorySummary[] {
  const buckets = new Map<string, CategoryRow[]>()

  for (const row of rows) {
    const key = row.category?.trim() || NO_CATEGORY
    const bucket = buckets.get(key)
    if (bucket) bucket.push(row)
    else buckets.set(key, [row])
  }

  return [...buckets.entries()]
    .map(([category, bucketRows]) => {
      const summary = summarizeExpenses(bucketRows)
      return { category, ...summary, total: summary.paid + summary.unpaid, count: bucketRows.length }
    })
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'th'))
}

export function sumEnvelopes(rows: { amount: number }[]): number {
  return rows.reduce((total, row) => total + row.amount, 0)
}

export type NetSummary = MoneySummary & { received: number; net: number }

export function summarizeNet(expenseRows: AmountRow[], envelopeRows: { amount: number }[]): NetSummary {
  const expenses = summarizeExpenses(expenseRows)
  const received = sumEnvelopes(envelopeRows)
  return { ...expenses, received, net: received - expenses.paid - expenses.unpaid }
}

export type GuestRow = { rsvp: Rsvp; companionsEstimated: number; companionsConfirmed: number | null }
export type GuestCounts = { estimated: number; confirmed: number; declined: number; pending: number }

export function countGuests(rows: GuestRow[]): GuestCounts {
  let estimated = 0
  let confirmed = 0
  let declined = 0
  let pending = 0

  for (const row of rows) {
    if (row.rsvp === 'no') {
      declined += 1
      continue
    }
    if (row.rsvp === 'pending') pending += 1
    estimated += 1 + row.companionsEstimated
    if (row.rsvp === 'yes') {
      // null = ยังไม่ได้ถามผู้ติดตาม จึงยังต้องใช้ตัวเลขที่คาดไว้
      confirmed += 1 + (row.companionsConfirmed ?? row.companionsEstimated)
    }
  }

  return { estimated, confirmed, declined, pending }
}

export type VendorExpenseRow = AmountRow & { vendorId: number | null }
export type VendorSummary = MoneySummary & { total: number; count: number }

export function summarizeByVendor(rows: VendorExpenseRow[]): Map<number, VendorSummary> {
  const buckets = new Map<number, VendorExpenseRow[]>()

  for (const row of rows) {
    if (row.vendorId === null) continue
    const bucket = buckets.get(row.vendorId)
    if (bucket) bucket.push(row)
    else buckets.set(row.vendorId, [row])
  }

  const result = new Map<number, VendorSummary>()
  for (const [vendorId, bucketRows] of buckets) {
    const summary = summarizeExpenses(bucketRows)
    result.set(vendorId, { ...summary, total: summary.paid + summary.unpaid, count: bucketRows.length })
  }
  return result
}

export type DeadlineRow = { id: number; name: string; status: ChecklistStatus; deadline: string | null }

export function upcomingDeadlines(rows: DeadlineRow[], limit = 5): DeadlineRow[] {
  return rows
    .filter((row): row is DeadlineRow & { deadline: string } => row.status !== 'done' && row.deadline !== null)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, limit)
}
```

- [ ] **Step 4: รันเทสให้ผ่าน**

Run: `bun test tests/lib/totals.test.ts`
Expected: PASS ทุกเคส

- [ ] **Step 5: Commit**

```bash
git add src/lib/totals.ts tests/lib/totals.test.ts
git commit -m "feat: add pure total functions for money, guests and vendors"
```

---

### Task 6: valibot schema ทั้ง 5 โมดูล + `ActionResult`

**Files:**
- Create: `src/lib/action-result.ts`, `src/lib/schemas/shared.ts`, `src/lib/schemas/expense.ts`, `src/lib/schemas/envelope.ts`, `src/lib/schemas/guest.ts`, `src/lib/schemas/checklist.ts`, `src/lib/schemas/vendor.ts`, `tests/lib/schemas.test.ts`, `tests/lib/action-result.test.ts`

**Interfaces:**
- Consumes: `isBahtInput` `parseBaht` จาก `@/lib/money`
- Produces:
  - `type ActionResult = { ok: true } | { ok: false; message: string; detail?: string; fieldErrors?: Record<string, string> }`
  - `toActionResult(error: unknown): ActionResult`
  - `expenseInputSchema` / `expenseUpdateSchema` / `togglePaidSchema` + type `ExpenseInput` (ฝั่งฟอร์ม) `ExpenseValues` (ฝั่ง DB)
  - `envelopeInputSchema` + `EnvelopeInput` `EnvelopeValues`
  - `guestInputSchema` / `guestUpdateSchema` / `rsvpSchema` + `GuestInput` `GuestValues`
  - `checklistInputSchema` / `checklistUpdateSchema` / `checklistStatusSchema` + `ChecklistInput` `ChecklistValues`
  - `vendorInputSchema` / `vendorUpdateSchema` + `VendorInput` `VendorValues`
  - `idSchema` (`v.object({ id })`) ใช้กับ action ลบ

- [ ] **Step 1: เขียนเทสให้ fail ก่อน**

`tests/lib/schemas.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import * as v from 'valibot'
import { checklistInputSchema } from '@/lib/schemas/checklist'
import { envelopeInputSchema } from '@/lib/schemas/envelope'
import { expenseInputSchema } from '@/lib/schemas/expense'
import { guestInputSchema } from '@/lib/schemas/guest'
import { vendorInputSchema } from '@/lib/schemas/vendor'

const expenseForm = {
  name: 'จ่ายโต๊ะจีน',
  category: 'อาหาร',
  amount: '70,000',
  isPaid: false,
  vendorId: '5',
  dueDate: '',
  note: '',
}

describe('expenseInputSchema', () => {
  it('แปลงสตริงเงินเป็นจำนวนเต็มบาท', () => {
    expect(v.parse(expenseInputSchema, expenseForm).amount).toBe(70000)
  })

  it('ช่องเงินว่าง = ยังไม่ระบุยอด (null) ไม่ใช่ 0', () => {
    expect(v.parse(expenseInputSchema, { ...expenseForm, amount: '' }).amount).toBeNull()
  })

  it('ช่องข้อความว่างกลายเป็น null และตัดช่องว่างหัวท้าย', () => {
    const parsed = v.parse(expenseInputSchema, { ...expenseForm, category: '  ', note: '  ok  ' })
    expect(parsed.category).toBeNull()
    expect(parsed.note).toBe('ok')
  })

  it('vendorId ว่างเป็น null มีค่าเป็นตัวเลข', () => {
    expect(v.parse(expenseInputSchema, { ...expenseForm, vendorId: '' }).vendorId).toBeNull()
    expect(v.parse(expenseInputSchema, expenseForm).vendorId).toBe(5)
  })

  it('ปฏิเสธชื่อว่าง', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, name: '   ' })).toThrow()
  })

  it('ปฏิเสธยอดเงินที่พิมพ์มั่ว', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, amount: 'ประมาณ 70000' })).toThrow()
  })

  it('ปฏิเสธวันที่รูปแบบผิด', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, dueDate: '28/11/2569' })).toThrow()
  })
})

describe('envelopeInputSchema', () => {
  const form = { giverName: '', amount: '1,000', receivedAt: '2026-11-28', note: '' }

  it('ชื่อผู้ให้ว่างได้ เพราะวันงานต้องกรอกเร็ว', () => {
    expect(v.parse(envelopeInputSchema, form).giverName).toBeNull()
  })

  it('ยอดซองต้องมีเสมอ', () => {
    expect(() => v.parse(envelopeInputSchema, { ...form, amount: '' })).toThrow()
  })

  it('ยอดซองเป็น 0 ได้', () => {
    expect(v.parse(envelopeInputSchema, { ...form, amount: '0' }).amount).toBe(0)
  })
})

describe('guestInputSchema', () => {
  const form = {
    name: 'พี่เอ',
    side: 'groom',
    group: 'ที่ทำงาน',
    companionsEstimated: '2',
    companionsConfirmed: '',
    rsvp: 'pending',
    note: '',
  }

  it('ผู้ติดตามที่ยืนยันแล้ว: ว่าง = ยังไม่ได้ถาม (null)', () => {
    expect(v.parse(guestInputSchema, form).companionsConfirmed).toBeNull()
  })

  it('ผู้ติดตามที่ยืนยันแล้วเป็น 0 ได้ และไม่กลายเป็น null', () => {
    expect(v.parse(guestInputSchema, { ...form, companionsConfirmed: '0' }).companionsConfirmed).toBe(0)
  })

  it('ผู้ติดตามที่คาดไว้ว่างเปล่ากลายเป็น 0', () => {
    expect(v.parse(guestInputSchema, { ...form, companionsEstimated: '' }).companionsEstimated).toBe(0)
  })

  it('ปฏิเสธจำนวนผู้ติดตามที่ติดลบหรือไม่ใช่ตัวเลข', () => {
    expect(() => v.parse(guestInputSchema, { ...form, companionsEstimated: '-1' })).toThrow()
    expect(() => v.parse(guestInputSchema, { ...form, companionsConfirmed: 'สอง' })).toThrow()
  })

  it('ปฏิเสธ side และ rsvp นอกรายการ', () => {
    expect(() => v.parse(guestInputSchema, { ...form, side: 'other' })).toThrow()
    expect(() => v.parse(guestInputSchema, { ...form, rsvp: 'maybe' })).toThrow()
  })
})

describe('checklistInputSchema', () => {
  const form = {
    name: 'จองช่างภาพ',
    category: 'ภาพถ่าย',
    status: 'not_started',
    budget: '',
    deadline: '',
    depositPaid: false,
    vendorId: '',
    note: '',
  }

  it('งบที่ยังไม่ตั้งเป็น null', () => {
    expect(v.parse(checklistInputSchema, form).budget).toBeNull()
  })

  it('ปฏิเสธสถานะนอกรายการ', () => {
    expect(() => v.parse(checklistInputSchema, { ...form, status: 'ทำอยู่' })).toThrow()
  })
})

describe('vendorInputSchema', () => {
  it('เว้นเบอร์และ LINE ว่างได้ ให้เจ้าของงานเติมทีหลัง', () => {
    const parsed = v.parse(vendorInputSchema, {
      name: 'ช่างภาพวันงาน',
      role: '',
      phone: '',
      line: '',
      totalPrice: '',
      note: '',
    })
    expect(parsed).toEqual({ name: 'ช่างภาพวันงาน', role: null, phone: null, line: null, totalPrice: null, note: null })
  })
})
```

`tests/lib/action-result.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import * as v from 'valibot'
import { toActionResult } from '@/lib/action-result'
import { expenseInputSchema } from '@/lib/schemas/expense'

describe('toActionResult', () => {
  it('แปลง validation error เป็น fieldErrors รายช่อง', () => {
    let result = { ok: true } as ReturnType<typeof toActionResult>
    try {
      v.parse(expenseInputSchema, { name: '', category: '', amount: 'abc', isPaid: false, vendorId: '', dueDate: '', note: '' })
    } catch (error) {
      result = toActionResult(error)
    }
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('ควรเป็น error')
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(['amount', 'name'])
    expect(result.message).toBeTruthy()
  })

  it('error อื่นคืนข้อความอ่านรู้เรื่องพร้อม detail สำหรับ <details>', () => {
    const result = toActionResult(new Error('connection terminated'))
    if (result.ok) throw new Error('ควรเป็น error')
    expect(result.message).toBe('บันทึกไม่สำเร็จ')
    expect(result.detail).toBe('connection terminated')
    expect(result.fieldErrors).toBeUndefined()
  })
})
```

- [ ] **Step 2: รันเทสให้เห็นว่า fail**

Run: `bun test tests/lib/schemas.test.ts tests/lib/action-result.test.ts`
Expected: FAIL — หา module ไม่เจอ

- [ ] **Step 3: เขียน `src/lib/schemas/shared.ts`**

```ts
import * as v from 'valibot'
import { isBahtInput, parseBaht } from '@/lib/money'

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

/** string เข้า → number | null ออก · '' = ยังไม่ระบุยอด */
export const optionalBaht = v.pipe(
  v.string(),
  v.check(isBahtInput, 'ยอดเงินต้องเป็นจำนวนเต็มบาท เช่น 70,000'),
  v.transform((s): number | null => parseBaht(s)),
)

export const requiredBaht = v.pipe(
  v.string(),
  v.check(isBahtInput, 'ยอดเงินต้องเป็นจำนวนเต็มบาท เช่น 1,000'),
  v.check((s) => parseBaht(s) !== null, 'ต้องใส่ยอดเงิน'),
  v.transform((s): number => parseBaht(s) as number),
)

export const optionalId = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || /^\d+$/.test(s.trim()), 'เลือกจากรายการเท่านั้น'),
  v.transform((s): number | null => (s.trim() === '' ? null : Number(s))),
)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const optionalDate = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || ISO_DATE.test(s.trim()), 'วันที่ต้องอยู่ในรูปแบบ ปปปป-ดด-วว'),
  v.transform((s): string | null => (s.trim() === '' ? null : s.trim())),
)

export const requiredDate = v.pipe(
  v.string(),
  v.trim(),
  v.regex(ISO_DATE, 'ต้องใส่วันที่'),
)

/** จำนวนคน — ว่างเปล่าถือเป็น 0 */
export const requiredCount = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || /^\d+$/.test(s.trim()), 'ต้องเป็นจำนวนเต็มไม่ติดลบ'),
  v.transform((s): number => (s.trim() === '' ? 0 : Number(s))),
)

/** จำนวนคน — ว่างเปล่า = ยังไม่ได้ถาม (null) ต่างจาก 0 = ถามแล้วมาคนเดียว */
export const optionalCount = v.pipe(
  v.string(),
  v.check((s) => s.trim() === '' || /^\d+$/.test(s.trim()), 'ต้องเป็นจำนวนเต็มไม่ติดลบ'),
  v.transform((s): number | null => (s.trim() === '' ? null : Number(s))),
)
```

- [ ] **Step 4: เขียน schema ของทั้ง 5 โมดูล**

`src/lib/schemas/expense.ts`:
```ts
import * as v from 'valibot'
import { idNumber, optionalBaht, optionalDate, optionalId, optionalText, requiredText } from './shared'

export const expenseInputSchema = v.object({
  name: requiredText('ชื่อรายการ'),
  category: optionalText,
  amount: optionalBaht,
  isPaid: v.boolean(),
  vendorId: optionalId,
  dueDate: optionalDate,
  note: optionalText,
})

export const expenseUpdateSchema = v.object({ id: idNumber, ...expenseInputSchema.entries })

export const togglePaidSchema = v.object({ id: idNumber, isPaid: v.boolean() })

export type ExpenseInput = v.InferInput<typeof expenseInputSchema>
export type ExpenseValues = v.InferOutput<typeof expenseInputSchema>
```

`src/lib/schemas/envelope.ts`:
```ts
import * as v from 'valibot'
import { idNumber, optionalText, requiredBaht, requiredDate } from './shared'

export const envelopeInputSchema = v.object({
  giverName: optionalText,
  amount: requiredBaht,
  receivedAt: requiredDate,
  note: optionalText,
})

export const envelopeUpdateSchema = v.object({ id: idNumber, ...envelopeInputSchema.entries })

export type EnvelopeInput = v.InferInput<typeof envelopeInputSchema>
export type EnvelopeValues = v.InferOutput<typeof envelopeInputSchema>
```

`src/lib/schemas/guest.ts`:
```ts
import * as v from 'valibot'
import { idNumber, optionalCount, optionalText, requiredCount, requiredText } from './shared'

export const sideSchema = v.picklist(['groom', 'bride'], 'เลือกฝ่ายเจ้าบ่าวหรือเจ้าสาว')
export const rsvpSchema = v.picklist(['pending', 'yes', 'no'], 'สถานะตอบรับไม่ถูกต้อง')

export const guestInputSchema = v.object({
  name: requiredText('ชื่อแขก'),
  side: sideSchema,
  group: optionalText,
  companionsEstimated: requiredCount,
  companionsConfirmed: optionalCount,
  rsvp: rsvpSchema,
  note: optionalText,
})

export const guestUpdateSchema = v.object({ id: idNumber, ...guestInputSchema.entries })

export const toggleRsvpSchema = v.object({ id: idNumber, rsvp: rsvpSchema })

export type GuestInput = v.InferInput<typeof guestInputSchema>
export type GuestValues = v.InferOutput<typeof guestInputSchema>
```

`src/lib/schemas/checklist.ts`:
```ts
import * as v from 'valibot'
import { idNumber, optionalBaht, optionalDate, optionalId, optionalText, requiredText } from './shared'

export const checklistStatusSchema = v.picklist(['not_started', 'in_progress', 'done'], 'สถานะไม่ถูกต้อง')

export const checklistInputSchema = v.object({
  name: requiredText('ชื่องาน'),
  category: optionalText,
  status: checklistStatusSchema,
  budget: optionalBaht,
  deadline: optionalDate,
  depositPaid: v.boolean(),
  vendorId: optionalId,
  note: optionalText,
})

export const checklistUpdateSchema = v.object({ id: idNumber, ...checklistInputSchema.entries })

export const toggleChecklistStatusSchema = v.object({ id: idNumber, status: checklistStatusSchema })

export type ChecklistInput = v.InferInput<typeof checklistInputSchema>
export type ChecklistValues = v.InferOutput<typeof checklistInputSchema>
```

`src/lib/schemas/vendor.ts`:
```ts
import * as v from 'valibot'
import { idNumber, optionalBaht, optionalText, requiredText } from './shared'

export const vendorInputSchema = v.object({
  name: requiredText('ชื่อผู้ให้บริการ'),
  role: optionalText,
  phone: optionalText,
  line: optionalText,
  totalPrice: optionalBaht,
  note: optionalText,
})

export const vendorUpdateSchema = v.object({ id: idNumber, ...vendorInputSchema.entries })

export type VendorInput = v.InferInput<typeof vendorInputSchema>
export type VendorValues = v.InferOutput<typeof vendorInputSchema>
```

- [ ] **Step 5: เขียน `src/lib/action-result.ts`**

```ts
import * as v from 'valibot'

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; detail?: string; fieldErrors?: Record<string, string> }

export function toActionResult(error: unknown): ActionResult {
  if (v.isValiError(error)) {
    const flat = v.flatten(error.issues)
    const fieldErrors: Record<string, string> = {}
    for (const [field, messages] of Object.entries(flat.nested ?? {})) {
      const first = messages?.[0]
      if (first) fieldErrors[field] = first
    }
    return { ok: false, message: 'ข้อมูลที่กรอกยังไม่ถูกต้อง', fieldErrors }
  }

  console.error('[action]', error)
  return {
    ok: false,
    message: 'บันทึกไม่สำเร็จ',
    // แสดง error จริงได้เพราะผู้ใช้ 2 คนเป็นเจ้าของข้อมูลเอง
    // ถ้าวันหนึ่งใส่ auth แล้วเปิดให้คนอื่นเข้า ต้องตัดบรรทัดนี้ทิ้ง
    detail: error instanceof Error ? error.message : String(error),
  }
}
```

- [ ] **Step 6: รันเทสให้ผ่าน**

Run: `bun test`
Expected: PASS ทั้งหมด (money · env · seed-data · totals · schemas · action-result)

- [ ] **Step 7: Commit**

```bash
bun run lint
git add src/lib/schemas src/lib/action-result.ts tests/lib
git commit -m "feat: add valibot schemas and ActionResult contract"
```

---

### Task 7: Theme token + component ที่ใช้ร่วมทั้งแอป

**Files:**
- Modify: `app/globals.css`
- Create: `src/lib/ui.ts`, `src/components/ui/{card,button,field,money,badge,data-table,page-header,confirm-button,empty-state,spinner}.tsx`, `tests/components/money.test.tsx`, `tests/components/badge.test.tsx`

**Interfaces:**
- Consumes: `cn` จาก `@/lib/cn`, `formatBaht` จาก `@/lib/money`
- Produces:
  - `<Card>` `<Button variant>` `<Field>` `<Money value={number|null}>` `<Badge status children>` `<DataTable>` `<PageHeader>` `<ConfirmButton>` `<EmptyState>` `<Spinner>`
  - `STATUS_STYLE` และ `paidStatus(amount, isPaid)` `rsvpStatus(rsvp)` `checklistStatus(status)` จาก `@/lib/ui`

- [ ] **Step 1: เขียนเทสของ `<Money>` และ `<Badge>` ให้ fail ก่อน**

`tests/components/money.test.tsx`:
```tsx
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Money } from '@/components/ui/money'

describe('<Money>', () => {
  it('แสดงเป็น <data> ที่ถือทั้งค่าดิบและค่าที่แสดง', () => {
    const html = renderToStaticMarkup(<Money value={70000} />)
    expect(html).toContain('value="70000"')
    expect(html).toContain('70,000')
  })

  it('ไม่มีเลขไทยหลุดออกมา', () => {
    expect(renderToStaticMarkup(<Money value={70000} />)).not.toMatch(/[๐-๙]/)
  })

  it('null คือ "ยังไม่ระบุ" ไม่ใช่ 0', () => {
    const html = renderToStaticMarkup(<Money value={null} />)
    expect(html).toContain('ยังไม่ระบุ')
    expect(html).not.toContain('>0<')
  })
})
```

`tests/components/badge.test.tsx`:
```tsx
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Badge } from '@/components/ui/badge'

describe('<Badge>', () => {
  it('มีข้อความเสมอ ไม่ได้สื่อด้วยสีอย่างเดียว', () => {
    const html = renderToStaticMarkup(<Badge status="paid">จ่ายแล้ว</Badge>)
    expect(html).toContain('จ่ายแล้ว')
  })

  it('หยิบคลาสจาก STATUS_STYLE ตามสถานะ', () => {
    expect(renderToStaticMarkup(<Badge status="unpaid">ค้างจ่าย</Badge>)).toContain('text-unpaid')
    expect(renderToStaticMarkup(<Badge status="unknown">ยังไม่ระบุ</Badge>)).toContain('text-unknown')
  })
})
```

- [ ] **Step 2: รันเทสให้เห็นว่า fail**

Run: `bun test tests/components`
Expected: FAIL — `Cannot find module '@/components/ui/money'`

- [ ] **Step 3: เขียน `app/globals.css` ตัวจริง**

```css
@import "tailwindcss";

@theme {
  --color-bg: #faf8f6;
  --color-surface: #ffffff;
  --color-border: #e9e2dc;
  --color-ink: #2b2521;
  --color-muted: #8b7f77;
  --color-accent: #b08968;
  --color-paid: #4a7c59;
  --color-unpaid: #b4552d;
  --color-unknown: #8b7f77;
  --radius-card: 12px;
  --font-sans: var(--font-ibm-plex-sans-thai), system-ui, sans-serif;
}

@layer base {
  body {
    background: var(--color-bg);
    color: var(--color-ink);
    font-family: var(--font-sans);
  }
}

@layer components {
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    padding: 1rem;
  }
  .input {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    width: 100%;
  }
  .btn {
    border-radius: 8px;
    padding: 0.5rem 1rem;
    font-weight: 500;
    cursor: pointer;
  }
  .btn-primary { background: var(--color-accent); color: #fff; }
  .btn-ghost { background: transparent; border: 1px solid var(--color-border); }
  .btn-danger { background: transparent; color: var(--color-unpaid); border: 1px solid var(--color-unpaid); }
  .btn[disabled] { opacity: 0.6; cursor: not-allowed; }
  .table { width: 100%; border-collapse: collapse; }
  .table th, .table td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--color-border); }
  .table td.num, .table th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .badge { border-radius: 999px; padding: 0.125rem 0.5rem; font-size: 0.8125rem; display: inline-block; }
  .field-error { color: var(--color-unpaid); font-size: 0.8125rem; }
}
```

- [ ] **Step 4: เขียน `src/lib/ui.ts`**

```ts
import type { ChecklistStatus, Rsvp } from '@/db/schema'

export type StatusKey = 'paid' | 'unpaid' | 'unknown'

export const STATUS_STYLE = {
  paid: 'bg-paid/10 text-paid',
  unpaid: 'bg-unpaid/10 text-unpaid',
  unknown: 'bg-unknown/10 text-unknown',
} as const satisfies Record<StatusKey, string>

export function paidStatus(amount: number | null, isPaid: boolean): { key: StatusKey; label: string } {
  if (amount === null) return { key: 'unknown', label: 'ยังไม่ระบุยอด' }
  return isPaid ? { key: 'paid', label: 'จ่ายแล้ว' } : { key: 'unpaid', label: 'ค้างจ่าย' }
}

export function rsvpStatus(rsvp: Rsvp): { key: StatusKey; label: string } {
  if (rsvp === 'yes') return { key: 'paid', label: 'มาแน่' }
  if (rsvp === 'no') return { key: 'unpaid', label: 'ไม่มา' }
  return { key: 'unknown', label: 'ยังไม่ตอบ' }
}

export function checklistStatus(status: ChecklistStatus): { key: StatusKey; label: string } {
  if (status === 'done') return { key: 'paid', label: 'เสร็จแล้ว' }
  if (status === 'in_progress') return { key: 'unpaid', label: 'กำลังทำ' }
  return { key: 'unknown', label: 'ยังไม่เริ่ม' }
}

export const CHECKLIST_STATUS_ORDER: ChecklistStatus[] = ['in_progress', 'not_started', 'done']
```

- [ ] **Step 5: เขียน component ทั้ง 10 ตัว**

`src/components/ui/money.tsx`:
```tsx
import { formatBaht } from '@/lib/money'

/** จุดเดียวในระบบที่เรียก formatBaht — ทำให้กฎ "format ตอนแสดงเท่านั้น" เกิดขึ้นจริง */
export function Money({ value }: { value: number | null }) {
  if (value === null) return <span className="text-unknown">ยังไม่ระบุ</span>
  return <data value={String(value)}>{formatBaht(value)}</data>
}
```

`src/components/ui/badge.tsx`:
```tsx
import { cn } from '@/lib/cn'
import { STATUS_STYLE, type StatusKey } from '@/lib/ui'

export function Badge({ status, children }: { status: StatusKey; children: React.ReactNode }) {
  return <span className={cn('badge', STATUS_STYLE[status])}>{children}</span>
}
```

`src/components/ui/card.tsx`:
```tsx
import { cn } from '@/lib/cn'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>
}
```

`src/components/ui/button.tsx`:
```tsx
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost' | 'danger'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={cn('btn', VARIANT_CLASS[variant], className)} {...props} />
}
```

`src/components/ui/field.tsx`:
```tsx
'use client'

import { useId } from 'react'

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  /** รับ props ของ input ไปผูก id / aria — ใช้คู่กับ register() ของ react-hook-form */
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby': string | undefined }) => React.ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}
      {hint && !error ? (
        <p id={hintId} className="text-muted text-sm">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

`src/components/ui/data-table.tsx`:
```tsx
import { cn } from '@/lib/cn'
import { EmptyState } from './empty-state'

export type Column = { key: string; label: string; numeric?: boolean }

export function DataTable({
  caption,
  columns,
  children,
  isEmpty,
  emptyMessage = 'ยังไม่มีข้อมูล',
}: {
  caption: string
  columns: Column[]
  children: React.ReactNode
  isEmpty: boolean
  emptyMessage?: string
}) {
  if (isEmpty) return <EmptyState message={emptyMessage} />

  return (
    <table className="table">
      <caption className="text-muted text-left text-sm mb-2">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={cn(column.numeric && 'num')}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}
```

`src/components/ui/page-header.tsx`:
```tsx
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children ? <div className="flex flex-wrap gap-4 text-muted">{children}</div> : null}
    </header>
  )
}
```

`src/components/ui/confirm-button.tsx`:
```tsx
'use client'

import { useTransition } from 'react'
import { Button } from './button'

export function ConfirmButton({
  question,
  onConfirm,
  children,
}: {
  question: string
  onConfirm: () => Promise<unknown>
  children: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      disabled={isPending}
      onClick={() => {
        // ไม่มี undo — confirm() คือด่านเดียว (ตัดสินใจไว้ในสเปคข้อ 8)
        if (!window.confirm(question)) return
        startTransition(async () => {
          await onConfirm()
        })
      }}
    >
      {children}
    </Button>
  )
}
```

`src/components/ui/empty-state.tsx`:
```tsx
export function EmptyState({ message }: { message: string }) {
  return <p className="text-muted py-6 text-center">{message}</p>
}
```

`src/components/ui/spinner.tsx`:
```tsx
export function Spinner({ label = 'กำลังโหลด' }: { label?: string }) {
  return (
    <output className="text-muted flex items-center gap-2 py-8 justify-center">
      <span
        aria-hidden="true"
        className="inline-block size-4 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      {label}
    </output>
  )
}
```

- [ ] **Step 6: รันเทสให้ผ่าน**

Run: `bun test tests/components`
Expected: PASS

- [ ] **Step 7: lint + build แล้ว commit**

```bash
bun run lint && bun test && bun run build
git add app/globals.css src/lib/ui.ts src/components tests/components
git commit -m "feat: add theme tokens and shared ui components"
```

---

### Task 8: โครงหน้าเว็บ — layout · nav · font · error/loading/not-found

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`
- Create: `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`, `src/components/nav.tsx`

**Interfaces:**
- Consumes: `<Spinner>` `<Card>` `<Button>` จาก `@/components/ui/*`
- Produces: layout ที่มี `<nav>` + `<main>` และตัวแปรฟอนต์ `--font-ibm-plex-sans-thai` ที่ `@theme` ชี้ถึง · ทุกหน้าใต้ `app/` ได้ error/loading/not-found ฟรี

- [ ] **Step 1: `src/components/nav.tsx`**

```tsx
import Link from 'next/link'

const LINKS = [
  { href: '/', label: 'ภาพรวม' },
  { href: '/expenses', label: 'ค่าใช้จ่าย' },
  { href: '/envelopes', label: 'ซองรับ' },
  { href: '/guests', label: 'แขก' },
  { href: '/checklist', label: 'Checklist' },
  { href: '/vendors', label: 'ผู้ให้บริการ' },
] as const

export function Nav() {
  return (
    <nav className="border-b border-border bg-surface">
      <ul className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-3">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: `app/layout.tsx` พร้อมฟอนต์และ metadata**

```tsx
import type { Metadata } from 'next'
import { IBM_Plex_Sans_Thai } from 'next/font/google'
import { Nav } from '@/components/nav'
import './globals.css'

const sansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-sans-thai',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'งานแต่งบาสเพลง',
  description: 'ข้อมูลการจัดงานแต่ง',
  // เว็บไม่มี login โดยตั้งใจ — อย่างน้อยกัน search engine ไม่ให้เก็บ index
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={sansThai.variable}>
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: `app/loading.tsx` · `app/error.tsx` · `app/not-found.tsx`**

`app/loading.tsx`:
```tsx
import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
  // Neon cold start กินเวลาได้ ~1 วินาที
  return <Spinner />
}
```

`app/error.tsx`:
```tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <h1 className="text-lg font-semibold">โหลดข้อมูลไม่ได้</h1>
      <p className="text-muted mt-1">ต่อฐานข้อมูลไม่ติด ลองใหม่อีกครั้ง</p>
      <details className="mt-3">
        <summary className="text-muted cursor-pointer text-sm">รายละเอียดข้อผิดพลาด</summary>
        <pre className="mt-2 overflow-x-auto text-sm">{error.message}</pre>
      </details>
      <Button className="mt-4" onClick={reset}>
        ลองใหม่
      </Button>
    </Card>
  )
}
```

`app/not-found.tsx`:
```tsx
import Link from 'next/link'
import { Card } from '@/components/ui/card'

export default function NotFound() {
  return (
    <Card>
      <h1 className="text-lg font-semibold">ไม่พบหน้านี้</h1>
      <Link href="/" className="text-accent mt-2 inline-block">
        กลับไปหน้าภาพรวม
      </Link>
    </Card>
  )
}
```

- [ ] **Step 4: ตรวจด้วยตาว่า nav / ฟอนต์ / สีทำงาน**

```bash
bun run dev
```
เปิด `http://localhost:3000` — ต้องเห็น nav 6 ลิงก์ พื้นหลังสีครีม `#faf8f6` ตัวอักษรเป็น IBM Plex Sans Thai และคลิกลิงก์แล้วขึ้น 404 ของเราเอง (ยังไม่มีหน้าเหล่านั้น)

- [ ] **Step 5: build + commit**

```bash
bun run lint && bun run build
git add app src/components/nav.tsx
git commit -m "feat: add app shell with nav, thai font and error boundaries"
```

---

### Task 9: โมดูล `/expenses`

**Files:**
- Create: `src/lib/date.ts`, `tests/lib/date.test.ts`, `src/components/ui/date-text.tsx`, `src/db/queries.ts`, `src/db/mutations.ts`, `app/expenses/page.tsx`, `app/expenses/actions.ts`, `app/expenses/expense-form.tsx`, `app/expenses/paid-toggle.tsx`, `app/expenses/delete-expense-button.tsx`

**Interfaces:**
- Consumes: `summarizeExpenses` `summarizeByCategory` จาก `@/lib/totals` · schema จาก `@/lib/schemas/expense` · `toActionResult` `ActionResult` · component จาก `@/components/ui/*`
- Produces:
  - `formatThaiDate(iso: string): string` และ `<DateText value={string} />`
  - `@/db/queries`: `loadExpensesPage(): Promise<{ rows: ExpenseWithVendor[]; vendorOptions: VendorOption[] }>` · `type ExpenseWithVendor` · `type VendorOption = { id: number; name: string }`
  - `@/db/mutations`: `createExpense` `updateExpense` `setExpensePaid` `deleteExpense`
  - `app/expenses/actions.ts`: `createExpenseAction(raw): Promise<ActionResult>` · `updateExpenseAction` · `togglePaidAction` · `deleteExpenseAction`
  - หมายเหตุ: `updateExpenseAction` เขียนไว้ใน task นี้แต่ยังไม่มี UI เรียกจนถึง Task 15

- [ ] **Step 1: เขียนเทสของ `formatThaiDate` ให้ fail ก่อน**

`tests/lib/date.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { formatThaiDate } from '@/lib/date'

describe('formatThaiDate', () => {
  it('แปลงเป็นวันเดือนย่อปี พ.ศ. สองหลัก', () => {
    expect(formatThaiDate('2026-11-28')).toBe('28 พ.ย. 69')
    expect(formatThaiDate('2026-01-05')).toBe('5 ม.ค. 69')
  })

  it('ปฏิเสธรูปแบบที่ไม่ใช่ ปปปป-ดด-วว', () => {
    expect(() => formatThaiDate('28/11/2569')).toThrow()
  })
})
```

- [ ] **Step 2: รันเทสให้เห็นว่า fail**

Run: `bun test tests/lib/date.test.ts`
Expected: FAIL — `Cannot find module '@/lib/date'`

- [ ] **Step 3: เขียน `src/lib/date.ts` และ `<DateText>`**

`src/lib/date.ts`:
```ts
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

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
```

`src/components/ui/date-text.tsx`:
```tsx
import { formatThaiDate } from '@/lib/date'

export function DateText({ value }: { value: string | null }) {
  if (value === null) return <span className="text-unknown">—</span>
  return <time dateTime={value}>{formatThaiDate(value)}</time>
}
```

- [ ] **Step 4: รันเทสให้ผ่าน**

Run: `bun test tests/lib/date.test.ts`
Expected: PASS

- [ ] **Step 5: `src/db/queries.ts` — ชั้นอ่านอย่างเดียว**

```ts
import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { connection } from 'next/server'
import { db } from '@/db'
import { expenses, vendors } from '@/db/schema'

export type VendorOption = { id: number; name: string }

export type ExpenseWithVendor = {
  id: number
  name: string
  category: string | null
  amount: number | null
  isPaid: boolean
  vendorId: number | null
  vendorName: string | null
  dueDate: string | null
  note: string | null
}

/**
 * connection() อยู่ที่นี่ที่เดียว — ถ้าไม่มี Next จะ prerender หน้าตอน build
 * แล้วยอดเงินบนเว็บจะค้างอยู่ ณ วันนั้นตลอดไปโดยไม่มี error ให้เห็น
 */
export async function loadExpensesPage(): Promise<{ rows: ExpenseWithVendor[]; vendorOptions: VendorOption[] }> {
  await connection()

  const [rows, vendorOptions] = await db.batch([
    db
      .select({
        id: expenses.id,
        name: expenses.name,
        category: expenses.category,
        amount: expenses.amount,
        isPaid: expenses.isPaid,
        vendorId: expenses.vendorId,
        vendorName: vendors.name,
        dueDate: expenses.dueDate,
        note: expenses.note,
      })
      .from(expenses)
      .leftJoin(vendors, eq(expenses.vendorId, vendors.id))
      .orderBy(asc(expenses.id)),
    db.select({ id: vendors.id, name: vendors.name }).from(vendors).orderBy(asc(vendors.id)),
  ])

  return { rows, vendorOptions }
}
```

- [ ] **Step 6: `src/db/mutations.ts` — ชั้นเขียนอย่างเดียว**

```ts
import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { expenses } from '@/db/schema'
import type { ExpenseValues } from '@/lib/schemas/expense'

export async function createExpense(values: ExpenseValues): Promise<void> {
  await db.insert(expenses).values(values)
}

export async function updateExpense(id: number, values: ExpenseValues): Promise<void> {
  await db.update(expenses).set({ ...values, updatedAt: new Date() }).where(eq(expenses.id, id))
}

export async function setExpensePaid(id: number, isPaid: boolean): Promise<void> {
  await db.update(expenses).set({ isPaid, updatedAt: new Date() }).where(eq(expenses.id, id))
}

export async function deleteExpense(id: number): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id))
}
```

- [ ] **Step 7: `app/expenses/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createExpense, deleteExpense, setExpensePaid, updateExpense } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { expenseInputSchema, expenseUpdateSchema, togglePaidSchema } from '@/lib/schemas/expense'
import { idSchema } from '@/lib/schemas/shared'

function revalidate(): void {
  revalidatePath('/expenses')
  revalidatePath('/')
}

export async function createExpenseAction(raw: unknown): Promise<ActionResult> {
  try {
    // client validate ไปแล้วก็ต้อง parse ซ้ำที่นี่ — ฝั่ง client เป็นเรื่อง UX ไม่ใช่การรับประกันข้อมูล
    const values = v.parse(expenseInputSchema, raw)
    await createExpense(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateExpenseAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, ...values } = v.parse(expenseUpdateSchema, raw)
    await updateExpense(id, values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function togglePaidAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, isPaid } = v.parse(togglePaidSchema, raw)
    await setExpensePaid(id, isPaid)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteExpenseAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteExpense(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}
```

- [ ] **Step 8: `app/expenses/expense-form.tsx`**

```tsx
'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import type { VendorOption } from '@/db/queries'
import { expenseInputSchema } from '@/lib/schemas/expense'
import { createExpenseAction } from './actions'

type FormInput = v.InferInput<typeof expenseInputSchema>
type FormOutput = v.InferOutput<typeof expenseInputSchema>

const EMPTY: FormInput = {
  name: '',
  category: '',
  amount: '',
  isPaid: false,
  vendorId: '',
  dueDate: '',
  note: '',
}

export function ExpenseForm({ vendorOptions }: { vendorOptions: VendorOption[] }) {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  // schema เป็น transform (string เข้า → number ออก) จึงต้องประกาศ generic ให้ครบ 3 ตัว
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: valibotResolver(expenseInputSchema),
    defaultValues: EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await createExpenseAction(values)
    if (result.ok) {
      reset(EMPTY)
      setServerError(null)
      return
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <Field label="ชื่อรายการ" error={errors.name?.message}>
          {(props) => <input className="input" {...props} {...register('name')} />}
        </Field>

        <Field label="หมวด" error={errors.category?.message}>
          {(props) => <input className="input" {...props} {...register('category')} />}
        </Field>

        <Field label="ยอดเงิน (บาท)" hint="เว้นว่างได้ถ้ายังไม่รู้ยอด" error={errors.amount?.message}>
          {(props) => <input className="input" inputMode="numeric" {...props} {...register('amount')} />}
        </Field>

        <Field label="ผู้ให้บริการ" error={errors.vendorId?.message}>
          {(props) => (
            <select className="input" {...props} {...register('vendorId')}>
              <option value="">ยังไม่ระบุ</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="กำหนดจ่าย" hint="ปปปป-ดด-วว" error={errors.dueDate?.message}>
          {(props) => <input className="input" type="date" {...props} {...register('dueDate')} />}
        </Field>

        <Field label="หมายเหตุ" error={errors.note?.message}>
          {(props) => <input className="input" {...props} {...register('note')} />}
        </Field>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('isPaid')} />
          จ่ายแล้ว
        </label>

        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            เพิ่มรายการ
          </Button>
          {serverError ? (
            <span className="field-error">
              {serverError.message}
              {serverError.detail ? (
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer">รายละเอียด</summary>
                  <pre className="overflow-x-auto text-sm">{serverError.detail}</pre>
                </details>
              ) : null}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
```

- [ ] **Step 9: `app/expenses/paid-toggle.tsx` และ `app/expenses/delete-expense-button.tsx`**

`paid-toggle.tsx`:
```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import { togglePaidAction } from './actions'

/** useOptimistic ใช้กับ toggle เท่านั้น — มันคือสิ่งเดียวที่กดรัวติดกันจนความหน่วงกวนใจ */
export function PaidToggle({ id, isPaid, label }: { id: number; isPaid: boolean; label: string }) {
  const [optimisticPaid, setOptimisticPaid] = useOptimistic(isPaid)
  const [, startTransition] = useTransition()

  return (
    <input
      type="checkbox"
      checked={optimisticPaid}
      aria-label={`จ่ายแล้ว: ${label}`}
      onChange={() => {
        startTransition(async () => {
          setOptimisticPaid(!isPaid)
          await togglePaidAction({ id, isPaid: !isPaid })
        })
      }}
    />
  )
}
```

`delete-expense-button.tsx`:
```tsx
'use client'

import { ConfirmButton } from '@/components/ui/confirm-button'
import { deleteExpenseAction } from './actions'

export function DeleteExpenseButton({ id, name }: { id: number; name: string }) {
  return (
    <ConfirmButton question={`ลบ "${name}" ? ลบแล้วกู้คืนไม่ได้`} onConfirm={() => deleteExpenseAction({ id })}>
      ลบ
    </ConfirmButton>
  )
}
```

- [ ] **Step 10: `app/expenses/page.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { loadExpensesPage } from '@/db/queries'
import { summarizeByCategory, summarizeExpenses } from '@/lib/totals'
import { paidStatus } from '@/lib/ui'
import { DeleteExpenseButton } from './delete-expense-button'
import { ExpenseForm } from './expense-form'
import { PaidToggle } from './paid-toggle'

const COLUMNS = [
  { key: 'paid', label: 'จ่ายแล้ว' },
  { key: 'name', label: 'รายการ' },
  { key: 'category', label: 'หมวด' },
  { key: 'vendor', label: 'ผู้ให้บริการ' },
  { key: 'due', label: 'กำหนดจ่าย' },
  { key: 'amount', label: 'ยอด (บาท)', numeric: true },
  { key: 'status', label: 'สถานะ' },
  { key: 'actions', label: '' },
]

export default async function ExpensesPage() {
  const { rows, vendorOptions } = await loadExpensesPage()
  const summary = summarizeExpenses(rows)
  const byCategory = summarizeByCategory(rows)

  return (
    <>
      <PageHeader title="ค่าใช้จ่าย">
        <span>
          จ่ายแล้ว <Money value={summary.paid} />
        </span>
        <span>
          ค้างจ่าย <Money value={summary.unpaid} />
        </span>
        {/* ตัวนับนี้ต้องอยู่ทุกที่ที่แสดงยอดรวม ไม่งั้นตัวเลขค้างจ่ายจะต่ำกว่าความจริงเงียบๆ */}
        <span>ยังไม่ระบุยอด {summary.unknownCount} รายการ</span>
      </PageHeader>

      <ExpenseForm vendorOptions={vendorOptions} />

      <Card className="mb-6">
        <DataTable
          caption="ค่าใช้จ่ายทั้งหมด"
          columns={COLUMNS}
          isEmpty={rows.length === 0}
          emptyMessage="ยังไม่มีรายการค่าใช้จ่าย"
        >
          {rows.map((row) => {
            const status = paidStatus(row.amount, row.isPaid)
            return (
              <tr key={row.id}>
                <td>
                  <PaidToggle id={row.id} isPaid={row.isPaid} label={row.name} />
                </td>
                <td>{row.name}</td>
                <td>{row.category ?? '—'}</td>
                <td>{row.vendorName ?? '—'}</td>
                <td>
                  <DateText value={row.dueDate} />
                </td>
                <td className="num">
                  <Money value={row.amount} />
                </td>
                <td>
                  <Badge status={status.key}>{status.label}</Badge>
                </td>
                <td>
                  <DeleteExpenseButton id={row.id} name={row.name} />
                </td>
              </tr>
            )
          })}
        </DataTable>
      </Card>

      <Card>
        <DataTable
          caption="สรุปแยกหมวด"
          columns={[
            { key: 'category', label: 'หมวด' },
            { key: 'count', label: 'รายการ', numeric: true },
            { key: 'paid', label: 'จ่ายแล้ว', numeric: true },
            { key: 'unpaid', label: 'ค้างจ่าย', numeric: true },
            { key: 'total', label: 'รวม', numeric: true },
            { key: 'unknown', label: 'ยังไม่ระบุยอด', numeric: true },
          ]}
          isEmpty={byCategory.length === 0}
        >
          {byCategory.map((row) => (
            <tr key={row.category}>
              <td>{row.category}</td>
              <td className="num">{row.count}</td>
              <td className="num">
                <Money value={row.paid} />
              </td>
              <td className="num">
                <Money value={row.unpaid} />
              </td>
              <td className="num">
                <Money value={row.total} />
              </td>
              <td className="num">{row.unknownCount}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  )
}
```

- [ ] **Step 11: ตรวจด้วยตาบนหน้าเว็บจริง**

```bash
bun run dev
```
ที่ `http://localhost:3000/expenses` ต้องได้ครบทุกข้อ:
1. เห็น 35 แถวจาก seed พร้อมชื่อ vendor
2. หัวข้อบอก "ยังไม่ระบุยอด 6 รายการ"
3. ติ๊ก "จ่ายแล้ว" แล้วช่องเปลี่ยนทันที ไม่รอ round trip แล้วยอดสรุปด้านบนอัปเดตตาม
4. กรอกยอด `70,000` แล้วเพิ่มรายการได้ · กรอก `เจ็ดหมื่น` แล้วขึ้น error ใต้ช่องโดยข้อมูลที่พิมพ์ไว้ยังอยู่
5. ปล่อยช่องยอดว่างแล้วเพิ่ม → แถวใหม่ขึ้น "ยังไม่ระบุ" และตัวนับเพิ่มเป็น 7
6. กดลบแล้วมี `confirm()` ถามก่อน

- [ ] **Step 12: ยืนยันว่ากฎ Biome ยังคุ้มหน้านี้อยู่**

```bash
bun run lint
```
Expected: PASS (และถ้าลองเพิ่ม `import { createExpense } from '@/db/mutations'` ใน `app/expenses/page.tsx` ชั่วคราวต้องแดง — ลองแล้วเอาออก)

- [ ] **Step 13: Commit**

```bash
bun test && bun run build
git add src/lib/date.ts tests/lib/date.test.ts src/components/ui/date-text.tsx src/db/queries.ts src/db/mutations.ts app/expenses
git commit -m "feat: add expenses page with form, paid toggle and category summary"
```

---

### Task 10: โมดูล `/envelopes`

**Files:**
- Create: `app/envelopes/page.tsx`, `app/envelopes/actions.ts`, `app/envelopes/envelope-form.tsx`, `app/envelopes/delete-envelope-button.tsx`
- Modify: `src/db/queries.ts`, `src/db/mutations.ts`

**Interfaces:**
- Consumes: `envelopeInputSchema` `envelopeUpdateSchema` · `sumEnvelopes` จาก `@/lib/totals`
- Produces:
  - `@/db/queries`: `listEnvelopes(): Promise<Envelope[]>`
  - `@/db/mutations`: `createEnvelope(values: EnvelopeValues)` `deleteEnvelope(id: number)`
  - `app/envelopes/actions.ts`: `createEnvelopeAction` `deleteEnvelopeAction`

- [ ] **Step 1: เพิ่ม query และ mutation ของซอง**

ต่อท้าย `src/db/queries.ts`:
```ts
import { desc } from 'drizzle-orm'
import { envelopes } from '@/db/schema'
import type { Envelope } from '@/db/schema'

export async function listEnvelopes(): Promise<Envelope[]> {
  await connection()
  return db.select().from(envelopes).orderBy(desc(envelopes.id))
}
```

ต่อท้าย `src/db/mutations.ts`:
```ts
import { envelopes } from '@/db/schema'
import type { EnvelopeValues } from '@/lib/schemas/envelope'

export async function createEnvelope(values: EnvelopeValues): Promise<void> {
  await db.insert(envelopes).values(values)
}

export async function deleteEnvelope(id: number): Promise<void> {
  await db.delete(envelopes).where(eq(envelopes.id, id))
}
```

- [ ] **Step 2: `app/envelopes/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createEnvelope, deleteEnvelope } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { envelopeInputSchema } from '@/lib/schemas/envelope'
import { idSchema } from '@/lib/schemas/shared'

function revalidate(): void {
  revalidatePath('/envelopes')
  revalidatePath('/')
}

export async function createEnvelopeAction(raw: unknown): Promise<ActionResult> {
  try {
    const values = v.parse(envelopeInputSchema, raw)
    await createEnvelope(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteEnvelopeAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteEnvelope(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}
```

- [ ] **Step 3: `app/envelopes/envelope-form.tsx` — ฟอร์มกรอกเร็ววันงาน**

```tsx
'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { envelopeInputSchema } from '@/lib/schemas/envelope'
import { createEnvelopeAction } from './actions'

type FormInput = v.InferInput<typeof envelopeInputSchema>
type FormOutput = v.InferOutput<typeof envelopeInputSchema>

export function EnvelopeForm({ today }: { today: string }) {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: valibotResolver(envelopeInputSchema),
    defaultValues: { giverName: '', amount: '', receivedAt: today, note: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await createEnvelopeAction(values)
    if (result.ok) {
      // วันงานกรอกรัว — คงวันที่ไว้ ล้างชื่อกับยอด แล้วคืน focus ไปช่องแรก
      reset({ giverName: '', amount: '', receivedAt: getValues('receivedAt'), note: '' })
      firstFieldRef.current?.focus()
      setServerError(null)
      return
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })

  const giverName = register('giverName')

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-4">
        <Field label="ชื่อผู้ให้" hint="ไม่รู้ชื่อก็เว้นว่างได้" error={errors.giverName?.message}>
          {(props) => (
            <input
              className="input"
              {...props}
              {...giverName}
              ref={(element) => {
                giverName.ref(element)
                firstFieldRef.current = element
              }}
            />
          )}
        </Field>

        <Field label="ยอด (บาท)" error={errors.amount?.message}>
          {(props) => <input className="input" inputMode="numeric" {...props} {...register('amount')} />}
        </Field>

        <Field label="วันที่รับ" error={errors.receivedAt?.message}>
          {(props) => <input className="input" type="date" {...props} {...register('receivedAt')} />}
        </Field>

        <Field label="หมายเหตุ" error={errors.note?.message}>
          {(props) => <input className="input" {...props} {...register('note')} />}
        </Field>

        <div className="sm:col-span-4 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            บันทึกซอง
          </Button>
          {serverError ? (
            <span className="field-error">
              {serverError.message}
              {serverError.detail ? (
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer">รายละเอียด</summary>
                  <pre className="overflow-x-auto text-sm">{serverError.detail}</pre>
                </details>
              ) : null}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
```

- [ ] **Step 4: `app/envelopes/delete-envelope-button.tsx`**

```tsx
'use client'

import { ConfirmButton } from '@/components/ui/confirm-button'
import { deleteEnvelopeAction } from './actions'

export function DeleteEnvelopeButton({ id, label }: { id: number; label: string }) {
  return (
    <ConfirmButton question={`ลบซองของ ${label} ? ลบแล้วกู้คืนไม่ได้`} onConfirm={() => deleteEnvelopeAction({ id })}>
      ลบ
    </ConfirmButton>
  )
}
```

- [ ] **Step 5: `app/envelopes/page.tsx`**

```tsx
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { listEnvelopes } from '@/db/queries'
import { todayIso } from '@/lib/date'
import { sumEnvelopes } from '@/lib/totals'
import { DeleteEnvelopeButton } from './delete-envelope-button'
import { EnvelopeForm } from './envelope-form'

export default async function EnvelopesPage() {
  const rows = await listEnvelopes()
  const total = sumEnvelopes(rows)

  return (
    <>
      <PageHeader title="ซองรับ">
        <span>
          รวม <Money value={total} />
        </span>
        <span>{rows.length} ซอง</span>
      </PageHeader>

      <EnvelopeForm today={todayIso()} />

      <Card>
        <DataTable
          caption="ซองที่รับมาแล้ว"
          columns={[
            { key: 'giver', label: 'ผู้ให้' },
            { key: 'received', label: 'วันที่รับ' },
            { key: 'note', label: 'หมายเหตุ' },
            { key: 'amount', label: 'ยอด (บาท)', numeric: true },
            { key: 'actions', label: '' },
          ]}
          isEmpty={rows.length === 0}
          emptyMessage="ยังไม่มีซอง"
        >
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.giverName ?? 'ไม่ระบุชื่อ'}</td>
              <td>
                <DateText value={row.receivedAt} />
              </td>
              <td>{row.note ?? '—'}</td>
              <td className="num">
                <Money value={row.amount} />
              </td>
              <td>
                <DeleteEnvelopeButton id={row.id} label={row.giverName ?? 'ไม่ระบุชื่อ'} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  )
}
```

- [ ] **Step 6: ตรวจด้วยตา**

```bash
bun run dev
```
ที่ `/envelopes`:
1. กรอกยอดอย่างเดียวแล้วกด Enter → บันทึกได้ ชื่อขึ้นว่า "ไม่ระบุชื่อ"
2. หลังบันทึก focus กลับไปช่องชื่อ และวันที่ยังคงค่าเดิมไว้
3. ยอดรวมด้านบนเพิ่มตาม
4. เว้นช่องยอดว่างแล้วกดบันทึก → ขึ้น error "ต้องใส่ยอดเงิน"

- [ ] **Step 7: Commit**

```bash
bun run lint && bun test && bun run build
git add app/envelopes src/db/queries.ts src/db/mutations.ts
git commit -m "feat: add envelopes page with fast entry form"
```

---

### Task 11: หน้า `/` — dashboard

**Files:**
- Create: `app/page.tsx` (เขียนทับหน้า placeholder)
- Modify: `src/db/queries.ts`

**Interfaces:**
- Consumes: `summarizeNet` `countGuests` `upcomingDeadlines` จาก `@/lib/totals`
- Produces: `@/db/queries`: `loadDashboard(): Promise<{ expenseRows; envelopeRows; guestRows; checklistRows }>` — 1 HTTP round trip ผ่าน `db.batch()`

- [ ] **Step 1: เพิ่ม `loadDashboard` ใน `src/db/queries.ts`**

```ts
import { checklistItems, guests } from '@/db/schema'
import type { AmountRow, DeadlineRow, GuestRow } from '@/lib/totals'

/**
 * Neon HTTP คิด 1 query = 1 HTTP round trip — batch 4 statement ให้เหลือรอบเดียว
 * แล้วดึงแถวดิบมาคำนวณด้วยฟังก์ชันบริสุทธิ์ ไม่ยิง GROUP BY เพิ่มเพื่อประหยัดการบวกเลข 35 ตัว
 */
export async function loadDashboard(): Promise<{
  expenseRows: AmountRow[]
  envelopeRows: { amount: number }[]
  guestRows: GuestRow[]
  checklistRows: DeadlineRow[]
}> {
  await connection()

  const [expenseRows, envelopeRows, guestRows, checklistRows] = await db.batch([
    db.select({ amount: expenses.amount, isPaid: expenses.isPaid }).from(expenses),
    db.select({ amount: envelopes.amount }).from(envelopes),
    db
      .select({
        rsvp: guests.rsvp,
        companionsEstimated: guests.companionsEstimated,
        companionsConfirmed: guests.companionsConfirmed,
      })
      .from(guests),
    db
      .select({
        id: checklistItems.id,
        name: checklistItems.name,
        status: checklistItems.status,
        deadline: checklistItems.deadline,
      })
      .from(checklistItems),
  ])

  return { expenseRows, envelopeRows, guestRows, checklistRows }
}
```

- [ ] **Step 2: เขียน `app/page.tsx`**

```tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { loadDashboard } from '@/db/queries'
import { countGuests, summarizeNet, upcomingDeadlines } from '@/lib/totals'
import { checklistStatus } from '@/lib/ui'

export default async function DashboardPage() {
  const { expenseRows, envelopeRows, guestRows, checklistRows } = await loadDashboard()
  const money = summarizeNet(expenseRows, envelopeRows)
  const guestCounts = countGuests(guestRows)
  const deadlines = upcomingDeadlines(checklistRows)

  return (
    <>
      <PageHeader title="ภาพรวม" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <p className="text-muted">ซองรับ</p>
          <p className="text-xl font-semibold">
            <Money value={money.received} />
          </p>
        </Card>
        <Card>
          <p className="text-muted">จ่ายแล้ว</p>
          <p className="text-xl font-semibold">
            <Money value={money.paid} />
          </p>
        </Card>
        <Card>
          <p className="text-muted">ค้างจ่าย</p>
          <p className="text-xl font-semibold">
            <Money value={money.unpaid} />
          </p>
          {/* ตัวเลขค้างจ่ายเชื่อได้แค่ไหนขึ้นกับบรรทัดนี้ */}
          <p className="text-muted text-sm">ยังไม่ระบุยอด {money.unknownCount} รายการ</p>
        </Card>
        <Card>
          <p className="text-muted">สุทธิ</p>
          <p className="text-xl font-semibold">
            <Money value={money.net} />
          </p>
          <p className="text-muted text-sm">ซองรับ − จ่ายแล้ว − ค้างจ่าย</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold mb-2">แขก</h2>
          <p>
            ประมาณการ <strong>{guestCounts.estimated}</strong> คน
          </p>
          <p>
            ยืนยันแล้ว <strong>{guestCounts.confirmed}</strong> คน
          </p>
          <p className="text-muted text-sm">
            ยังไม่ตอบ {guestCounts.pending} ราย · ตอบว่าไม่มา {guestCounts.declined} ราย
          </p>
          <Link href="/guests" className="text-accent mt-2 inline-block">
            ดูรายชื่อแขก
          </Link>
        </Card>

        <Card>
          <h2 className="font-semibold mb-2">งานค้างที่ใกล้กำหนด</h2>
          <DataTable
            caption="งานที่ยังไม่เสร็จ เรียงตามกำหนดส่ง"
            columns={[
              { key: 'name', label: 'งาน' },
              { key: 'status', label: 'สถานะ' },
              { key: 'deadline', label: 'กำหนด' },
            ]}
            isEmpty={deadlines.length === 0}
            emptyMessage="ยังไม่มีงานที่ตั้งกำหนดไว้"
          >
            {deadlines.map((row) => {
              const status = checklistStatus(row.status)
              return (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>
                    <Badge status={status.key}>{status.label}</Badge>
                  </td>
                  <td>
                    <DateText value={row.deadline} />
                  </td>
                </tr>
              )
            })}
          </DataTable>
        </Card>
      </div>
    </>
  )
}
```

- [ ] **Step 3: ยืนยันว่ายิง query รอบเดียว**

```bash
APP_ENV=development bun run dev
```
เปิด `http://localhost:3000` แล้วดู log ใน terminal — Drizzle logger ต้องพิมพ์ SQL ของ dashboard ออกมาเป็นชุดเดียว ไม่ใช่ 4 ครั้งแยกกันตามลำดับเวลา ถ้าเห็นแยกกันแปลว่า `db.batch()` ไม่ได้ถูกใช้จริง

- [ ] **Step 4: ยืนยันว่าตัวเลขตรงกับหน้า `/expenses`**

จ่ายแล้ว/ค้างจ่าย/ยังไม่ระบุยอด บนหน้าแรกต้องตรงกับหัวข้อของหน้า `/expenses` เป๊ะ และเมื่อบันทึกซองใหม่ที่ `/envelopes` แล้วกลับมาหน้าแรก ยอด "ซองรับ" กับ "สุทธิ" ต้องขยับตาม (`revalidatePath('/')`)

- [ ] **Step 5: ยืนยันว่าไม่ถูก prerender ตอน build**

```bash
bun run build
```
Expected: ในตาราง route ที่ Next พิมพ์ออกมา `/` `/expenses` `/envelopes` ต้องไม่ใช่ static (`○`) — ต้องเป็น dynamic (`ƒ`) เพราะ `await connection()` ถ้าเห็นเป็น static ให้หยุดแล้วไล่ดูว่าหน้านั้นเรียก query ผ่าน `src/db/queries.ts` จริงหรือเปล่า

- [ ] **Step 6: Commit**

```bash
bun run lint && bun test
git add app/page.tsx src/db/queries.ts
git commit -m "feat: add dashboard with batched query and net summary"
```

---

### Task 12: โมดูล `/guests`

**Files:**
- Create: `app/guests/page.tsx`, `app/guests/actions.ts`, `app/guests/guest-form.tsx`, `app/guests/guest-table.tsx`, `app/guests/rsvp-select.tsx`
- Modify: `src/db/queries.ts`, `src/db/mutations.ts`

**Interfaces:**
- Consumes: `guestInputSchema` `toggleRsvpSchema` · `countGuests`
- Produces:
  - `@/db/queries`: `listGuests(): Promise<Guest[]>`
  - `@/db/mutations`: `createGuest(values: GuestValues)` `setGuestRsvp(id, rsvp)` `deleteGuest(id)`
  - `app/guests/actions.ts`: `createGuestAction` `setRsvpAction` `deleteGuestAction`

- [ ] **Step 1: เพิ่ม query และ mutation ของแขก**

ต่อท้าย `src/db/queries.ts`:
```ts
import type { Guest } from '@/db/schema'

/** โหลดทั้ง 400 แถวรวดเดียว — ค้นหา/filter ทำฝั่ง client ไม่ยิง query เพิ่ม */
export async function listGuests(): Promise<Guest[]> {
  await connection()
  return db.select().from(guests).orderBy(asc(guests.id))
}
```

ต่อท้าย `src/db/mutations.ts`:
```ts
import { guests } from '@/db/schema'
import type { Rsvp } from '@/db/schema'
import type { GuestValues } from '@/lib/schemas/guest'

export async function createGuest(values: GuestValues): Promise<void> {
  await db.insert(guests).values(values)
}

export async function setGuestRsvp(id: number, rsvp: Rsvp): Promise<void> {
  await db.update(guests).set({ rsvp }).where(eq(guests.id, id))
}

export async function deleteGuest(id: number): Promise<void> {
  await db.delete(guests).where(eq(guests.id, id))
}
```

- [ ] **Step 2: `app/guests/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createGuest, deleteGuest, setGuestRsvp } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { guestInputSchema, toggleRsvpSchema } from '@/lib/schemas/guest'
import { idSchema } from '@/lib/schemas/shared'

function revalidate(): void {
  revalidatePath('/guests')
  revalidatePath('/')
}

export async function createGuestAction(raw: unknown): Promise<ActionResult> {
  try {
    const values = v.parse(guestInputSchema, raw)
    await createGuest(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function setRsvpAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, rsvp } = v.parse(toggleRsvpSchema, raw)
    await setGuestRsvp(id, rsvp)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteGuestAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteGuest(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}
```

- [ ] **Step 3: `app/guests/guest-form.tsx` — เพิ่มทีละคน จำฝั่ง/กลุ่มล่าสุด**

```tsx
'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { guestInputSchema } from '@/lib/schemas/guest'
import { createGuestAction } from './actions'

type FormInput = v.InferInput<typeof guestInputSchema>
type FormOutput = v.InferOutput<typeof guestInputSchema>

const BLANK: FormInput = {
  name: '',
  side: 'groom',
  group: '',
  companionsEstimated: '0',
  companionsConfirmed: '',
  rsvp: 'pending',
  note: '',
}

export function GuestForm() {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: valibotResolver(guestInputSchema),
    defaultValues: BLANK,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await createGuestAction(values)
    if (result.ok) {
      // กรอกทีละ ~10 คนติดกัน — ฝั่งกับกลุ่มมักซ้ำเดิม จึงจำค่าล่าสุดไว้
      reset({ ...BLANK, side: getValues('side'), group: getValues('group') })
      nameRef.current?.focus()
      setServerError(null)
      return
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })

  const name = register('name')

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
        <Field label="ชื่อแขก" error={errors.name?.message}>
          {(props) => (
            <input
              className="input"
              {...props}
              {...name}
              ref={(element) => {
                name.ref(element)
                nameRef.current = element
              }}
            />
          )}
        </Field>

        <Field label="ฝ่าย" error={errors.side?.message}>
          {(props) => (
            <select className="input" {...props} {...register('side')}>
              <option value="groom">เจ้าบ่าว</option>
              <option value="bride">เจ้าสาว</option>
            </select>
          )}
        </Field>

        <Field label="กลุ่ม" hint="ญาติ / เพื่อน / ที่ทำงาน" error={errors.group?.message}>
          {(props) => <input className="input" {...props} {...register('group')} />}
        </Field>

        <Field label="ผู้ติดตามที่คาดว่าจะมา" error={errors.companionsEstimated?.message}>
          {(props) => <input className="input" inputMode="numeric" {...props} {...register('companionsEstimated')} />}
        </Field>

        <Field
          label="ผู้ติดตามที่ยืนยันแล้ว"
          hint="เว้นว่าง = ยังไม่ได้ถาม · 0 = ถามแล้วมาคนเดียว"
          error={errors.companionsConfirmed?.message}
        >
          {(props) => <input className="input" inputMode="numeric" {...props} {...register('companionsConfirmed')} />}
        </Field>

        <Field label="ตอบรับ" error={errors.rsvp?.message}>
          {(props) => (
            <select className="input" {...props} {...register('rsvp')}>
              <option value="pending">ยังไม่ตอบ</option>
              <option value="yes">มาแน่</option>
              <option value="no">ไม่มา</option>
            </select>
          )}
        </Field>

        <div className="sm:col-span-3 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            เพิ่มแขก
          </Button>
          {serverError ? (
            <span className="field-error">
              {serverError.message}
              {serverError.detail ? (
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer">รายละเอียด</summary>
                  <pre className="overflow-x-auto text-sm">{serverError.detail}</pre>
                </details>
              ) : null}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
```

- [ ] **Step 4: `app/guests/rsvp-select.tsx`**

```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import type { Rsvp } from '@/db/schema'
import { setRsvpAction } from './actions'

export function RsvpSelect({ id, rsvp, name }: { id: number; rsvp: Rsvp; name: string }) {
  const [optimisticRsvp, setOptimisticRsvp] = useOptimistic(rsvp)
  const [, startTransition] = useTransition()

  return (
    <select
      className="input"
      value={optimisticRsvp}
      aria-label={`สถานะตอบรับของ ${name}`}
      onChange={(event) => {
        const next = event.target.value as Rsvp
        startTransition(async () => {
          setOptimisticRsvp(next)
          await setRsvpAction({ id, rsvp: next })
        })
      }}
    >
      <option value="pending">ยังไม่ตอบ</option>
      <option value="yes">มาแน่</option>
      <option value="no">ไม่มา</option>
    </select>
  )
}
```

- [ ] **Step 5: `app/guests/guest-table.tsx` — ค้นหา/filter ฝั่ง client**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { DataTable } from '@/components/ui/data-table'
import type { Guest } from '@/db/schema'
import { countGuests } from '@/lib/totals'
import { deleteGuestAction } from './actions'
import { RsvpSelect } from './rsvp-select'

const COLUMNS = [
  { key: 'name', label: 'ชื่อ' },
  { key: 'side', label: 'ฝ่าย' },
  { key: 'group', label: 'กลุ่ม' },
  { key: 'estimated', label: 'ผู้ติดตาม (คาด)', numeric: true },
  { key: 'confirmed', label: 'ผู้ติดตาม (ยืนยัน)', numeric: true },
  { key: 'rsvp', label: 'ตอบรับ' },
  { key: 'actions', label: '' },
]

export function GuestTable({ guests }: { guests: Guest[] }) {
  const [keyword, setKeyword] = useState('')
  const [side, setSide] = useState('')
  const [group, setGroup] = useState('')
  const [rsvp, setRsvp] = useState('')

  const groups = useMemo(
    () => [...new Set(guests.map((guest) => guest.group).filter((g): g is string => g !== null))].sort(),
    [guests],
  )

  // 400 แถวกรองใน memory เร็วกว่ายิง query ใหม่ทุกครั้งที่พิมพ์
  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    return guests.filter((guest) => {
      if (side && guest.side !== side) return false
      if (group && guest.group !== group) return false
      if (rsvp && guest.rsvp !== rsvp) return false
      if (needle && !`${guest.name} ${guest.group ?? ''} ${guest.note ?? ''}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [guests, keyword, side, group, rsvp])

  const counts = countGuests(filtered)

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="input max-w-xs"
          type="search"
          placeholder="ค้นหาชื่อ"
          aria-label="ค้นหาชื่อแขก"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <select className="input max-w-40" aria-label="กรองตามฝ่าย" value={side} onChange={(e) => setSide(e.target.value)}>
          <option value="">ทุกฝ่าย</option>
          <option value="groom">เจ้าบ่าว</option>
          <option value="bride">เจ้าสาว</option>
        </select>
        <select className="input max-w-40" aria-label="กรองตามกลุ่ม" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">ทุกกลุ่ม</option>
          {groups.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select className="input max-w-40" aria-label="กรองตามการตอบรับ" value={rsvp} onChange={(e) => setRsvp(e.target.value)}>
          <option value="">ทุกสถานะ</option>
          <option value="pending">ยังไม่ตอบ</option>
          <option value="yes">มาแน่</option>
          <option value="no">ไม่มา</option>
        </select>
      </div>

      <p className="text-muted mb-2">
        แสดง {filtered.length} จาก {guests.length} ราย · ประมาณการ {counts.estimated} คน · ยืนยันแล้ว {counts.confirmed} คน
      </p>

      <DataTable
        caption="รายชื่อแขก"
        columns={COLUMNS}
        isEmpty={filtered.length === 0}
        emptyMessage={guests.length === 0 ? 'ยังไม่มีรายชื่อแขก' : 'ไม่พบแขกที่ตรงกับที่กรอง'}
      >
        {filtered.map((guest) => (
          <tr key={guest.id}>
            <td>{guest.name}</td>
            <td>{guest.side === 'groom' ? 'เจ้าบ่าว' : 'เจ้าสาว'}</td>
            <td>{guest.group ?? '—'}</td>
            <td className="num">{guest.companionsEstimated}</td>
            <td className="num">{guest.companionsConfirmed ?? 'ยังไม่ถาม'}</td>
            <td>
              <RsvpSelect id={guest.id} rsvp={guest.rsvp} name={guest.name} />
            </td>
            <td>
              <ConfirmButton
                question={`ลบ "${guest.name}" ? ลบแล้วกู้คืนไม่ได้`}
                onConfirm={() => deleteGuestAction({ id: guest.id })}
              >
                ลบ
              </ConfirmButton>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}
```

- [ ] **Step 6: `app/guests/page.tsx`**

```tsx
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { listGuests } from '@/db/queries'
import { countGuests } from '@/lib/totals'
import { GuestForm } from './guest-form'
import { GuestTable } from './guest-table'

export default async function GuestsPage() {
  const guests = await listGuests()
  const counts = countGuests(guests)

  return (
    <>
      <PageHeader title="แขก">
        <span>ประมาณการ {counts.estimated} คน</span>
        <span>ยืนยันแล้ว {counts.confirmed} คน</span>
        <span>ยังไม่ตอบ {counts.pending} ราย</span>
      </PageHeader>

      <GuestForm />

      <Card>
        <GuestTable guests={guests} />
      </Card>
    </>
  )
}
```

- [ ] **Step 7: ตรวจด้วยตา**

```bash
APP_ENV=development bun run dev
```
ที่ `/guests`:
1. เพิ่มแขก 3 คนติดกัน — หลังกดแต่ละครั้ง focus กลับไปช่องชื่อ และค่า "ฝ่าย" กับ "กลุ่ม" ยังคงค่าเดิมไว้
2. เว้นช่อง "ผู้ติดตามที่ยืนยันแล้ว" ว่าง → ตารางแสดง "ยังไม่ถาม" ไม่ใช่ 0
3. ใส่ 0 ในช่องเดียวกัน → ตารางแสดง 0 และตัวเลข "ยืนยันแล้ว" ต่างจากกรณีเว้นว่าง
4. พิมพ์ในช่องค้นหา / เปลี่ยน filter — ดู log ใน terminal ต้อง **ไม่มี query ใหม่วิ่ง**
5. เปลี่ยน RSVP ใน dropdown → เปลี่ยนทันที ไม่รอ round trip

- [ ] **Step 8: Commit**

```bash
bun run lint && bun test && bun run build
git add app/guests src/db/queries.ts src/db/mutations.ts
git commit -m "feat: add guests page with client-side filter and rsvp toggle"
```

---

### Task 13: โมดูล `/checklist`

**Files:**
- Create: `app/checklist/page.tsx`, `app/checklist/actions.ts`, `app/checklist/checklist-form.tsx`, `app/checklist/status-select.tsx`, `app/checklist/delete-checklist-button.tsx`
- Modify: `src/db/queries.ts`, `src/db/mutations.ts`

**Interfaces:**
- Consumes: `checklistInputSchema` `toggleChecklistStatusSchema` · `CHECKLIST_STATUS_ORDER` `checklistStatus` จาก `@/lib/ui`
- Produces:
  - `@/db/queries`: `loadChecklistPage(): Promise<{ items: ChecklistWithVendor[]; vendorOptions: VendorOption[] }>`
  - `@/db/mutations`: `createChecklistItem` `setChecklistStatus` `deleteChecklistItem`
  - `app/checklist/actions.ts`: `createChecklistItemAction` `setChecklistStatusAction` `deleteChecklistItemAction`

- [ ] **Step 1: เพิ่ม query และ mutation ของ checklist**

ต่อท้าย `src/db/queries.ts`:
```ts
import type { ChecklistStatus } from '@/db/schema'

export type ChecklistWithVendor = {
  id: number
  name: string
  category: string | null
  status: ChecklistStatus
  budget: number | null
  deadline: string | null
  depositPaid: boolean
  vendorId: number | null
  vendorName: string | null
  note: string | null
}

export async function loadChecklistPage(): Promise<{ items: ChecklistWithVendor[]; vendorOptions: VendorOption[] }> {
  await connection()

  const [items, vendorOptions] = await db.batch([
    db
      .select({
        id: checklistItems.id,
        name: checklistItems.name,
        category: checklistItems.category,
        status: checklistItems.status,
        budget: checklistItems.budget,
        deadline: checklistItems.deadline,
        depositPaid: checklistItems.depositPaid,
        vendorId: checklistItems.vendorId,
        vendorName: vendors.name,
        note: checklistItems.note,
      })
      .from(checklistItems)
      .leftJoin(vendors, eq(checklistItems.vendorId, vendors.id))
      .orderBy(asc(checklistItems.deadline), asc(checklistItems.id)),
    db.select({ id: vendors.id, name: vendors.name }).from(vendors).orderBy(asc(vendors.id)),
  ])

  return { items, vendorOptions }
}
```

ต่อท้าย `src/db/mutations.ts`:
```ts
import { checklistItems } from '@/db/schema'
import type { ChecklistStatus } from '@/db/schema'
import type { ChecklistValues } from '@/lib/schemas/checklist'

export async function createChecklistItem(values: ChecklistValues): Promise<void> {
  await db.insert(checklistItems).values(values)
}

export async function setChecklistStatus(id: number, status: ChecklistStatus): Promise<void> {
  await db.update(checklistItems).set({ status }).where(eq(checklistItems.id, id))
}

export async function deleteChecklistItem(id: number): Promise<void> {
  await db.delete(checklistItems).where(eq(checklistItems.id, id))
}
```

- [ ] **Step 2: `app/checklist/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createChecklistItem, deleteChecklistItem, setChecklistStatus } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { checklistInputSchema, toggleChecklistStatusSchema } from '@/lib/schemas/checklist'
import { idSchema } from '@/lib/schemas/shared'

function revalidate(): void {
  revalidatePath('/checklist')
  revalidatePath('/')
}

export async function createChecklistItemAction(raw: unknown): Promise<ActionResult> {
  try {
    const values = v.parse(checklistInputSchema, raw)
    await createChecklistItem(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function setChecklistStatusAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, status } = v.parse(toggleChecklistStatusSchema, raw)
    await setChecklistStatus(id, status)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteChecklistItemAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteChecklistItem(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}
```

- [ ] **Step 3: `app/checklist/checklist-form.tsx`**

```tsx
'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import type { VendorOption } from '@/db/queries'
import { checklistInputSchema } from '@/lib/schemas/checklist'
import { createChecklistItemAction } from './actions'

type FormInput = v.InferInput<typeof checklistInputSchema>
type FormOutput = v.InferOutput<typeof checklistInputSchema>

const EMPTY: FormInput = {
  name: '',
  category: '',
  status: 'not_started',
  budget: '',
  deadline: '',
  depositPaid: false,
  vendorId: '',
  note: '',
}

export function ChecklistForm({ vendorOptions }: { vendorOptions: VendorOption[] }) {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: valibotResolver(checklistInputSchema),
    defaultValues: EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await createChecklistItemAction(values)
    if (result.ok) {
      reset(EMPTY)
      setServerError(null)
      return
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
        <Field label="ชื่องาน" error={errors.name?.message}>
          {(props) => <input className="input" {...props} {...register('name')} />}
        </Field>

        <Field label="หมวด" error={errors.category?.message}>
          {(props) => <input className="input" {...props} {...register('category')} />}
        </Field>

        <Field label="สถานะ" error={errors.status?.message}>
          {(props) => (
            <select className="input" {...props} {...register('status')}>
              <option value="not_started">ยังไม่เริ่ม</option>
              <option value="in_progress">กำลังทำ</option>
              <option value="done">เสร็จแล้ว</option>
            </select>
          )}
        </Field>

        <Field label="งบที่ตั้งไว้ (บาท)" hint="ไม่ถูกนำไปบวกกับยอดค่าใช้จ่าย" error={errors.budget?.message}>
          {(props) => <input className="input" inputMode="numeric" {...props} {...register('budget')} />}
        </Field>

        <Field label="กำหนดส่ง" error={errors.deadline?.message}>
          {(props) => <input className="input" type="date" {...props} {...register('deadline')} />}
        </Field>

        <Field label="ผู้ให้บริการ" error={errors.vendorId?.message}>
          {(props) => (
            <select className="input" {...props} {...register('vendorId')}>
              <option value="">ยังไม่ระบุ</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('depositPaid')} />
          จ่ายมัดจำแล้ว
        </label>

        <Field label="หมายเหตุ" error={errors.note?.message}>
          {(props) => <input className="input" {...props} {...register('note')} />}
        </Field>

        <div className="sm:col-span-3 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            เพิ่มงาน
          </Button>
          {serverError ? (
            <span className="field-error">
              {serverError.message}
              {serverError.detail ? (
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer">รายละเอียด</summary>
                  <pre className="overflow-x-auto text-sm">{serverError.detail}</pre>
                </details>
              ) : null}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
```

- [ ] **Step 4: `app/checklist/status-select.tsx` และ `delete-checklist-button.tsx`**

`status-select.tsx`:
```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import type { ChecklistStatus } from '@/db/schema'
import { setChecklistStatusAction } from './actions'

export function StatusSelect({ id, status, name }: { id: number; status: ChecklistStatus; name: string }) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status)
  const [, startTransition] = useTransition()

  return (
    <select
      className="input"
      value={optimisticStatus}
      aria-label={`สถานะของ ${name}`}
      onChange={(event) => {
        const next = event.target.value as ChecklistStatus
        startTransition(async () => {
          setOptimisticStatus(next)
          await setChecklistStatusAction({ id, status: next })
        })
      }}
    >
      <option value="not_started">ยังไม่เริ่ม</option>
      <option value="in_progress">กำลังทำ</option>
      <option value="done">เสร็จแล้ว</option>
    </select>
  )
}
```

`delete-checklist-button.tsx`:
```tsx
'use client'

import { ConfirmButton } from '@/components/ui/confirm-button'
import { deleteChecklistItemAction } from './actions'

export function DeleteChecklistButton({ id, name }: { id: number; name: string }) {
  return (
    <ConfirmButton question={`ลบงาน "${name}" ? ลบแล้วกู้คืนไม่ได้`} onConfirm={() => deleteChecklistItemAction({ id })}>
      ลบ
    </ConfirmButton>
  )
}
```

- [ ] **Step 5: `app/checklist/page.tsx` — จัดกลุ่มตามสถานะ**

```tsx
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { type ChecklistWithVendor, loadChecklistPage } from '@/db/queries'
import { CHECKLIST_STATUS_ORDER, checklistStatus } from '@/lib/ui'
import { ChecklistForm } from './checklist-form'
import { DeleteChecklistButton } from './delete-checklist-button'
import { StatusSelect } from './status-select'

const COLUMNS = [
  { key: 'name', label: 'งาน' },
  { key: 'category', label: 'หมวด' },
  { key: 'vendor', label: 'ผู้ให้บริการ' },
  { key: 'deadline', label: 'กำหนดส่ง' },
  { key: 'budget', label: 'งบที่ตั้งไว้', numeric: true },
  { key: 'deposit', label: 'มัดจำ' },
  { key: 'status', label: 'สถานะ' },
  { key: 'actions', label: '' },
]

export default async function ChecklistPage() {
  const { items, vendorOptions } = await loadChecklistPage()

  const grouped = CHECKLIST_STATUS_ORDER.map((status) => ({
    status,
    label: checklistStatus(status).label,
    rows: items.filter((item: ChecklistWithVendor) => item.status === status),
  }))

  return (
    <>
      <PageHeader title="Checklist">
        <span>ทั้งหมด {items.length} งาน</span>
        {/* งบใน checklist คือ "เงินที่ตั้งไว้" ไม่ใช่เงินที่จ่ายจริง จึงไม่มียอดรวมที่นี่ */}
        <span className="text-sm">ยอดเงินจริงดูที่หน้าค่าใช้จ่าย</span>
      </PageHeader>

      <ChecklistForm vendorOptions={vendorOptions} />

      {grouped.map((group) => (
        <Card key={group.status} className="mb-4">
          <h2 className="font-semibold mb-2">
            {group.label} ({group.rows.length})
          </h2>
          <DataTable
            caption={`งานที่${group.label}`}
            columns={COLUMNS}
            isEmpty={group.rows.length === 0}
            emptyMessage={`ยังไม่มีงานที่${group.label}`}
          >
            {group.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.category ?? '—'}</td>
                <td>{row.vendorName ?? '—'}</td>
                <td>
                  <DateText value={row.deadline} />
                </td>
                <td className="num">
                  <Money value={row.budget} />
                </td>
                <td>{row.depositPaid ? 'จ่ายแล้ว' : '—'}</td>
                <td>
                  <StatusSelect id={row.id} status={row.status} name={row.name} />
                </td>
                <td>
                  <DeleteChecklistButton id={row.id} name={row.name} />
                </td>
              </tr>
            ))}
          </DataTable>
        </Card>
      ))}
    </>
  )
}
```

- [ ] **Step 6: ตรวจด้วยตา**

```bash
bun run dev
```
ที่ `/checklist`:
1. เพิ่มงานพร้อม deadline → ไปโผล่ในกลุ่ม "ยังไม่เริ่ม"
2. เปลี่ยนสถานะเป็น "เสร็จแล้ว" → ย้ายกลุ่มหลัง revalidate
3. กลับไปหน้าแรก → งานที่ยังไม่เสร็จและมี deadline โผล่ในกล่อง "งานค้างที่ใกล้กำหนด" เรียงจากใกล้ที่สุด
4. ใส่งบ 5,000 ในงานหนึ่ง → ยอด "ค้างจ่าย" บนหน้าแรก **ต้องไม่ขยับ** (งบ checklist ไม่ถูกนำไปบวก)

- [ ] **Step 7: Commit**

```bash
bun run lint && bun test && bun run build
git add app/checklist src/db/queries.ts src/db/mutations.ts
git commit -m "feat: add checklist page grouped by status"
```

---

### Task 14: โมดูล `/vendors`

**Files:**
- Create: `app/vendors/page.tsx`, `app/vendors/actions.ts`, `app/vendors/vendor-form.tsx`, `app/vendors/delete-vendor-button.tsx`
- Modify: `src/db/queries.ts`, `src/db/mutations.ts`

**Interfaces:**
- Consumes: `vendorInputSchema` · `summarizeByVendor` จาก `@/lib/totals`
- Produces:
  - `@/db/queries`: `loadVendorsPage(): Promise<{ vendorRows: Vendor[]; expenseRows: VendorExpenseRow[] }>` — JOIN ครั้งเดียว ห้ามวนหายอดทีละเจ้า
  - `@/db/mutations`: `createVendor(values: VendorValues)` `deleteVendor(id)`
  - `app/vendors/actions.ts`: `createVendorAction` `deleteVendorAction`

- [ ] **Step 1: เพิ่ม query และ mutation ของ vendor**

ต่อท้าย `src/db/queries.ts`:
```ts
import type { Vendor } from '@/db/schema'
import type { VendorExpenseRow } from '@/lib/totals'

/**
 * JOIN ครั้งเดียวแล้วรวมยอดใน JS — ห้ามวน query หายอดทีละเจ้า (N+1)
 * และไม่ใช้ GROUP BY เพราะตรรกะการเงินที่อยู่ใน SQL ทดสอบด้วย unit test ไม่ได้
 */
export async function loadVendorsPage(): Promise<{ vendorRows: Vendor[]; expenseRows: VendorExpenseRow[] }> {
  await connection()

  const joined = await db
    .select({
      vendor: vendors,
      amount: expenses.amount,
      isPaid: expenses.isPaid,
      expenseId: expenses.id,
    })
    .from(vendors)
    .leftJoin(expenses, eq(expenses.vendorId, vendors.id))
    .orderBy(asc(vendors.id), asc(expenses.id))

  const vendorMap = new Map<number, Vendor>()
  const expenseRows: VendorExpenseRow[] = []

  for (const row of joined) {
    vendorMap.set(row.vendor.id, row.vendor)
    // leftJoin ให้แถวที่ไม่มี expense กลับมาด้วย — แถวแบบนั้นไม่ใช่ค่าใช้จ่าย
    if (row.expenseId !== null) {
      expenseRows.push({ vendorId: row.vendor.id, amount: row.amount, isPaid: row.isPaid })
    }
  }

  return { vendorRows: [...vendorMap.values()], expenseRows }
}
```

ต่อท้าย `src/db/mutations.ts`:
```ts
import { vendors } from '@/db/schema'
import type { VendorValues } from '@/lib/schemas/vendor'

export async function createVendor(values: VendorValues): Promise<void> {
  await db.insert(vendors).values(values)
}

export async function deleteVendor(id: number): Promise<void> {
  await db.delete(vendors).where(eq(vendors.id, id))
}
```

- [ ] **Step 2: `app/vendors/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import * as v from 'valibot'
import { createVendor, deleteVendor } from '@/db/mutations'
import { type ActionResult, toActionResult } from '@/lib/action-result'
import { idSchema } from '@/lib/schemas/shared'
import { vendorInputSchema } from '@/lib/schemas/vendor'

function revalidate(): void {
  revalidatePath('/vendors')
  revalidatePath('/expenses')
  revalidatePath('/checklist')
  revalidatePath('/')
}

export async function createVendorAction(raw: unknown): Promise<ActionResult> {
  try {
    const values = v.parse(vendorInputSchema, raw)
    await createVendor(values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteVendorAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id } = v.parse(idSchema, raw)
    await deleteVendor(id)
    revalidate()
    return { ok: true }
  } catch (error) {
    // ลบ vendor ที่ยังมี expense ผูกอยู่จะติด FK — ข้อความจริงจาก Postgres โผล่ใน <details>
    return toActionResult(error)
  }
}
```

- [ ] **Step 3: `app/vendors/vendor-form.tsx`**

```tsx
'use client'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type * as v from 'valibot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { vendorInputSchema } from '@/lib/schemas/vendor'
import { createVendorAction } from './actions'

type FormInput = v.InferInput<typeof vendorInputSchema>
type FormOutput = v.InferOutput<typeof vendorInputSchema>

const EMPTY: FormInput = { name: '', role: '', phone: '', line: '', totalPrice: '', note: '' }

export function VendorForm() {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: valibotResolver(vendorInputSchema),
    defaultValues: EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await createVendorAction(values)
    if (result.ok) {
      reset(EMPTY)
      setServerError(null)
      return
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })

  return (
    <Card className="mb-6">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
        <Field label="ชื่อผู้ให้บริการ" error={errors.name?.message}>
          {(props) => <input className="input" {...props} {...register('name')} />}
        </Field>
        <Field label="หน้าที่" error={errors.role?.message}>
          {(props) => <input className="input" {...props} {...register('role')} />}
        </Field>
        <Field label="เบอร์โทร" error={errors.phone?.message}>
          {(props) => <input className="input" type="tel" {...props} {...register('phone')} />}
        </Field>
        <Field label="LINE" error={errors.line?.message}>
          {(props) => <input className="input" {...props} {...register('line')} />}
        </Field>
        <Field label="ราคาที่ตกลงไว้ (บาท)" error={errors.totalPrice?.message}>
          {(props) => <input className="input" inputMode="numeric" {...props} {...register('totalPrice')} />}
        </Field>
        <Field label="หมายเหตุ" error={errors.note?.message}>
          {(props) => <input className="input" {...props} {...register('note')} />}
        </Field>

        <div className="sm:col-span-3 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            เพิ่มผู้ให้บริการ
          </Button>
          {serverError ? (
            <span className="field-error">
              {serverError.message}
              {serverError.detail ? (
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer">รายละเอียด</summary>
                  <pre className="overflow-x-auto text-sm">{serverError.detail}</pre>
                </details>
              ) : null}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
```

- [ ] **Step 4: `app/vendors/delete-vendor-button.tsx`**

```tsx
'use client'

import { ConfirmButton } from '@/components/ui/confirm-button'
import { deleteVendorAction } from './actions'

export function DeleteVendorButton({ id, name }: { id: number; name: string }) {
  return (
    <ConfirmButton question={`ลบ "${name}" ? ลบแล้วกู้คืนไม่ได้`} onConfirm={() => deleteVendorAction({ id })}>
      ลบ
    </ConfirmButton>
  )
}
```

- [ ] **Step 5: `app/vendors/page.tsx`**

```tsx
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { loadVendorsPage } from '@/db/queries'
import { summarizeByVendor } from '@/lib/totals'
import { DeleteVendorButton } from './delete-vendor-button'
import { VendorForm } from './vendor-form'

const COLUMNS = [
  { key: 'name', label: 'ผู้ให้บริการ' },
  { key: 'role', label: 'หน้าที่' },
  { key: 'phone', label: 'เบอร์โทร' },
  { key: 'line', label: 'LINE' },
  { key: 'agreed', label: 'ราคาที่ตกลง', numeric: true },
  { key: 'paid', label: 'จ่ายแล้ว', numeric: true },
  { key: 'unpaid', label: 'ค้างจ่าย', numeric: true },
  { key: 'unknown', label: 'ยังไม่ระบุยอด', numeric: true },
  { key: 'actions', label: '' },
]

export default async function VendorsPage() {
  const { vendorRows, expenseRows } = await loadVendorsPage()
  const totals = summarizeByVendor(expenseRows)

  return (
    <>
      <PageHeader title="ผู้ให้บริการ">
        <span>{vendorRows.length} เจ้า</span>
      </PageHeader>

      <VendorForm />

      <Card>
        <DataTable
          caption="ผู้ให้บริการและยอดที่จ่ายให้แต่ละเจ้า"
          columns={COLUMNS}
          isEmpty={vendorRows.length === 0}
          emptyMessage="ยังไม่มีผู้ให้บริการ"
        >
          {vendorRows.map((vendor) => {
            const summary = totals.get(vendor.id)
            return (
              <tr key={vendor.id}>
                <td>{vendor.name}</td>
                <td>{vendor.role ?? '—'}</td>
                <td>{vendor.phone ? <a href={`tel:${vendor.phone}`}>{vendor.phone}</a> : '—'}</td>
                <td>{vendor.line ?? '—'}</td>
                <td className="num">
                  <Money value={vendor.totalPrice} />
                </td>
                <td className="num">
                  <Money value={summary?.paid ?? 0} />
                </td>
                <td className="num">
                  <Money value={summary?.unpaid ?? 0} />
                </td>
                <td className="num">{summary?.unknownCount ?? 0}</td>
                <td>
                  <DeleteVendorButton id={vendor.id} name={vendor.name} />
                </td>
              </tr>
            )
          })}
        </DataTable>
      </Card>
    </>
  )
}
```

- [ ] **Step 6: ตรวจด้วยตา — ต้องยิง query เดียว**

```bash
APP_ENV=development bun run dev
```
ที่ `/vendors`:
1. เห็น 8 เจ้าจาก seed · APN Organize รวม 79,000 · สโมสรร่วมเริงไชย 20,800 · โต๊ะจีน 70,000 ตรงกับตารางในสเปคข้อ 7
2. ร้านของชำร่วยขึ้น "ยังไม่ระบุยอด 1 รายการ" · วงดนตรีขึ้น 2 รายการ (ตามที่ปล่อยเป็น null)
3. ร้านชุด (id 8) ไม่มี expense ผูก — ยอดเป็น 0 ทุกช่องและหน้าไม่พัง
4. **ใน terminal log ต้องมี SQL ของหน้านี้แค่คำสั่งเดียว** ถ้าเห็น SELECT วิ่งหลายรอบตามจำนวน vendor แปลว่ากลายเป็น N+1 ให้หยุดแก้ก่อน
5. เพิ่ม vendor ใหม่ → id ต้องไม่ชนกับ 1–8 (ถ้าชนแปลว่า `setval` ตอน seed ไม่ได้ทำงาน)

- [ ] **Step 7: Commit**

```bash
bun run lint && bun test && bun run build
git add app/vendors src/db/queries.ts src/db/mutations.ts
git commit -m "feat: add vendors page with per-vendor totals from a single join"
```

---

### Task 15: แก้ไขรายการในตาราง — `/expenses` และ `/vendors`

ทำไมต้องมี: สเปคข้อ 7 บอกว่า 6 รายการยังไม่รู้ยอด · 12 รายการเรื่องชุด/พรีเวดดิ้งยังไม่ผูก vendor · ชื่อ/เบอร์/LINE ของ vendor 3–8 เว้นว่างไว้ให้เจ้าของงานเติมเอง ทั้งสามอย่างนี้ต้องแก้ได้ในเว็บ ไม่งั้นข้อมูลที่ตั้งใจปล่อยว่างไว้จะเติมไม่ได้เลย

**Files:**
- Modify: `app/expenses/expense-form.tsx`, `app/expenses/page.tsx`, `app/vendors/vendor-form.tsx`, `app/vendors/page.tsx`, `app/vendors/actions.ts`, `src/db/mutations.ts`
- Create: `app/expenses/expense-row.tsx`, `app/vendors/vendor-row.tsx`

**Interfaces:**
- Consumes: `updateExpenseAction` (มีแล้วจาก Task 9) · `expenseInputSchema` `vendorInputSchema` · `ExpenseWithVendor` `Vendor`
- Produces:
  - `app/expenses/expense-form.tsx`: `ExpenseForm({ vendorOptions, initial?, onDone? })` · `toExpenseFormValues(row: ExpenseWithVendor): ExpenseFormInitial`
  - `app/expenses/expense-row.tsx`: `ExpenseRow({ row, vendorOptions, columnCount })`
  - `@/db/mutations`: `updateVendor(id: number, values: VendorValues)`
  - `app/vendors/actions.ts`: `updateVendorAction(raw): Promise<ActionResult>`
  - `app/vendors/vendor-form.tsx`: `VendorForm({ initial?, onDone? })` · `toVendorFormValues(vendor: Vendor): VendorFormInitial`
  - `app/vendors/vendor-row.tsx`: `VendorRow({ vendor, summary, columnCount })`

- [ ] **Step 1: ให้ `ExpenseForm` รับค่าเริ่มต้นเพื่อใช้แก้ไขได้ด้วย**

แก้ `app/expenses/expense-form.tsx` — เพิ่ม import `updateExpenseAction`, เพิ่ม type และแทนที่ signature กับ `onSubmit` ด้วยของใหม่ทั้งก้อน:

```tsx
import { createExpenseAction, updateExpenseAction } from './actions'
import type { ExpenseWithVendor } from '@/db/queries'

export type ExpenseFormInitial = FormInput & { id: number }

/** DB row → ค่าในฟอร์ม (ทุกช่องเป็นสตริง เพราะ schema เป็น transform string → number) */
export function toExpenseFormValues(row: ExpenseWithVendor): ExpenseFormInitial {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? '',
    amount: row.amount === null ? '' : String(row.amount),
    isPaid: row.isPaid,
    vendorId: row.vendorId === null ? '' : String(row.vendorId),
    dueDate: row.dueDate ?? '',
    note: row.note ?? '',
  }
}

export function ExpenseForm({
  vendorOptions,
  initial,
  onDone,
}: {
  vendorOptions: VendorOption[]
  initial?: ExpenseFormInitial
  onDone?: () => void
}) {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: valibotResolver(expenseInputSchema),
    defaultValues: initial ?? EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = initial ? await updateExpenseAction({ id: initial.id, ...values }) : await createExpenseAction(values)

    if (result.ok) {
      setServerError(null)
      if (initial) onDone?.()
      else reset(EMPTY)
      return
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })
```

และแทนที่แถวปุ่มท้ายฟอร์มด้วย:
```tsx
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {initial ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
          </Button>
          {initial ? (
            <Button variant="ghost" onClick={() => onDone?.()}>
              ยกเลิก
            </Button>
          ) : null}
          {serverError ? (
            <span className="field-error">
              {serverError.message}
              {serverError.detail ? (
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer">รายละเอียด</summary>
                  <pre className="overflow-x-auto text-sm">{serverError.detail}</pre>
                </details>
              ) : null}
            </span>
          ) : null}
        </div>
```

- [ ] **Step 2: `app/expenses/expense-row.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import type { ExpenseWithVendor, VendorOption } from '@/db/queries'
import { paidStatus } from '@/lib/ui'
import { DeleteExpenseButton } from './delete-expense-button'
import { ExpenseForm, toExpenseFormValues } from './expense-form'
import { PaidToggle } from './paid-toggle'

/** กางฟอร์มเป็น <tr> เต็มความกว้างใต้แถวเดิม ไม่ใช้ modal — ตารางยังเป็นตารางจริง */
export function ExpenseRow({
  row,
  vendorOptions,
  columnCount,
}: {
  row: ExpenseWithVendor
  vendorOptions: VendorOption[]
  columnCount: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const status = paidStatus(row.amount, row.isPaid)

  return (
    <>
      <tr>
        <td>
          <PaidToggle id={row.id} isPaid={row.isPaid} label={row.name} />
        </td>
        <td>{row.name}</td>
        <td>{row.category ?? '—'}</td>
        <td>{row.vendorName ?? '—'}</td>
        <td>
          <DateText value={row.dueDate} />
        </td>
        <td className="num">
          <Money value={row.amount} />
        </td>
        <td>
          <Badge status={status.key}>{status.label}</Badge>
        </td>
        <td className="flex gap-2">
          <Button variant="ghost" aria-expanded={isEditing} onClick={() => setIsEditing((open) => !open)}>
            แก้ไข
          </Button>
          <DeleteExpenseButton id={row.id} name={row.name} />
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <ExpenseForm
              vendorOptions={vendorOptions}
              initial={toExpenseFormValues(row)}
              onDone={() => setIsEditing(false)}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}
```

- [ ] **Step 3: ให้ `app/expenses/page.tsx` ใช้ `<ExpenseRow>`**

แทนที่ `{rows.map(...)}` ในตารางแรกทั้งก้อนด้วย:
```tsx
          {rows.map((row) => (
            <ExpenseRow key={row.id} row={row} vendorOptions={vendorOptions} columnCount={COLUMNS.length} />
          ))}
```
แล้วลบ import ของ `Badge` `DateText` `PaidToggle` `DeleteExpenseButton` `paidStatus` ที่ไม่ได้ใช้ในหน้านี้แล้วออก (Biome จะฟ้องถ้าลืม) และเพิ่ม `import { ExpenseRow } from './expense-row'`

- [ ] **Step 4: เพิ่ม `updateVendor` + `updateVendorAction`**

ต่อท้าย `src/db/mutations.ts`:
```ts
export async function updateVendor(id: number, values: VendorValues): Promise<void> {
  await db.update(vendors).set(values).where(eq(vendors.id, id))
}
```

ต่อท้าย `app/vendors/actions.ts` (และเพิ่ม `updateVendor` เข้าไปใน import จาก `@/db/mutations` กับ `vendorUpdateSchema` จาก `@/lib/schemas/vendor`):
```ts
export async function updateVendorAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, ...values } = v.parse(vendorUpdateSchema, raw)
    await updateVendor(id, values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}
```

- [ ] **Step 5: ให้ `VendorForm` รับค่าเริ่มต้น**

แก้ `app/vendors/vendor-form.tsx` เหมือนที่ทำกับ `ExpenseForm`:
```tsx
import type { Vendor } from '@/db/schema'
import { createVendorAction, updateVendorAction } from './actions'

export type VendorFormInitial = FormInput & { id: number }

export function toVendorFormValues(vendor: Vendor): VendorFormInitial {
  return {
    id: vendor.id,
    name: vendor.name,
    role: vendor.role ?? '',
    phone: vendor.phone ?? '',
    line: vendor.line ?? '',
    totalPrice: vendor.totalPrice === null ? '' : String(vendor.totalPrice),
    note: vendor.note ?? '',
  }
}

export function VendorForm({ initial, onDone }: { initial?: VendorFormInitial; onDone?: () => void }) {
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: valibotResolver(vendorInputSchema),
    defaultValues: initial ?? EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = initial ? await updateVendorAction({ id: initial.id, ...values }) : await createVendorAction(values)

    if (result.ok) {
      setServerError(null)
      if (initial) onDone?.()
      else reset(EMPTY)
      return
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })
```

และแถวปุ่มท้ายฟอร์ม:
```tsx
        <div className="sm:col-span-3 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {initial ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ให้บริการ'}
          </Button>
          {initial ? (
            <Button variant="ghost" onClick={() => onDone?.()}>
              ยกเลิก
            </Button>
          ) : null}
          {serverError ? (
            <span className="field-error">
              {serverError.message}
              {serverError.detail ? (
                <details className="inline-block ml-2">
                  <summary className="cursor-pointer">รายละเอียด</summary>
                  <pre className="overflow-x-auto text-sm">{serverError.detail}</pre>
                </details>
              ) : null}
            </span>
          ) : null}
        </div>
```

- [ ] **Step 6: `app/vendors/vendor-row.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import type { Vendor } from '@/db/schema'
import type { VendorSummary } from '@/lib/totals'
import { DeleteVendorButton } from './delete-vendor-button'
import { VendorForm, toVendorFormValues } from './vendor-form'

export function VendorRow({
  vendor,
  summary,
  columnCount,
}: {
  vendor: Vendor
  summary: VendorSummary | undefined
  columnCount: number
}) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <tr>
        <td>{vendor.name}</td>
        <td>{vendor.role ?? '—'}</td>
        <td>{vendor.phone ? <a href={`tel:${vendor.phone}`}>{vendor.phone}</a> : '—'}</td>
        <td>{vendor.line ?? '—'}</td>
        <td className="num">
          <Money value={vendor.totalPrice} />
        </td>
        <td className="num">
          <Money value={summary?.paid ?? 0} />
        </td>
        <td className="num">
          <Money value={summary?.unpaid ?? 0} />
        </td>
        <td className="num">{summary?.unknownCount ?? 0}</td>
        <td className="flex gap-2">
          <Button variant="ghost" aria-expanded={isEditing} onClick={() => setIsEditing((open) => !open)}>
            แก้ไข
          </Button>
          <DeleteVendorButton id={vendor.id} name={vendor.name} />
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <VendorForm initial={toVendorFormValues(vendor)} onDone={() => setIsEditing(false)} />
          </td>
        </tr>
      ) : null}
    </>
  )
}
```

- [ ] **Step 7: ให้ `app/vendors/page.tsx` ใช้ `<VendorRow>`**

แทนที่ `{vendorRows.map(...)}` ทั้งก้อนด้วย:
```tsx
          {vendorRows.map((vendor) => (
            <VendorRow
              key={vendor.id}
              vendor={vendor}
              summary={totals.get(vendor.id)}
              columnCount={COLUMNS.length}
            />
          ))}
```
แล้วลบ import ที่ไม่ได้ใช้แล้ว (`Money`, `DeleteVendorButton`) และเพิ่ม `import { VendorRow } from './vendor-row'`

- [ ] **Step 8: ตรวจด้วยตา — เติมข้อมูลที่ seed เว้นไว้ให้ครบ**

```bash
bun run dev
```
1. ที่ `/expenses` กด "แก้ไข" ที่รายการ "เครื่องดื่ม" → ใส่ยอด `8,000` → บันทึก → แถวแสดง 8,000 และตัวนับ "ยังไม่ระบุยอด" ลดจาก 6 เหลือ 5
2. กด "แก้ไข" ที่รายการเรื่องชุด → เลือก vendor → บันทึก → คอลัมน์ผู้ให้บริการขึ้นชื่อร้าน และยอดไปโผล่ที่หน้า `/vendors` ของเจ้านั้น
3. กด "ยกเลิก" → ฟอร์มปิดโดยไม่บันทึก
4. ที่ `/vendors` กด "แก้ไข" ที่ "ช่างภาพวันงาน" → ใส่เบอร์และ LINE → บันทึก → เบอร์กลายเป็นลิงก์ `tel:`
5. แก้ไขแล้วใส่ยอดผิดรูป (`เจ็ดหมื่น`) → error ขึ้นใต้ช่อง ฟอร์มไม่ปิด ข้อมูลที่พิมพ์ยังอยู่

- [ ] **Step 9: Commit**

```bash
bun run lint && bun test && bun run build
git add app/expenses app/vendors src/db/mutations.ts
git commit -m "feat: edit expenses and vendors inline"
```

---

### Task 16: แก้ไขรายการในตาราง — `/envelopes` · `/guests` · `/checklist`

**Files:**
- Modify: `src/db/mutations.ts`, `app/envelopes/actions.ts`, `app/envelopes/envelope-form.tsx`, `app/envelopes/page.tsx`, `app/guests/actions.ts`, `app/guests/guest-form.tsx`, `app/guests/guest-table.tsx`, `app/checklist/actions.ts`, `app/checklist/checklist-form.tsx`, `app/checklist/page.tsx`
- Create: `app/envelopes/envelope-row.tsx`, `app/guests/guest-row.tsx`, `app/checklist/checklist-row.tsx`

**Interfaces:**
- Consumes: `envelopeUpdateSchema` `guestUpdateSchema` `checklistUpdateSchema` (มีแล้วจาก Task 6)
- Produces:
  - `@/db/mutations`: `updateEnvelope(id, values)` `updateGuest(id, values)` `updateChecklistItem(id, values)`
  - action: `updateEnvelopeAction` `updateGuestAction` `updateChecklistItemAction`
  - form: `EnvelopeForm({ today, initial?, onDone? })` · `GuestForm({ initial?, onDone? })` · `ChecklistForm({ vendorOptions, initial?, onDone? })` พร้อม `toEnvelopeFormValues` `toGuestFormValues` `toChecklistFormValues`
  - row: `EnvelopeRow` `GuestRow` `ChecklistRow`

- [ ] **Step 1: เพิ่ม mutation ทั้งสามตัว**

ต่อท้าย `src/db/mutations.ts`:
```ts
import type { EnvelopeValues } from '@/lib/schemas/envelope'

export async function updateEnvelope(id: number, values: EnvelopeValues): Promise<void> {
  await db.update(envelopes).set(values).where(eq(envelopes.id, id))
}

export async function updateGuest(id: number, values: GuestValues): Promise<void> {
  await db.update(guests).set(values).where(eq(guests.id, id))
}

export async function updateChecklistItem(id: number, values: ChecklistValues): Promise<void> {
  await db.update(checklistItems).set(values).where(eq(checklistItems.id, id))
}
```

- [ ] **Step 2: เพิ่ม action ทั้งสามตัว**

ต่อท้าย `app/envelopes/actions.ts`:
```ts
export async function updateEnvelopeAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, ...values } = v.parse(envelopeUpdateSchema, raw)
    await updateEnvelope(id, values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}
```

ต่อท้าย `app/guests/actions.ts`:
```ts
export async function updateGuestAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, ...values } = v.parse(guestUpdateSchema, raw)
    await updateGuest(id, values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}
```

ต่อท้าย `app/checklist/actions.ts`:
```ts
export async function updateChecklistItemAction(raw: unknown): Promise<ActionResult> {
  try {
    const { id, ...values } = v.parse(checklistUpdateSchema, raw)
    await updateChecklistItem(id, values)
    revalidate()
    return { ok: true }
  } catch (error) {
    return toActionResult(error)
  }
}
```
(อย่าลืมเพิ่มชื่อ mutation และ schema ที่ใช้เข้าไปใน import ด้านบนของแต่ละไฟล์)

- [ ] **Step 3: ให้ทั้งสามฟอร์มรับค่าเริ่มต้น**

`app/envelopes/envelope-form.tsx` — เพิ่ม:
```tsx
import type { Envelope } from '@/db/schema'
import { createEnvelopeAction, updateEnvelopeAction } from './actions'

export type EnvelopeFormInitial = FormInput & { id: number }

export function toEnvelopeFormValues(row: Envelope): EnvelopeFormInitial {
  return {
    id: row.id,
    giverName: row.giverName ?? '',
    amount: String(row.amount),
    receivedAt: row.receivedAt,
    note: row.note ?? '',
  }
}
```
เปลี่ยน signature เป็น `export function EnvelopeForm({ today, initial, onDone }: { today: string; initial?: EnvelopeFormInitial; onDone?: () => void })`, ตั้ง `defaultValues: initial ?? { giverName: '', amount: '', receivedAt: today, note: '' }` และเปลี่ยน `onSubmit` เป็น:
```tsx
  const onSubmit = handleSubmit(async (values) => {
    const result = initial ? await updateEnvelopeAction({ id: initial.id, ...values }) : await createEnvelopeAction(values)

    if (result.ok) {
      setServerError(null)
      if (initial) {
        onDone?.()
        return
      }
      reset({ giverName: '', amount: '', receivedAt: getValues('receivedAt'), note: '' })
      firstFieldRef.current?.focus()
      return
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })
```
และปุ่ม submit เป็น `{initial ? 'บันทึกการแก้ไข' : 'บันทึกซอง'}` พร้อมปุ่ม "ยกเลิก" แบบเดียวกับ Task 15 Step 1

`app/guests/guest-form.tsx` — เพิ่ม:
```tsx
import type { Guest } from '@/db/schema'
import { createGuestAction, updateGuestAction } from './actions'

export type GuestFormInitial = FormInput & { id: number }

export function toGuestFormValues(guest: Guest): GuestFormInitial {
  return {
    id: guest.id,
    name: guest.name,
    side: guest.side,
    group: guest.group ?? '',
    companionsEstimated: String(guest.companionsEstimated),
    // null = ยังไม่ได้ถาม จึงต้องกลับไปเป็นช่องว่าง ไม่ใช่ '0'
    companionsConfirmed: guest.companionsConfirmed === null ? '' : String(guest.companionsConfirmed),
    rsvp: guest.rsvp,
    note: guest.note ?? '',
  }
}
```
เปลี่ยน signature เป็น `export function GuestForm({ initial, onDone }: { initial?: GuestFormInitial; onDone?: () => void })`, `defaultValues: initial ?? BLANK` และ `onSubmit` เป็น:
```tsx
  const onSubmit = handleSubmit(async (values) => {
    const result = initial ? await updateGuestAction({ id: initial.id, ...values }) : await createGuestAction(values)

    if (result.ok) {
      setServerError(null)
      if (initial) {
        onDone?.()
        return
      }
      reset({ ...BLANK, side: getValues('side'), group: getValues('group') })
      nameRef.current?.focus()
      return
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })
```
ปุ่ม submit เป็น `{initial ? 'บันทึกการแก้ไข' : 'เพิ่มแขก'}` พร้อมปุ่ม "ยกเลิก"

`app/checklist/checklist-form.tsx` — เพิ่ม:
```tsx
import type { ChecklistWithVendor } from '@/db/queries'
import { createChecklistItemAction, updateChecklistItemAction } from './actions'

export type ChecklistFormInitial = FormInput & { id: number }

export function toChecklistFormValues(row: ChecklistWithVendor): ChecklistFormInitial {
  return {
    id: row.id,
    name: row.name,
    category: row.category ?? '',
    status: row.status,
    budget: row.budget === null ? '' : String(row.budget),
    deadline: row.deadline ?? '',
    depositPaid: row.depositPaid,
    vendorId: row.vendorId === null ? '' : String(row.vendorId),
    note: row.note ?? '',
  }
}
```
เปลี่ยน signature เป็น `export function ChecklistForm({ vendorOptions, initial, onDone }: { vendorOptions: VendorOption[]; initial?: ChecklistFormInitial; onDone?: () => void })`, `defaultValues: initial ?? EMPTY` และ `onSubmit` เป็น:
```tsx
  const onSubmit = handleSubmit(async (values) => {
    const result = initial
      ? await updateChecklistItemAction({ id: initial.id, ...values })
      : await createChecklistItemAction(values)

    if (result.ok) {
      setServerError(null)
      if (initial) onDone?.()
      else reset(EMPTY)
      return
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof FormInput, { message })
    }
    setServerError({ message: result.message, detail: result.detail })
  })
```
ปุ่ม submit เป็น `{initial ? 'บันทึกการแก้ไข' : 'เพิ่มงาน'}` พร้อมปุ่ม "ยกเลิก"

- [ ] **Step 4: `app/envelopes/envelope-row.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import type { Envelope } from '@/db/schema'
import { DeleteEnvelopeButton } from './delete-envelope-button'
import { EnvelopeForm, toEnvelopeFormValues } from './envelope-form'

export function EnvelopeRow({ row, columnCount }: { row: Envelope; columnCount: number }) {
  const [isEditing, setIsEditing] = useState(false)
  const label = row.giverName ?? 'ไม่ระบุชื่อ'

  return (
    <>
      <tr>
        <td>{label}</td>
        <td>
          <DateText value={row.receivedAt} />
        </td>
        <td>{row.note ?? '—'}</td>
        <td className="num">
          <Money value={row.amount} />
        </td>
        <td className="flex gap-2">
          <Button variant="ghost" aria-expanded={isEditing} onClick={() => setIsEditing((open) => !open)}>
            แก้ไข
          </Button>
          <DeleteEnvelopeButton id={row.id} label={label} />
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <EnvelopeForm
              today={row.receivedAt}
              initial={toEnvelopeFormValues(row)}
              onDone={() => setIsEditing(false)}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}
```

แล้วใน `app/envelopes/page.tsx` แทนที่ `{rows.map(...)}` ด้วย:
```tsx
          {rows.map((row) => (
            <EnvelopeRow key={row.id} row={row} columnCount={5} />
          ))}
```

- [ ] **Step 5: `app/guests/guest-row.tsx` และให้ `GuestTable` ใช้**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmButton } from '@/components/ui/confirm-button'
import type { Guest } from '@/db/schema'
import { deleteGuestAction } from './actions'
import { GuestForm, toGuestFormValues } from './guest-form'
import { RsvpSelect } from './rsvp-select'

export function GuestRow({ guest, columnCount }: { guest: Guest; columnCount: number }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <tr>
        <td>{guest.name}</td>
        <td>{guest.side === 'groom' ? 'เจ้าบ่าว' : 'เจ้าสาว'}</td>
        <td>{guest.group ?? '—'}</td>
        <td className="num">{guest.companionsEstimated}</td>
        <td className="num">{guest.companionsConfirmed ?? 'ยังไม่ถาม'}</td>
        <td>
          <RsvpSelect id={guest.id} rsvp={guest.rsvp} name={guest.name} />
        </td>
        <td className="flex gap-2">
          <Button variant="ghost" aria-expanded={isEditing} onClick={() => setIsEditing((open) => !open)}>
            แก้ไข
          </Button>
          <ConfirmButton
            question={`ลบ "${guest.name}" ? ลบแล้วกู้คืนไม่ได้`}
            onConfirm={() => deleteGuestAction({ id: guest.id })}
          >
            ลบ
          </ConfirmButton>
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <GuestForm initial={toGuestFormValues(guest)} onDone={() => setIsEditing(false)} />
          </td>
        </tr>
      ) : null}
    </>
  )
}
```

ใน `app/guests/guest-table.tsx` แทนที่ `{filtered.map(...)}` ด้วย:
```tsx
        {filtered.map((guest) => (
          <GuestRow key={guest.id} guest={guest} columnCount={COLUMNS.length} />
        ))}
```
แล้วลบ import `ConfirmButton` `RsvpSelect` `deleteGuestAction` ที่ไม่ได้ใช้แล้ว และเพิ่ม `import { GuestRow } from './guest-row'`

- [ ] **Step 6: `app/checklist/checklist-row.tsx` และให้หน้า checklist ใช้**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import type { ChecklistWithVendor, VendorOption } from '@/db/queries'
import { ChecklistForm, toChecklistFormValues } from './checklist-form'
import { DeleteChecklistButton } from './delete-checklist-button'
import { StatusSelect } from './status-select'

export function ChecklistRow({
  row,
  vendorOptions,
  columnCount,
}: {
  row: ChecklistWithVendor
  vendorOptions: VendorOption[]
  columnCount: number
}) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <tr>
        <td>{row.name}</td>
        <td>{row.category ?? '—'}</td>
        <td>{row.vendorName ?? '—'}</td>
        <td>
          <DateText value={row.deadline} />
        </td>
        <td className="num">
          <Money value={row.budget} />
        </td>
        <td>{row.depositPaid ? 'จ่ายแล้ว' : '—'}</td>
        <td>
          <StatusSelect id={row.id} status={row.status} name={row.name} />
        </td>
        <td className="flex gap-2">
          <Button variant="ghost" aria-expanded={isEditing} onClick={() => setIsEditing((open) => !open)}>
            แก้ไข
          </Button>
          <DeleteChecklistButton id={row.id} name={row.name} />
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <ChecklistForm
              vendorOptions={vendorOptions}
              initial={toChecklistFormValues(row)}
              onDone={() => setIsEditing(false)}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}
```

ใน `app/checklist/page.tsx` แทนที่ `{group.rows.map(...)}` ด้วย:
```tsx
            {group.rows.map((row) => (
              <ChecklistRow key={row.id} row={row} vendorOptions={vendorOptions} columnCount={COLUMNS.length} />
            ))}
```
แล้วลบ import ที่ไม่ได้ใช้แล้ว (`DateText` `Money` `StatusSelect` `DeleteChecklistButton`) และเพิ่ม `import { ChecklistRow } from './checklist-row'`

- [ ] **Step 7: ตรวจด้วยตาทั้งสามหน้า**

```bash
bun run dev
```
1. `/envelopes` — แก้ยอดซองที่กรอกผิด → ยอดรวมด้านบนและ "สุทธิ" หน้าแรกขยับตาม
2. `/guests` — แก้ "ผู้ติดตามที่ยืนยันแล้ว" จากว่างเป็น `0` → ตารางเปลี่ยนจาก "ยังไม่ถาม" เป็น `0` และตัวเลข "ยืนยันแล้ว" ลดลง 1 (นี่คือความต่างที่สเปคตั้งใจให้เก็บ)
3. `/guests` — กรองอยู่แล้วกดแก้ไข → ฟอร์มกางใต้แถวนั้น และหลังบันทึกยังอยู่ในผลกรองเดิม
4. `/checklist` — แก้ deadline → งานย้ายลำดับตามกำหนดใหม่ และกล่องหน้าแรกอัปเดตตาม
5. ทุกหน้า: กด "ยกเลิก" แล้วฟอร์มปิดโดยไม่บันทึก

- [ ] **Step 8: Commit**

```bash
bun run lint && bun test && bun run build
git add app src/db/mutations.ts
git commit -m "feat: edit envelopes, guests and checklist items inline"
```

---

### Task 17: ตรวจรับทั้งระบบและปิดงาน v1

**Files:**
- Modify: `README.md`, `.env.example`
- Delete: `.env.test` (ถ้ามี — สเปคข้อ 9 บอกว่าไม่ถูกใช้)

**Interfaces:**
- Consumes: ทุก task ก่อนหน้า
- Produces: repo ที่ `bun run lint && bun test && bun run build` เขียวทั้งหมด และ README ที่บอกวิธี deploy

- [ ] **Step 1: รันชุดตรวจทั้งหมด**

```bash
bun run lint
bun test
bun run build
```
Expected: PASS ทั้งสามคำสั่ง — ถ้ามีอันไหนแดง แก้ให้เขียวก่อนไปต่อ

- [ ] **Step 2: ยืนยันว่าไม่มีหน้าไหนถูก prerender**

```bash
bun run build | grep -E '^[│├└]?\s*[○ƒ]'
```
Expected: ทั้ง 6 route (`/`, `/expenses`, `/envelopes`, `/guests`, `/checklist`, `/vendors`) เป็น dynamic (`ƒ`) ไม่มีอันไหนเป็น static (`○`)

- [ ] **Step 3: ยืนยันกฎแยกชั้น read/write ด้วยการทดลองละเมิด**

```bash
# ใส่ import ต้องห้ามชั่วคราวในทุกหน้า แล้วต้องแดงทุกอัน
for page in app/page.tsx app/expenses/page.tsx app/envelopes/page.tsx app/guests/page.tsx app/checklist/page.tsx app/vendors/page.tsx; do
  cp "$page" "$page.bak"
  printf "import { deleteExpense } from '@/db/mutations'\n%s" "$(cat "$page")" > "$page"
done
bun run lint
for page in app/page.tsx app/expenses/page.tsx app/envelopes/page.tsx app/guests/page.tsx app/checklist/page.tsx app/vendors/page.tsx; do
  mv "$page.bak" "$page"
done
bun run lint
```
Expected: รอบแรก Biome รายงาน `noRestrictedImports` **ครบทั้ง 6 ไฟล์** · รอบสองเขียว
ถ้าไฟล์ไหนไม่โดนรายงาน แปลว่า glob ใน `biome.json` ครอบไม่ถึง ต้องแก้ก่อนปิดงาน

ต่อด้วยการตรวจอีกครึ่งของกฎ — `'use client'` ในหน้า/layout ซึ่ง `noRestrictedImports` จับไม่ได้
(มันดูได้แค่ import specifier):

```bash
grep -rn "'use client'" app/**/page.tsx app/**/layout.tsx app/page.tsx app/layout.tsx
```
Expected: ไม่เจอสักบรรทัด (`grep` คืน exit 1) — ถ้าเจอ แปลว่ามีหน้าที่กลายเป็น client component
ต้องย้ายส่วนที่โต้ตอบออกไปเป็น leaf component ก่อนปิดงาน

- [ ] **Step 4: ไล่เช็ค semantic HTML ตามสเปคข้อ 11**

เปิดแต่ละหน้าแล้วดู DOM (devtools) — ต้องเป็นจริงทุกข้อ:
- ทุกตารางเป็น `<table>` จริง มี `<caption>` และ `<th scope="col">`
- เงินทุกจุดอยู่ใน `<data value="...">` (ค้นด้วย devtools: `document.querySelectorAll('data').length > 0`)
- วันที่ทุกจุดอยู่ใน `<time dateTime="2026-11-28">`
- คลิกที่ label ของทุกฟอร์มแล้ว focus เข้าช่องนั้น
- ทุก badge มีข้อความ ไม่ได้สื่อด้วยสีอย่างเดียว
- แต่ละหน้ามี `<h1>` เดียว · มี `<nav>` และ `<main>` · `<html lang="th">`
- กด Tab ไล่ทั้งหน้าได้โดยไม่ติด และ toggle "จ่ายแล้ว" กดด้วย Space ได้

- [ ] **Step 5: ทดสอบทางที่ผิดพลาด**

1. ตั้ง `DATABASE_URL=` ว่างแล้วรัน `bun run dev` → ต้องล้มทันทีพร้อมข้อความที่บอกว่าต้องตั้งค่าอะไร ไม่ใช่ error ตอน query แรก
2. ตั้ง `DATABASE_URL` เป็น host ที่ไม่มีจริง แล้วเปิดเว็บ → ต้องเห็นหน้า "โหลดข้อมูลไม่ได้" พร้อมปุ่ม "ลองใหม่" ไม่ใช่ stack trace เต็มจอ
3. เปิด `/ไม่มีหน้านี้` → เห็น 404 ของเราเอง
4. ลบ vendor ที่ยังมี expense ผูกอยู่ → เห็นข้อความ "บันทึกไม่สำเร็จ" และกางดู `<details>` แล้วเจอข้อความ FK จริงจาก Postgres

- [ ] **Step 6: เก็บกวาดไฟล์ที่ไม่ได้ใช้**

```bash
rm -f .env.test
cat .env.example    # ต้องมีแค่ APP_ENV และ DATABASE_URL ไม่มี AUTH_SECRET / Notion token / TEST_DATABASE_URL
```

- [ ] **Step 7: เติม README ส่วน deploy**

```markdown
## Deploy

- ตั้ง `DATABASE_URL` และ `APP_ENV=production` ใน environment ของ host
- **เลือก region ของ host ให้ตรงกับ region ของ Neon** ไม่งั้นทุก query ช้าขึ้น 10 เท่า
- ยังไม่มีระบบ login ตามที่เจ้าของงานเลือกไว้ ถ้าจะเพิ่มรหัสผ่านภายหลัง
  ให้สร้าง `middleware.ts` ไฟล์เดียว แล้ว **ปิด `<details>` ที่โชว์ error จริงใน `src/lib/action-result.ts` ด้วย**

## เทส

    bun test        # unit test ล้วน ไม่แตะ DB
    bun run lint    # Biome รวมกฎ a11y และกฎห้าม page.tsx import โมดูล mutation
```

- [ ] **Step 8: Commit สุดท้าย**

```bash
git add -A
git commit -m "docs: document deploy notes and finish v1 checklist"
```

---

## หมายเหตุถึงคนที่รัน plan นี้

- **ด่านตรวจของ seed คือ 35 expense / 8 vendor / ยังไม่ระบุยอด 8 / หมวดที่เติมเอง 25** ถ้า `bun run db:seed --dry-run` พิมพ์ตัวเลขไม่ตรง แปลว่าไฟล์ export ยังไม่ถูก อย่า seed จริง (สเปคเขียน 6 กับ 11 ไว้ ซึ่งนับจากชื่อรายการแบบรวมมัดจำ ไม่ใช่จำนวนแถวจริง)
- **อย่าเพิ่ม `export const dynamic`** ในหน้าไหนเลย ถ้าเจอหน้าที่ถูก prerender ให้ไปดูว่ามันเรียก query ผ่าน `src/db/queries.ts` หรือเปล่า
- **อย่าย้ายการคำนวณยอดไป SQL** แม้จะดูสั้นกว่า — ทั้งระบบยอมรับได้ว่า `bun test` ไม่แตะ DB ก็เพราะตรรกะการเงินอยู่ใน JS
- **สิ่งที่สเปคตัดออกจาก v1 อย่าเผลอทำเพิ่ม:** login, หน้า public/RSVP, ผังโต๊ะ, ผูกซองกับแขก, import checklist จาก Notion, dark mode, E2E test
- **ทุกที่ที่เขียนว่า "ต่อท้ายไฟล์"** ให้รวม import ที่ซ้ำเข้ากับบรรทัด import เดิมด้านบนของไฟล์ อย่าเพิ่มบรรทัด import ซ้ำ (Biome จะฟ้อง)
- **การแก้ไขข้อมูลอยู่ใน Task 15–16** ไม่ใช่ในแต่ละโมดูล ตั้งใจแยกเพราะ create/toggle/delete ใช้งานได้จริงตั้งแต่ Task 9 แล้ว และการแก้ไขใช้รูปแบบเดียวกันทั้ง 5 โมดูล ทำรวดเดียวจบง่ายกว่าทำแยก 5 ครั้ง

## จุดที่ plan ตัดสินใจต่างจากตัวหนังสือในสเปค

**`/vendors` ใช้ JOIN ครั้งเดียวแล้วรวมยอดใน JS ไม่ใช่ `GROUP BY`**

สเปคข้อ 6 เขียนว่า "`JOIN + GROUP BY` ครั้งเดียว" แต่ข้อ 9 ระบุว่ายอดต่อ vendor ต้องมี unit test และข้อ 6 เองก็ให้เหตุผลว่า "ตรรกะการเงินที่อยู่ใน SQL ทดสอบด้วย unit test ไม่ได้" สองข้อนี้ขัดกัน plan เลือกทางที่รักษาเจตนาหลักไว้ทั้งคู่: ยิง query เดียว (ไม่มี N+1 ตามที่ข้อ 6 ต้องการ) แล้วรวมยอดด้วย `summarizeByVendor` ที่มีเทสครอบ (ตามที่ข้อ 9 ต้องการ) ต้นทุนคือดึงแถว expense ที่ผูก vendor กลับมาทั้งหมด ~35 แถว ซึ่งไม่มีนัยสำคัญ

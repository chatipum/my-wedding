# Responsive บนมือถือ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ทุกหน้าใช้งานได้จริงบนจอมือถือ โดยยุบตารางที่มี 7-9 คอลัมน์ให้กลายเป็นการ์ดต่อแถวเมื่อจอแคบกว่า 640px

**Architecture:** คง `<table>` ไว้ทั้งหมดแล้วแปลงเป็นการ์ดด้วย CSS media query ที่ `globals.css` — ไม่ใช้ hook หรือ conditional render ตาม viewport ป้ายกำกับบนการ์ดมาจาก `data-label` ที่ CSS `::before` หยิบไปแสดง ซึ่งถูกสร้างจาก `COLUMNS` ของตารางนั้นผ่านตัวช่วย `<Cell>` จุดเดียว ไม่มีการพิมพ์ป้ายซ้ำด้วยมือ

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, Tailwind CSS v4, TypeScript, bun test, Biome

**Spec:** `docs/superpowers/specs/2026-09-20-responsive-design.md`

**Branch:** `feat/responsive-mobile`

## Global Constraints

- จุดตัด responsive คือ **640px** (`40rem`) ตรงกับ `sm` ของ Tailwind — ทุกที่ต้องใช้ค่านี้ ห้ามมีจุดตัดที่สอง
- **ห้ามเพิ่ม `'use client'`** ให้ `src/components/ui/data-table.tsx` และห้ามเพิ่ม hook ที่อ่าน `window.matchMedia` — เหตุผลอยู่ใน spec หัวข้อ 3
- ข้อความ UI เป็นภาษาไทยทั้งหมด ตามที่มีอยู่เดิม
- Biome: single quote, ไม่ใส่ semicolon, indent 2 space, บรรทัดยาวไม่เกิน 100 — รัน `bun run format` ก่อน commit ทุกครั้ง
- เทสวางไว้ข้างไฟล์ที่มันเทส (`data-table.test.ts` อยู่ข้าง `data-table.tsx`) ไม่มีโฟลเดอร์ `tests/`
- ห้ามใช้ `for` loop — ใช้เมธอดของ array (`map` / `find` / `filter`)
- ห้ามเคลมว่างานเสร็จหรือ responsive แล้วโดยอ้างผล `bun test` — CSS เทสไม่ได้ ต้องเปิดดูจริงตาม Task 8

## หมายเหตุการเรียงลำดับ (ต่างจาก spec หัวข้อ 10)

spec เรียง CSS ไว้เป็นกลุ่มที่ 3 แผนนี้ย้ายมาเป็น Task 2 เหตุผล: ถ้า CSS พร้อมก่อน การย้ายแต่ละหน้า (Task 3-6) จะเปิดดูที่ 390px ยืนยันได้ทันทีตอนจบ task นั้น ไม่ต้องรอถึงท้ายสุด ขอบเขตงานไม่เปลี่ยน เปลี่ยนแค่ลำดับ

---

### Task 1: logic แปลง `COLUMNS` เป็น attribute ของ `<td>`

**Files:**
- Modify: `src/components/ui/data-table.tsx`
- Test: `src/components/ui/data-table.test.ts` (สร้างใหม่)

**Interfaces:**
- Consumes: `cn` จาก `@/lib/cn`
- Produces:
  - `type Column<K extends string = string> = { key: K; label: string; numeric?: boolean; hideOnMobile?: boolean }`
  - `cellAttributes(columns: readonly Column[], key: string): { 'data-label': string; className: string | undefined }` — โยน `Error` ถ้าไม่พบ key
  - `createCell<K extends string>(columns: readonly Column<K>[])` → คืน component `Cell` ที่รับ props `{ name: K; className?: string; children?: React.ReactNode }`
  - `DataTable` prop `columns` เปลี่ยนชนิดเป็น `readonly Column[]`

- [ ] **Step 1: เขียนเทสที่ยังไม่ผ่าน**

สร้าง `src/components/ui/data-table.test.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { cellAttributes, type Column } from '@/components/ui/data-table'

const COLUMNS: readonly Column[] = [
  { key: 'name', label: 'รายการ' },
  { key: 'amount', label: 'ยอด', numeric: true },
  { key: 'category', label: 'หมวด', hideOnMobile: true },
  { key: 'total', label: 'รวม', numeric: true, hideOnMobile: true },
  { key: 'actions', label: '' },
]

describe('cellAttributes', () => {
  it('คอลัมน์ธรรมดาได้ป้ายเป็น label ของตัวเอง ไม่มีคลาสพิเศษ', () => {
    expect(cellAttributes(COLUMNS, 'name')).toEqual({
      'data-label': 'รายการ',
      className: undefined,
    })
  })

  it('คอลัมน์ตัวเลขได้คลาส num', () => {
    expect(cellAttributes(COLUMNS, 'amount')).toEqual({
      'data-label': 'ยอด',
      className: 'num',
    })
  })

  it('คอลัมน์ที่สั่งซ่อนบนมือถือได้คลาส hide-sm', () => {
    expect(cellAttributes(COLUMNS, 'category')).toEqual({
      'data-label': 'หมวด',
      className: 'hide-sm',
    })
  })

  it('เป็นได้ทั้งตัวเลขและซ่อนบนมือถือพร้อมกัน', () => {
    expect(cellAttributes(COLUMNS, 'total')).toEqual({
      'data-label': 'รวม',
      className: 'num hide-sm',
    })
  })

  it('คอลัมน์ปุ่มป้ายว่าง — CSS จะได้ไม่ขึ้นป้ายเปล่าให้บนการ์ด', () => {
    expect(cellAttributes(COLUMNS, 'actions')).toEqual({
      'data-label': '',
      className: undefined,
    })
  })

  it('key ที่ไม่มีในตารางโยน error พร้อมบอกชื่อ key ที่หาไม่เจอ', () => {
    expect(() => cellAttributes(COLUMNS, 'ไม่มีจริง')).toThrow('ไม่มีจริง')
  })
})
```

- [ ] **Step 2: รันเทสให้แน่ใจว่ามันพัง**

Run: `bun test src/components/ui/data-table.test.ts`
Expected: FAIL — `cellAttributes` ยังไม่ถูก export จาก `data-table.tsx`

- [ ] **Step 3: เขียน implementation ที่น้อยที่สุดให้เทสผ่าน**

แก้ `src/components/ui/data-table.tsx` — แทนที่ `export type Column = ...` เดิมด้วย:

```tsx
export type Column<K extends string = string> = {
  key: K
  label: string
  numeric?: boolean
  hideOnMobile?: boolean
}

/** ป้ายบนการ์ดกับการซ่อนคอลัมน์มาจาก COLUMNS ที่เดียว row component ไม่ต้องรู้เรื่องนี้ */
export function cellAttributes(columns: readonly Column[], key: string) {
  const column = columns.find((candidate) => candidate.key === key)
  if (!column) throw new Error(`ไม่มีคอลัมน์ "${key}" ในตารางนี้`)

  return {
    'data-label': column.label,
    className: cn(column.numeric && 'num', column.hideOnMobile && 'hide-sm') || undefined,
  }
}
```

- [ ] **Step 4: รันเทสให้แน่ใจว่าผ่าน**

Run: `bun test src/components/ui/data-table.test.ts`
Expected: PASS ทั้ง 6 เคส

- [ ] **Step 5: เพิ่ม `createCell` และเปลี่ยน prop `columns` เป็น readonly**

เพิ่มต่อท้าย `cellAttributes` ใน `src/components/ui/data-table.tsx`:

```tsx
/** ผูก Cell เข้ากับ COLUMNS ของตารางหนึ่ง — name จึงเป็น union ของ key จริง พิมพ์ผิด TS ฟ้อง */
export function createCell<K extends string>(columns: readonly Column<K>[]) {
  return function Cell({
    name,
    className,
    children,
  }: {
    name: K
    className?: string
    children?: React.ReactNode
  }) {
    const { className: columnClass, ...rest } = cellAttributes(columns, name)
    return (
      <td {...rest} className={cn(columnClass, className)}>
        {children}
      </td>
    )
  }
}
```

หมายเหตุเรื่องชนิดข้อมูล: `COLUMNS` ทุกไฟล์จะประกาศด้วย `as const` เพื่อให้ TypeScript อนุมาน `K` เป็น union ของ key จริง ถ้าเจอว่ามันกว้างเป็น `string` (คือพิมพ์ `name` ผิดแล้วไม่ฟ้อง) ให้ตรวจว่าลืม `as const` หรือเปล่า และอย่าแก้ด้วยการใส่ `any`

และแก้ signature ของ `DataTable` — `columns: Column[]` เป็น `columns: readonly Column[]` (จำเป็น เพราะ `COLUMNS` ทุกไฟล์จะประกาศด้วย `as const` ซึ่งได้ readonly array)

- [ ] **Step 6: ตรวจว่าไม่มีอะไรพัง**

Run: `bun test && bun run lint && bun run build`
Expected: เทสผ่านทั้งหมด lint ผ่าน build ผ่าน — ยังไม่มีอะไรเปลี่ยนบนหน้าจอ

- [ ] **Step 7: Commit**

```bash
bun run format
git add src/components/ui/data-table.tsx src/components/ui/data-table.test.ts
git commit -m "feat: DataTable สร้าง data-label กับคลาสซ่อนจาก COLUMNS ได้"
```

---

### Task 2: CSS แปลงตารางเป็นการ์ด และ prop `mobile`

**Files:**
- Modify: `src/components/ui/data-table.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `Column`, `cn` (Task 1)
- Produces:
  - `DataTable` prop ใหม่ `mobile?: 'cards' | 'scroll'` ค่าตั้งต้น `'cards'`
  - คลาส CSS ที่ task ถัดไปใช้: `.table-cards` (ใส่โดย `DataTable` เอง), `.hide-sm` (ใส่โดย `Cell` เอง), `.card-flush` (หน้าเป็นคนส่งให้ `<Card>`)

- [ ] **Step 1: เพิ่ม prop `mobile` และ wrapper ใน `DataTable`**

ใน `src/components/ui/data-table.tsx` แก้ตัว component ให้เป็น:

```tsx
export function DataTable({
  caption,
  columns,
  children,
  isEmpty,
  emptyMessage = 'ยังไม่มีข้อมูล',
  mobile = 'cards',
}: {
  caption: string
  columns: readonly Column[]
  children: React.ReactNode
  isEmpty: boolean
  emptyMessage?: string
  /** cards = ยุบเป็นการ์ดต่อแถวบนจอแคบ · scroll = คงตารางไว้ให้เลื่อนแนวนอน */
  mobile?: 'cards' | 'scroll'
}) {
  if (isEmpty) return <EmptyState message={emptyMessage} />

  return (
    <div className={cn(mobile === 'scroll' && 'overflow-x-auto')}>
      <table className={cn('table', mobile === 'cards' && 'table-cards')}>
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
    </div>
  )
}
```

**แก้หลังตรวจจริง:** โค้ดที่ชิปจริงไม่ตรงกับ snippet ด้านบนทุกจุด —

- `cn('table', ...)` กลายเป็น `cn('data-table', ...)` ตั้งแต่ commit `db0c198` (คนละรอบกับ task นี้) แล้วภายหลังพบว่าตัวปรับ `table-cards` ไม่ได้เปลี่ยนชื่อตาม เลยกลายเป็น `data-table-cards` ในรอบตรวจจริง เพื่อให้คลาสฐานกับตัวปรับใช้รากเดียวกัน (ดู spec §5)
- `<div className={cn(mobile === 'scroll' && 'overflow-x-auto')}>` ที่ตั้งเงื่อนไขไว้ กลายเป็น `<div className="overflow-x-auto">` แบบไม่มีเงื่อนไข เพราะโหมด `'cards'` ที่จอ ≥640px ก็เป็นตารางเต็มคอลัมน์เหมือน `'scroll'` ทุกประการ ต้องกันล้นจอเหมือนกันทั้งสองโหมด (ดู spec §4)

ปล่อย snippet เดิมไว้ตามที่ร่างไว้ตอนวางแผน ไม่แก้ย้อนหลัง เพื่อให้เห็นว่าอะไรเปลี่ยนไประหว่างทำจริง

หมายเหตุ: `<thead>` ไม่ต้องใส่ `hide-sm` เพราะบนมือถือ `thead` ถูกซ่อนทั้งก้อนอยู่แล้ว

- [ ] **Step 2: เพิ่ม CSS ต่อท้าย `@layer components` ใน `src/app/globals.css`**

เพิ่มก่อนปิดปีกกาของ `@layer components`:

```css
  /** จอแคบกว่า 640px: 1 แถว = 1 การ์ด, 1 ช่อง = 1 บรรทัด "ป้าย: ค่า" */
  @media (width < 40rem) {
    .table-cards thead {
      display: none;
    }
    .table-cards,
    .table-cards tbody,
    .table-cards tr,
    .table-cards td {
      display: block;
    }
    .table-cards tr {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .table-cards td {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.25rem 0;
      border-bottom: none;
    }
    /** ป้ายมาจาก data-label ที่ Cell ใส่ให้ — ป้ายว่าง (ช่องปุ่ม) ไม่ต้องขึ้น */
    .table-cards td[data-label]:not([data-label=""])::before {
      content: attr(data-label);
      color: var(--color-muted);
      flex: none;
    }
    /** ช่องปุ่มไม่มีป้าย ถ้าปล่อย space-between ปุ่มแก้กับปุ่มลบจะแยกคนละมุมการ์ด */
    .table-cards td[data-label=""] {
      justify-content: flex-end;
    }
    .table-cards td.hide-sm {
      display: none;
    }

    /** การ์ดของแถวมีขอบของตัวเองแล้ว Card ชั้นนอกต้องถอยให้ ไม่งั้นขอบซ้อนขอบ */
    .card-flush {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
    }

    /** ขยาย touch target เฉพาะมือถือ — บนจอใหญ่ยังย่อพอดี icon ตามเจตนาเดิม (d9f94fe) */
    .btn-icon {
      min-width: 44px;
      min-height: 44px;
    }
  }
```

- [ ] **Step 3: ตรวจว่า build ผ่านและยังไม่มีอะไรเปลี่ยน**

Run: `bun test && bun run lint && bun run build`
Expected: ผ่านทั้งหมด — ตอนนี้ตารางทุกตัวได้คลาส `table-cards` แล้วแต่ `<td>` ยังไม่มี `data-label` จึงเห็นเป็นการ์ดที่ยังไม่มีป้าย ซึ่งถูกต้องสำหรับขั้นนี้

- [ ] **Step 4: Commit**

```bash
bun run format
git add src/components/ui/data-table.tsx src/app/globals.css
git commit -m "feat: ตารางยุบเป็นการ์ดบนจอแคบกว่า 640px"
```

---

### Task 3: ย้ายหน้าค่าใช้จ่าย

**Files:**
- Create: `src/app/expenses/columns.ts`
- Modify: `src/app/expenses/page.tsx`
- Modify: `src/app/expenses/expense-row.tsx`

**Interfaces:**
- Consumes: `createCell`, `Column` (Task 1) · คลาส `.card-flush` (Task 2)
- Produces: `COLUMNS` และ `Cell` จาก `@/app/expenses/columns`

- [ ] **Step 1: สร้าง `src/app/expenses/columns.ts`**

ต้องแยกออกจาก `page.tsx` เพราะ `expense-row.tsx` เป็น `'use client'` ถ้าไป import จาก `page.tsx` จะลาก `loadExpensesPage` (db query) เข้า client bundle

```ts
import { createCell } from '@/components/ui/data-table'

export const COLUMNS = [
  { key: 'paid', label: 'จ่ายแล้ว' },
  { key: 'name', label: 'รายการ' },
  { key: 'category', label: 'หมวด', hideOnMobile: true },
  { key: 'vendor', label: 'ผู้ให้บริการ', hideOnMobile: true },
  { key: 'due', label: 'กำหนดจ่าย', hideOnMobile: true },
  { key: 'amount', label: 'ยอด', numeric: true },
  { key: 'status', label: 'สถานะ' },
  { key: 'actions', label: '' },
] as const

export const Cell = createCell(COLUMNS)
```

- [ ] **Step 2: แก้ `src/app/expenses/page.tsx`**

ลบ `const COLUMNS = [...]` ทิ้ง แล้ว import แทน:

```tsx
import { COLUMNS } from './columns'
```

เปลี่ยน `<Card className="mb-6">` ที่ครอบตารางหลักเป็น:

```tsx
<Card className="card-flush mb-6">
```

และตาราง "สรุปแยกหมวด" (`<Card>` ใบล่าง) เพิ่ม prop `mobile="scroll"` ให้ `DataTable`:

```tsx
<DataTable
  caption="สรุปแยกหมวด"
  mobile="scroll"
  columns={[
```

ตารางสรุปคงเป็นตารางจริงบนมือถือ (เลื่อนแนวนอน ตาม spec หัวข้อ 6) จึง **ไม่ต้อง** แปลง `<td>` ข้างในเป็น `<Cell>` และ `<Card>` ใบนี้ **ไม่** ใส่ `card-flush` เพราะข้างในไม่มีการ์ดของแถว

- [ ] **Step 3: แก้ `src/app/expenses/expense-row.tsx`**

เพิ่ม import:

```tsx
import { Cell } from './columns'
```

แทนที่ `<td>` ทั้ง 8 ตัวใน `<tr>` แถวข้อมูล (แถวฟอร์ม inline edit ที่ใช้ `colSpan` **ไม่ต้องแตะ** — มันต้องไม่มี `data-label` ถึงจะไม่ขึ้นป้าย):

```tsx
<tr>
  <Cell name="paid">
    <PaidToggle id={row.id} isPaid={row.isPaid} label={row.name} />
  </Cell>
  <Cell name="name">{row.name}</Cell>
  <Cell name="category">{row.category ?? '—'}</Cell>
  <Cell name="vendor">{row.vendorName ?? '—'}</Cell>
  <Cell name="due">
    <DateText value={row.dueDate} />
  </Cell>
  <Cell name="amount">
    <Money value={row.amount} />
  </Cell>
  <Cell name="status">
    <Badge status={status.key}>{status.label}</Badge>
  </Cell>
  <Cell name="actions" className="flex gap-2">
    <Button
      variant="ghost"
      className="btn-icon"
      aria-label={`แก้ไข ${row.name}`}
      title={`แก้ไข ${row.name}`}
      aria-expanded={isEditing}
      onClick={() => setIsEditing((open) => !open)}
    >
      <PencilIcon />
    </Button>
    <DeleteExpenseButton id={row.id} name={row.name} />
  </Cell>
</tr>
```

สังเกตว่า `className="num"` ที่ช่องยอดหายไป — `Cell` ใส่ให้เองจาก `numeric: true` ใน `COLUMNS`

- [ ] **Step 4: ตรวจ**

Run: `bun test && bun run lint && bun run build`
Expected: ผ่านทั้งหมด

- [ ] **Step 5: ดูด้วยตา**

Run: `bun run dev` แล้วเปิด `/expenses` ตั้งความกว้าง DevTools เป็น 390px
Expected: แต่ละรายการเป็นการ์ดใบหนึ่ง มีบรรทัด `จ่ายแล้ว` / `รายการ` / `ยอด` / `สถานะ` และปุ่มชิดขวา · ไม่เห็น หมวด / ผู้ให้บริการ / กำหนดจ่าย · ไม่มี scroll แนวนอนของทั้งหน้า · กดปุ่มดินสอแล้วฟอร์มกางใต้การ์ดใบนั้น · ตารางสรุปแยกหมวดยังเป็นตารางและเลื่อนแนวนอนได้เองโดยหน้าไม่เลื่อนตาม
ที่ 1280px: หน้าตาเหมือนเดิมทุกอย่าง

- [ ] **Step 6: Commit**

```bash
bun run format
git add src/app/expenses/
git commit -m "feat: หน้าค่าใช้จ่ายยุบเป็นการ์ดบนมือถือ"
```

---

### Task 4: ย้ายหน้าแขก และทำแถวตัวกรองให้พอดีจอ

**Files:**
- Create: `src/app/guests/columns.ts`
- Modify: `src/app/guests/guest-table.tsx`
- Modify: `src/app/guests/guest-row.tsx`
- Modify: `src/app/guests/page.tsx`

**Interfaces:**
- Consumes: `createCell` (Task 1) · `.card-flush` (Task 2)
- Produces: `COLUMNS` และ `Cell` จาก `@/app/guests/columns`

- [ ] **Step 1: สร้าง `src/app/guests/columns.ts`**

```ts
import { createCell } from '@/components/ui/data-table'

export const COLUMNS = [
  { key: 'name', label: 'ชื่อ' },
  { key: 'side', label: 'ฝ่าย', hideOnMobile: true },
  { key: 'group', label: 'กลุ่ม' },
  { key: 'confirmed', label: 'ผู้ติดตาม', numeric: true },
  { key: 'rsvp', label: 'ตอบรับ' },
  { key: 'invitation', label: 'แจกซอง' },
  { key: 'actions', label: '' },
] as const

export const Cell = createCell(COLUMNS)
```

- [ ] **Step 2: แก้ `src/app/guests/guest-row.tsx`**

เพิ่ม `import { Cell } from './columns'` แล้วแทนที่ `<tr>` แถวข้อมูล (แถว `colSpan` ไม่ต้องแตะ):

```tsx
<tr>
  <Cell name="name">{guest.name}</Cell>
  <Cell name="side">{guest.side === 'groom' ? 'เจ้าบ่าว' : 'เจ้าสาว'}</Cell>
  <Cell name="group">{guest.group ?? '—'}</Cell>
  <Cell name="confirmed">{guest.companionsConfirmed ?? 'ยังไม่ถาม'}</Cell>
  <Cell name="rsvp">
    <Badge status={rsvp.key}>{rsvp.label}</Badge>
  </Cell>
  <Cell name="invitation">
    <InvitationToggle id={guest.id} invitationGiven={guest.invitationGiven} name={guest.name} />
  </Cell>
  <Cell name="actions" className="flex gap-2">
    <Button
      variant="ghost"
      className="btn-icon"
      aria-label={`แก้ไข ${guest.name}`}
      title={`แก้ไข ${guest.name}`}
      aria-expanded={isEditing}
      onClick={() => setIsEditing((open) => !open)}
    >
      <PencilIcon />
    </Button>
    <DeleteGuestButton id={guest.id} name={guest.name} />
  </Cell>
</tr>
```

- [ ] **Step 3: แก้ `src/app/guests/guest-table.tsx` — ลบ `COLUMNS` เดิม**

ลบ `const COLUMNS = [...]` ที่ประกาศไว้ในไฟล์นี้ แล้วเพิ่ม `import { COLUMNS } from './columns'`

- [ ] **Step 4: แก้แถวตัวกรองในไฟล์เดิมให้เรียงเต็มความกว้างบนมือถือ**

เปลี่ยน `<div className="flex flex-wrap gap-3 mb-4">` เป็น:

```tsx
<div className="grid gap-3 sm:flex sm:flex-wrap mb-4">
```

แล้วเปลี่ยนความกว้างตายตัวของช่องทั้ง 5 ให้มีผลเฉพาะจอ ≥640px:

- ช่องค้นหา: `className="input max-w-xs"` → `className="input sm:max-w-xs"`
- select ทั้ง 4 ตัว (ฝ่าย / กลุ่ม / ตอบรับ / แจกซอง): `className="input max-w-40"` → `className="input sm:max-w-40"`

และปุ่มล้างตัวกรอง: `className="ml-auto"` → `className="sm:ml-auto"`

- [ ] **Step 5: แก้ `src/app/guests/page.tsx`**

`<Card>` ที่ครอบ `<GuestTable>` เปลี่ยนเป็น `<Card className="card-flush">`

- [ ] **Step 6: ตรวจ**

Run: `bun test && bun run lint && bun run build`
Expected: ผ่านทั้งหมด — `bun test` ต้องยังมี `guest-filter.test.ts` ผ่านครบ (ตัวกรองไม่ได้แก้ logic แค่แก้ layout)

- [ ] **Step 7: ดูด้วยตา**

Run: `bun run dev` เปิด `/guests` ที่ 390px
Expected: ช่องค้นหากับ select ทั้ง 4 เรียงลงมาเต็มความกว้างทีละอัน · ปุ่มล้างตัวกรองกับดาวน์โหลด Excel อยู่เต็มความกว้างเหมือนกัน ไม่เบียดไปมุมขวา · แต่ละแขกเป็นการ์ดที่มี ชื่อ / กลุ่ม / ผู้ติดตาม / ตอบรับ / แจกซอง และไม่มีบรรทัด "ฝ่าย" · กดดินสอแล้วฟอร์มกางใต้การ์ดใบนั้น
ที่ 1280px: แถวตัวกรองเรียงแนวนอนเหมือนเดิม ปุ่มล้างตัวกรองยังถูกดันไปขวาสุด ตารางมี 7 คอลัมน์ครบรวมฝ่าย

- [ ] **Step 8: Commit**

```bash
bun run format
git add src/app/guests/
git commit -m "feat: หน้าแขกยุบเป็นการ์ดบนมือถือ ตัวกรองเรียงเต็มความกว้าง"
```

---

### Task 5: ย้ายหน้าผู้ให้บริการ

**Files:**
- Create: `src/app/vendors/columns.ts`
- Modify: `src/app/vendors/page.tsx`
- Modify: `src/app/vendors/vendor-row.tsx`

**Interfaces:**
- Consumes: `createCell` (Task 1) · `.card-flush` (Task 2)
- Produces: `COLUMNS` และ `Cell` จาก `@/app/vendors/columns`

- [ ] **Step 1: สร้าง `src/app/vendors/columns.ts`**

เบอร์โทรถูกเก็บไว้บนมือถือโดยตั้งใจ เพราะ render เป็น `<a href="tel:">` ซึ่งมือถือคือที่เดียวที่กดแล้วได้ผลจริง จึงซ่อน "ราคาที่ตกลง" แทน (spec หัวข้อ 6)

```ts
import { createCell } from '@/components/ui/data-table'

export const COLUMNS = [
  { key: 'name', label: 'ผู้ให้บริการ' },
  { key: 'role', label: 'หน้าที่' },
  { key: 'phone', label: 'เบอร์โทร' },
  { key: 'line', label: 'LINE', hideOnMobile: true },
  { key: 'agreed', label: 'ราคาที่ตกลง', numeric: true, hideOnMobile: true },
  { key: 'paid', label: 'จ่ายแล้ว', numeric: true },
  { key: 'unpaid', label: 'ค้างจ่าย', numeric: true },
  { key: 'unknown', label: 'ยังไม่ระบุยอด', numeric: true, hideOnMobile: true },
  { key: 'actions', label: '' },
] as const

export const Cell = createCell(COLUMNS)
```

- [ ] **Step 2: แก้ `src/app/vendors/page.tsx`**

ลบ `const COLUMNS = [...]` แล้ว `import { COLUMNS } from './columns'` และเปลี่ยน `<Card>` ที่ครอบตารางเป็น `<Card className="card-flush">`

- [ ] **Step 3: แก้ `src/app/vendors/vendor-row.tsx`**

เพิ่ม `import { Cell } from './columns'` แล้วแทนที่ `<tr>` แถวข้อมูล (แถว `colSpan` ไม่ต้องแตะ):

```tsx
<tr>
  <Cell name="name">{vendor.name}</Cell>
  <Cell name="role">{vendor.role ?? '—'}</Cell>
  <Cell name="phone">
    {vendor.phone ? <a href={`tel:${vendor.phone}`}>{vendor.phone}</a> : '—'}
  </Cell>
  <Cell name="line">{vendor.line ?? '—'}</Cell>
  <Cell name="agreed">
    <Money value={vendor.totalPrice} />
  </Cell>
  <Cell name="paid">
    <Money value={summary?.paid ?? 0} />
  </Cell>
  <Cell name="unpaid">
    <Money value={summary?.unpaid ?? 0} />
  </Cell>
  <Cell name="unknown">{summary?.unknownCount ?? 0}</Cell>
  <Cell name="actions" className="flex gap-2">
    <Button
      variant="ghost"
      className="btn-icon"
      aria-label={`แก้ไข ${vendor.name}`}
      title={`แก้ไข ${vendor.name}`}
      aria-expanded={isEditing}
      onClick={() => setIsEditing((open) => !open)}
    >
      <PencilIcon />
    </Button>
    <DeleteVendorButton id={vendor.id} name={vendor.name} />
  </Cell>
</tr>
```

- [ ] **Step 4: ตรวจ**

Run: `bun test && bun run lint && bun run build`
Expected: ผ่านทั้งหมด

- [ ] **Step 5: ดูด้วยตา**

Run: `bun run dev` เปิด `/vendors` ที่ 390px
Expected: การ์ดแต่ละเจ้ามี ผู้ให้บริการ / หน้าที่ / เบอร์โทร / จ่ายแล้ว / ค้างจ่าย และปุ่มชิดขวา · ไม่มี LINE / ราคาที่ตกลง / ยังไม่ระบุยอด · เบอร์โทรยังกดโทรออกได้ · ไม่มี scroll แนวนอนของทั้งหน้า
ที่ 1280px: ตาราง 9 คอลัมน์ครบเหมือนเดิม

- [ ] **Step 6: Commit**

```bash
bun run format
git add src/app/vendors/
git commit -m "feat: หน้าผู้ให้บริการยุบเป็นการ์ดบนมือถือ"
```

---

### Task 6: ย้ายหน้าซองรับ

**Files:**
- Create: `src/app/envelopes/columns.ts`
- Modify: `src/app/envelopes/page.tsx`
- Modify: `src/app/envelopes/envelope-row.tsx`

**Interfaces:**
- Consumes: `createCell` (Task 1) · `.card-flush` (Task 2)
- Produces: `COLUMNS` และ `Cell` จาก `@/app/envelopes/columns`

หน้านี้มีแค่ 3 คอลัมน์จึงไม่มีอะไรต้องซ่อน แต่ยังต้องย้ายมาใช้ `Cell` ให้การ์ดมีป้ายกำกับเหมือนหน้าอื่น และ `envelope-row.tsx` เป็น Server Component — ห้ามเผลอเติม `'use client'`

- [ ] **Step 1: สร้าง `src/app/envelopes/columns.ts`**

```ts
import { createCell } from '@/components/ui/data-table'

export const COLUMNS = [
  { key: 'received', label: 'รับเมื่อ' },
  { key: 'amount', label: 'ยอด', numeric: true },
  { key: 'actions', label: '' },
] as const

export const Cell = createCell(COLUMNS)
```

- [ ] **Step 2: แก้ `src/app/envelopes/page.tsx`**

เพิ่ม `import { COLUMNS } from './columns'` เปลี่ยน `<Card>` เป็น `<Card className="card-flush">` และเปลี่ยน `columns={[...]}` ที่เขียน inline ให้เป็น `columns={COLUMNS}`

- [ ] **Step 3: แก้ `src/app/envelopes/envelope-row.tsx`**

เพิ่ม `import { Cell } from './columns'` แล้ว:

```tsx
<tr>
  <Cell name="received">
    <time dateTime={row.createdAt.toISOString()}>{receivedAt}</time>
  </Cell>
  <Cell name="amount">
    <Money value={row.amount} />
  </Cell>
  <Cell name="actions">
    <DeleteEnvelopeButton id={row.id} label={`${formatBaht(row.amount)} รับเมื่อ ${receivedAt}`} />
  </Cell>
</tr>
```

- [ ] **Step 4: ตรวจ**

Run: `bun test && bun run lint && bun run build`
Expected: ผ่านทั้งหมด

- [ ] **Step 5: ดูด้วยตา**

Run: `bun run dev` เปิด `/envelopes` ที่ 390px
Expected: แต่ละซองเป็นการ์ดที่มีบรรทัด `รับเมื่อ` และ `ยอด` ปุ่มลบชิดขวา · ฟอร์มกรอกยอดกับปุ่มยอดด่วนด้านบนยังกดได้สบาย

- [ ] **Step 6: Commit**

```bash
bun run format
git add src/app/envelopes/
git commit -m "feat: หน้าซองรับยุบเป็นการ์ดบนมือถือ"
```

---

### Task 7: เมนูและระยะขอบหน้า

**Files:**
- Modify: `src/components/nav.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: ไม่มี
- Produces: ไม่มี (เปลี่ยนแค่ class ของ markup เดิม)

`nav.tsx` ต้องยังเป็น Server Component — ห้ามเติม `'use client'` หรือ state ใดๆ ตามที่ตกลงไว้ว่าเมนูเป็นแถวเลื่อนแนวนอน ไม่ใช่แฮมเบอร์เกอร์

- [ ] **Step 1: แก้ `src/components/nav.tsx`**

```tsx
export function Nav() {
  return (
    <nav className="border-b border-border bg-surface">
      {/* เมนู 5 อันไม่เคยล้นบนจอ ≥640px — flex-nowrap จึงมีผลแค่ตอนจอแคบ */}
      <ul className="mx-auto flex max-w-5xl flex-nowrap gap-4 overflow-x-auto px-4 py-3">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="whitespace-nowrap">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: แก้ `src/app/layout.tsx`**

เปลี่ยน `<main className="mx-auto max-w-5xl px-4 py-6">` เป็น:

```tsx
<main className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
```

`px-4` (16px) ไม่แตะ — เป็นระยะขอบที่พอดีสำหรับมือถืออยู่แล้ว

- [ ] **Step 3: ตรวจ**

Run: `bun test && bun run lint && bun run build`
Expected: ผ่านทั้งหมด

- [ ] **Step 4: ดูด้วยตา**

Run: `bun run dev` ที่ 390px
Expected: เมนูอยู่บรรทัดเดียว เลื่อนซ้ายขวาได้ถึง "ผู้ให้บริการ" · ไม่ตกลงมาเป็นสองบรรทัด · หน้าไม่เลื่อนแนวนอนตามเมนู
ที่ 1280px: เมนูเรียงเหมือนเดิมทุกประการ ไม่มี scrollbar

- [ ] **Step 5: Commit**

```bash
bun run format
git add src/components/nav.tsx src/app/layout.tsx
git commit -m "feat: เมนูเป็นแถวเลื่อนแนวนอนบนจอแคบ"
```

---

### Task 8: ตรวจทั้งระบบด้วยตา

**Files:** ไม่แก้ไฟล์ — task นี้คือการตรวจและรายงาน ถ้าเจอปัญหาให้แก้แล้ว commit เพิ่ม

**Interfaces:**
- Consumes: ผลของ Task 1-7 ทั้งหมด
- Produces: รายงานผลการตรวจ

- [ ] **Step 1: รันชุดตรวจอัตโนมัติให้ครบ**

Run: `bun test && bun run lint && bun run build`
Expected: ผ่านทั้งหมด — และต้องไม่เอาผลนี้ไปเคลมว่า responsive แล้ว CSS เทสไม่ได้

- [ ] **Step 2: ไล่ทั้ง 5 หน้าที่ 390px**

Run: `bun run dev` เปิด DevTools ตั้งความกว้าง 390px แล้วเปิด `/`, `/expenses`, `/envelopes`, `/guests`, `/vendors`

เช็คทีละข้อทุกหน้า:
- ไม่มี scroll แนวนอนของทั้งหน้า (ลากนิ้ว/scroll ซ้ายขวาแล้วหน้าไม่ขยับ)
- การ์ดทุกใบมีป้ายกำกับครบทุกบรรทัด ไม่มีบรรทัดที่ป้ายว่างเปล่า
- ฟิลด์ที่สั่งซ่อนหายไปจริง (ค่าใช้จ่าย: หมวด/ผู้ให้บริการ/กำหนดจ่าย · แขก: ฝ่าย · ผู้ให้บริการ: LINE/ราคาที่ตกลง/ยังไม่ระบุยอด)
- ปุ่มแก้กับปุ่มลบเกาะกลุ่มชิดขวาในการ์ดเดียวกัน ไม่แยกคนละมุม
- กดปุ่มแก้แล้วฟอร์มกางออกใต้การ์ด **ใบที่กด** ไม่ใช่ใบอื่น และกดบันทึก/ยกเลิกแล้วหุบถูกใบ
- ปุ่ม icon กดติดง่าย ไม่ต้องเล็งนาน
- หน้าภาพรวม: การ์ดสรุป 4 ใบเรียงลงมาทีละใบ ตัวเลขไม่ล้น

- [ ] **Step 3: เช็คจุดตัดที่ 640px และ 641px**

Run: ปรับความกว้าง DevTools เป็น 640 แล้ว 641
Expected: ที่ 640 เป็นการ์ด ที่ 641 เป็นตาราง — เปลี่ยนทันทีทั้งก้อน ไม่มีสถานะกลางที่ครึ่งการ์ดครึ่งตาราง ไม่มีขอบซ้อนขอบ ไม่มีป้ายโผล่ในโหมดตาราง

- [ ] **Step 4: เช็คจอใหญ่ว่าไม่มีอะไรเสียหาย**

Run: ตั้งความกว้าง 1280px ไล่ทั้ง 5 หน้า
Expected: หน้าตาเหมือนก่อนเริ่มงานนี้ทุกประการ — ตารางครบทุกคอลัมน์ ปุ่ม icon ยังเล็กพอดีตัว icon การ์ดยังมีขอบและพื้นหลัง แถวตัวกรองหน้าแขกยังเรียงแนวนอนและปุ่มล้างตัวกรองยังชิดขวา

- [ ] **Step 5: รายงาน**

รายงานตามที่เห็นจริง ข้อไหนไม่ได้ตรวจให้บอกว่าไม่ได้ตรวจ ถ้าเจอปัญหาให้แก้แล้ว commit เพิ่มก่อนรายงานว่าผ่าน

- [ ] **Step 6: push branch**

```bash
git push -u origin feat/responsive-mobile
```

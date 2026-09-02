# Wedding Dashboard — Design Spec

- วันที่: 2026-09-01
- งาน: งานแต่งบาสเพลง · สโมสรร่วมเริงไชย · 28 พ.ย. 69 · APN Organize (คุณปอนด์) · แขกประมาณ 400 คน
- สถานะ: อนุมัติแล้ว พร้อมทำ implementation plan

---

## 1. เป้าหมาย

เว็บส่วนตัวสำหรับบ่าวสาวใช้ดูและแก้ข้อมูลการจัดงานแต่ง แทนการใช้ Notion

ปัญหาที่แก้: ข้อมูลกระจายอยู่ใน Notion หลายหน้า ตัวเลขเงินไม่รวมกัน ไม่มีรายชื่อแขก ไม่มีที่บันทึกยอดซอง จึงตอบไม่ได้ว่า "ตอนนี้จ่ายไปเท่าไหร่ ค้างเท่าไหร่ ได้ซองมาเท่าไหร่ สุทธิเหลือเท่าไหร่"

### ผู้ใช้

บ่าวสาว 2 คนเท่านั้น deploy ขึ้นอินเทอร์เน็ตโดย **ไม่มีระบบ login**

> **ข้อสังเกตที่บันทึกไว้:** ใครที่รู้ URL จะเห็นยอดเงินและรายชื่อแขกทั้งหมด เจ้าของงานรับทราบและเลือกแบบนี้ ระบบจะใส่ `robots: { index: false }` กัน search engine และออกแบบให้เพิ่ม password gate ภายหลังได้โดยเพิ่มไฟล์ `middleware.ts` ไฟล์เดียว

### แหล่งข้อมูลตัวจริง

**Neon** — ย้ายข้อมูลจาก Notion ครั้งเดียวแล้วเลิกใช้ Notion ไม่มี sync สองทาง

---

## 2. ขอบเขต

### อยู่ใน v1

| โมดูล | ข้อมูลเริ่มต้น |
|---|---|
| ค่าใช้จ่าย (`/expenses`) | 35 แถวจาก Notion |
| ซองรับ (`/envelopes`) | ว่าง |
| แขก (`/guests`) | ว่าง |
| Checklist (`/checklist`) | ว่าง |
| Vendor (`/vendors`) | 8 เจ้า สร้างจากหลักฐานใน 35 แถว |
| Dashboard (`/`) | คำนวณจากตารางข้างบน |

### ไม่อยู่ใน v1

- ระบบ login / ผู้ใช้หลายคน / สิทธิ์
- หน้า public สำหรับแขก / RSVP ออนไลน์
- จัดผังโต๊ะ / assign แขกลงโต๊ะ
- ผูกยอดซองกับแขกรายคน (ซองเป็นตารางแยก ไม่มีความสัมพันธ์กับ `guests`)
- หน้ารายละเอียดพิธี/ตกแต่ง และ checkbox 48 ข้อในหน้า Notion `Pleng Bas Wedding`
- import จาก database `Checklist งานแต่งงาน` (ตัดออกตามที่เจ้าของงานกำหนด)
- กำหนดการ/รันคิววันงาน
- dark mode
- E2E test

---

## 3. Stack

| ส่วน | เลือกใช้ |
|---|---|
| Framework | Next.js App Router (Server Components + Server Actions) |
| Runtime / package manager / test | Bun |
| DB | Neon Postgres |
| ORM | Drizzle (`drizzle-orm/neon-http`) + drizzle-kit |
| CSS | Tailwind v4 (config เป็น CSS ล้วนผ่าน `@theme`) |
| Class helper | clsx (ผ่าน `src/lib/cn.ts`) |
| Form | react-hook-form + valibot + `@hookform/resolvers` |
| Lint / format | Biome |

### เลือกไม่ใช้

- **tRPC / Route Handlers + TanStack Query** — Server Actions ให้ type safety ระดับเดียวกันโดยไม่ต้องมี API layer เพิ่ม สำหรับเว็บ 6 หน้าผู้ใช้ 2 คน การเขียนของทุกอย่าง 2 ชั้นคืองานเพิ่มเท่าตัวโดยไม่ได้อะไรกลับมา
- **twMerge** — แก้ปัญหา class ชนกันตอน component รับ `className` มาทับ ซึ่งไม่เกิดถ้าออกแบบให้ความต่างเป็น prop (`<Button variant="danger">`) ทุก component เรียกผ่าน `cn()` อยู่แล้ว ถ้าวันหนึ่งจำเป็นจริงเปลี่ยนได้โดยแก้ `src/lib/cn.ts` ไฟล์เดียว
- **zod** — valibot ทำงานเดียวกันด้วย bundle ที่เล็กกว่ามาก ซึ่งสำคัญเพราะ schema ถูกส่งไปฝั่ง client ด้วย
- **`drizzle-orm/neon-serverless` (WebSocket)** — ต้องใช้เมื่อต้องการ interactive transaction เท่านั้น ระบบนี้ทุก mutation เป็น statement เดียว และ seed ใช้ `db.batch()` ได้

---

## 4. Data model

5 ตาราง ความสัมพันธ์เดียวคือ vendor ↔ (expenses, checklist_items)

### กฎเรื่องเงิน

- เก็บเป็น **`integer` บาทเต็ม** ไม่ใช้ `numeric` หรือ `float` — ข้อมูลจริงทั้ง 35 แถวไม่มีสตางค์ ตัดปัญหาการปัดเศษและการแปลง string ไปมา
- ตัวแปรเงินทุกตัวใน query / action / business logic เป็น `number` เสมอ ไม่มีที่ไหนถือสตริงเงิน
- format เป็นข้อความเฉพาะตอนแสดงผล (ดูข้อ 10)

### `expenses`

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | serial pk | |
| `name` | text not null | เช่น "จ่ายโต๊ะจีน" |
| `category` | text null | 18 หมวดจาก Notion |
| `amount` | **integer null** | บาทเต็ม |
| `isPaid` | boolean default false | |
| `vendorId` | integer null → `vendors.id` | |
| `dueDate` | date null | |
| `note` | text null | |
| `createdAt` / `updatedAt` | timestamp | |

**`amount` เป็น null ได้โดยตั้งใจ** ปัจจุบันมี 6 รายการที่ยังไม่รู้ยอด (เครื่องดื่ม, อาหารเช้าแขก, วงดนตรี, ของชำร่วย, สังฆทาน, เซ็ตอาหารพระ) ถ้าบังคับเป็น `0` ตัวเลข "ค้างจ่าย" จะต่ำกว่าความจริงโดยไม่มีอะไรฟ้อง ทุกหน้าที่แสดงยอดรวมต้องแสดงตัวนับ "ยังไม่ระบุยอด N รายการ" กำกับเสมอ

### `envelopes`

`id` serial pk · `giverName` text **null** · `amount` integer not null · `receivedAt` date · `note` text null · `createdAt`

ชื่อผู้ให้เป็น null ได้เพราะวันงานต้องกรอกเร็ว บางซองไม่รู้ชื่อ ตารางนี้ **ไม่มีความสัมพันธ์กับ `guests`**

### `guests`

| คอลัมน์ | ชนิด | หมายเหตุ |
|---|---|---|
| `id` | serial pk | |
| `name` | text not null | ชื่อคนที่เชิญ |
| `side` | text | `'groom'` \| `'bride'` |
| `group` | text null | ญาติ / เพื่อน / ที่ทำงาน / อื่นๆ |
| `companionsEstimated` | integer default 0 | ผู้ติดตามที่**คาด**ว่าจะมา (1 = พาแฟน, 2 = แฟน+ลูก) |
| `companionsConfirmed` | **integer null** | ผู้ติดตามที่**ยืนยันแล้ว** — `null` = ยังไม่ได้ถาม |
| `rsvp` | text | `'pending'` \| `'yes'` \| `'no'` |
| `note` | text null | |

**เหตุผลที่แยก estimated ออกจาก confirmed:** ตัวเลข 400 เป็นการประมาณที่ประกอบขึ้นจากผู้ติดตามที่ยังไม่แน่นอน ถ้าเก็บเป็นตัวเลขเดียวจะบอกไม่ได้ว่าเชื่อได้แค่ไหน ทั้งที่โต๊ะจีนผูกงบ 70,000 บาทไว้กับตัวเลขนี้ `null` (ยังไม่ถาม) กับ `0` (ถามแล้ว มาคนเดียว) เป็นคนละความหมาย

### `checklist_items`

`id` · `name` not null · `category` text null (10 หมวด) · `status` `'not_started'|'in_progress'|'done'` · `budget` integer null · `deadline` date null · `depositPaid` boolean default false · `vendorId` integer null → `vendors.id` · `note` text null

**`checklist_items.budget` ไม่ถูกนำไปบวกที่ใดทั้งสิ้น** ยอดรวมทุกตัวในระบบนับจาก `expenses` ตารางเดียวเท่านั้น เพื่อกันการนับซ้ำ — `budget` คือ "เงินที่ตั้งไว้" ส่วน `expenses.amount` คือ "เงินที่จ่ายจริงหรือจะจ่ายจริง"

### `vendors`

`id` serial pk · `name` not null · `role` text · `phone` text null · `line` text null · `totalPrice` integer null · `note` text null

### ไม่มีตาราง settings / งบตั้งไว้รวม

Notion ไม่มีตัวเลขนี้ dashboard จึงแสดงตัวเลขจริงล้วน ไม่มีเป้าให้เทียบ

### ไม่ทำ index เพิ่มนอกจาก PK / FK

ข้อมูลสูงสุดคือ ~400 แถว Postgres seq scan จบในเวลาที่วัดไม่ได้ การใส่ index ตอนนี้ทำให้ migration รกโดยไม่ได้ความเร็วเพิ่ม

### ยอดที่คำนวณ (ไม่มีคอลัมน์เก็บผลรวม)

```
สุทธิ = ซองรับทั้งหมด − จ่ายแล้ว − ค้างจ่าย
        (+ ยังไม่ระบุยอด N รายการ)

แขกประมาณการ  = จำนวนแถวที่ rsvp ≠ 'no' + SUM(companionsEstimated) ของแถวเหล่านั้น
แขกยืนยันแล้ว = จำนวนแถวที่ rsvp = 'yes' + SUM(COALESCE(companionsConfirmed, companionsEstimated)) ของแถวเหล่านั้น
```

---

## 5. โครงหน้าเว็บและ Server Actions

### หน้า

| Route | เนื้อหา |
|---|---|
| `/` | สรุปเงิน · งานค้างใกล้ deadline · จำนวนแขก (ประมาณการ / ยืนยันแล้ว) |
| `/expenses` | ตารางค่าใช้จ่าย + สรุปแยกหมวด |
| `/envelopes` | ฟอร์มกรอกเร็ว + ยอดรวม |
| `/guests` | ฟอร์มเพิ่มทีละคน + ตาราง + ค้นหา/filter |
| `/checklist` | จัดกลุ่มตามสถานะ |
| `/vendors` | ผู้ติดต่อ + ยอดที่จ่ายให้แต่ละเจ้า |

### โครงไฟล์ — 3 ไฟล์ต่อ 1 โมดูล

```
src/app/expenses/page.tsx           server component: query → render (ห้ามมี 'use client')
src/app/expenses/actions.ts         'use server': create / update / toggle / delete
src/app/expenses/expense-form.tsx   client component: react-hook-form
```

รูปแบบเดียวกันทั้ง 5 โมดูล

```
src/db/schema.ts        ตารางทั้ง 5
src/db/index.ts         drizzle({ client: neon(process.env.DATABASE_URL) }) + ตรวจ env
src/db/queries.ts       ฟังก์ชันอ่านอย่างเดียว
src/db/mutations.ts     ฟังก์ชันเขียนอย่างเดียว
src/lib/totals.ts       ฟังก์ชันบริสุทธิ์คำนวณยอดรวม
src/lib/money.ts        formatBaht
src/lib/cn.ts           clsx wrapper
src/lib/ui.ts           map สถานะ → class
src/lib/schemas/*.ts    valibot schema ต่อโมดูล (ใช้ทั้ง client และ server)
src/components/ui/*     component ที่ใช้ร่วมทั้งแอป
src/app/layout.tsx          nav + metadata + next/font
src/app/globals.css         theme token ทั้งหมด
```

### Server Actions — 2 แบบ

**form action** — react-hook-form `handleSubmit` เรียก action ด้วย object (ไม่ใช่ FormData) → server `v.parse` ด้วย schema เดียวกัน → `revalidatePath` หน้าตัวเองและ `/`

**toggle** — ติ๊ก "จ่ายแล้ว" / เปลี่ยน rsvp เรียก action ตรงจาก `onClick` ห่อด้วย `useOptimistic`

`useOptimistic` ใช้กับ toggle เท่านั้น ไม่ใช้กับฟอร์ม เพราะ toggle เป็นสิ่งเดียวที่กดรัวหลายครั้งติดกันจนความหน่วงกวนใจ ส่วนฟอร์มถ้าใส่ optimistic ต้องจัดการ rollback ตอน validation ไม่ผ่านซึ่งไม่ได้อะไรกลับมา

### หน้า `/guests` ต่างจากหน้าอื่น

- ฟอร์มเพิ่มทีละคนอยู่บนสุดของหน้า (ไม่ใช่ modal) submit แล้ว reset + คืน focus ไปช่องแรก · ฝั่ง/กลุ่มจำค่าล่าสุดไว้
- ค้นหาและ filter (ฝั่ง / กลุ่ม / rsvp) ทำ **ฝั่ง client จากข้อมูลที่โหลดมาแล้ว ไม่ยิง query เพิ่ม**
- ไม่ทำ pagination — 400 แถวโหลดครั้งเดียวจบ และมี filter อยู่แล้ว
- ไม่ทำ bulk paste — การกรอกเกิดครั้งละ ~10 คน ไม่ใช่ 400 คนรวดเดียว ฟอร์มทีละคนที่คืน focus เองเพียงพอ

---

## 6. Performance และการกัน write หลุด

### กัน INSERT/UPDATE หลุดเข้าหน้าแสดงผล

Server component render ซ้ำได้หลายครั้ง ถ้ามี write หลุดเข้าไปจะรันหลายรอบเงียบๆ กันด้วย 2 ชั้น

1. **แยก module** — `page.tsx` / `layout.tsx` import ได้เฉพาะ `src/db/queries.ts`
2. **Biome บังคับ** — ตั้ง `noRestrictedImports` ห้าม `src/app/**/page.tsx` และ `src/app/**/layout.tsx` import `src/db/mutations` ผิดกฎแล้ว `bun run lint` แดง

ทุก write อยู่ใน `actions.ts` ที่ขึ้นต้นด้วย `'use server'` เท่านั้น ไม่มีข้อยกเว้น

### จำนวน query ต่อหน้า

| หน้า | เป้า | วิธี |
|---|---|---|
| `/` | 1 HTTP round trip | `db.batch()` ยิง 4 statement (expenses / envelopes / guests / checklist) พร้อมกัน ดึงแถวดิบมาคำนวณด้วย `src/lib/totals.ts` |
| `/vendors` | 1 | `JOIN + GROUP BY` ครั้งเดียว ห้ามวนหายอดทีละเจ้า (N+1) |
| หน้าอื่น | 1 | ดึงแถวดิบ แล้วสรุปด้วยฟังก์ชันบริสุทธิ์ |

**เหตุผลที่คำนวณยอดใน JS ไม่ใช่ SQL:** (ก) Neon HTTP คิด 1 query = 1 HTTP round trip การยิง `GROUP BY` เพิ่มเพื่อประหยัดการบวกเลข 35 ตัวคือจ่ายแพงกว่าที่ประหยัด (ข) ตรรกะการเงินที่อยู่ใน SQL ทดสอบด้วย unit test ไม่ได้ ซึ่งขัดกับข้อ 9

ถ้า layout กับ page ต้องใช้ข้อมูลชุดเดียวกัน ห่อฟังก์ชันนั้นด้วย `cache()` ของ React

### ความเร็วโหลดหน้า

- **region ของ Neon ต้องตรงกับ region ที่ deploy** — ข้าม region คือ 100–200ms ต่อ query เทียบกับ ~10–20ms ใน region เดียวกัน เป็นตัวแปรที่ต่างกันเป็นสิบเท่าและแก้ทีหลังยากที่สุด ต้องเขียนกำกับใน README
- JS ที่ส่งไป browser น้อยอยู่แล้ว — ทุกหน้าเป็น server component มีแค่ฟอร์ม / toggle / filter ที่เป็น client component และไม่มี component library / state library / chart library

---

## 7. Import จาก Notion

### แหล่งเดียว: data source `ค่าใช้จ่ายงานแต่ง (อัตโนมัติ)` 35 แถว

### วิธี: ไฟล์ JSON ไม่เรียก Notion API

ดึงข้อมูลออกมาเป็น `data/notion-export.json` commit ลง repo แล้ว `bun run db:seed` อ่านไฟล์นั้น

เหตุผล: เป็นการย้ายครั้งเดียวแล้วเลิกใช้ Notion การใส่ integration token เพิ่มใน env เพื่อรัน script ครั้งเดียวคือเพิ่มความลับที่ต้องดูแลตลอดไป ส่วนไฟล์ JSON **ตรวจได้ใน git diff ก่อนรัน** ซึ่งจำเป็นเพราะข้อมูลต้องแก้หลายจุด

`db:seed` ปฏิเสธที่จะรันถ้าตารางมีข้อมูลอยู่แล้ว ต้องใส่ `--force` และมี `--dry-run` ที่พิมพ์รายการที่จะ insert ออกมาให้ตรวจด้วยตา

### สิ่งที่ต้องแก้ในไฟล์ export

- **เติม `category` ให้ 11 แถวที่ว่าง** (ช่างภาพ, การ์ดเชิญ, ของชำร่วย, ซองถวายพระ, ชุดพรีเวดดิ้ง, ชุดเพื่อนบ่าวสาว, เครื่องดื่ม, ซองประตูเงินประตูทอง, สังฆทาน, เซ็ตอาหารพระ, ค่าประกันชุด) — ทุกค่าที่เติมเองต้องมาร์กในไฟล์ให้ตรวจได้
- **6 แถวที่ไม่มียอด ปล่อยเป็น `null`** ห้ามแปลงเป็น 0
- **"มัดจำ X" กับ "จ่าย X" เก็บเป็น 2 แถวเหมือนเดิม** ไม่ยุบรวม เพราะเป็นการจ่ายคนละครั้งจริง ความสัมพันธ์ระหว่างสองแถวไปอยู่ที่ `vendorId` ที่ชี้ vendor เดียวกัน

### `vendors` — สร้าง 8 เจ้า พร้อมผูก expenses ล่วงหน้า

| id | vendor | expenses ที่ผูก | รวม |
|---|---|---|---|
| 1 | APN Organize (คุณปอนด์) | มัดจำ · งวด 1 · งวด 2 · วันงาน | 79,000 |
| 2 | สโมสรร่วมเริงไชย | มัดจำ · วันงาน | 20,800 |
| 3 | ช่างภาพวันงาน | มัดจำ · วันงาน | 18,000 |
| 4 | ช่างแต่งหน้าวันงาน | มัดจำ · วันงาน | 23,000 |
| 5 | โต๊ะจีน | จ่ายโต๊ะจีน | 70,000 |
| 6 | ร้านของชำร่วย | มัดจำ · จ่าย (ยอดยังไม่ระบุ) | 5,000+ |
| 7 | วงดนตรี | มัดจำ · จ่าย (ยอดยังไม่ระบุ) | ยังไม่ระบุ |
| 8 | ร้านชุด | ไม่ผูกให้ (ดูข้างล่าง) | — |

ชื่อ / เบอร์ / LINE ของ vendor 3–8 เว้นว่างไว้ให้เจ้าของงานเติมเอง (มีข้อมูลอยู่แล้วแต่ไม่ได้บันทึกใน Notion)

vendor id 8 ถูกสร้างเป็นแถวเปล่ารอไว้เฉยๆ ไม่มี expenses ผูกให้ เพราะยังไม่รู้ว่าชุดทั้งหมดมาจากร้านเดียวหรือหลายร้าน ถ้าตรวจแล้วพบว่าเป็นหลายร้าน ให้เพิ่ม vendor แถวใหม่ในเว็บแล้วผูกเอง

**6 แถวที่ไม่ผูกให้ ต้องผูกเองตอนตรวจไฟล์:** ชุด 9 รายการ (ชุดสากล มัดจำ+จ่าย+ค่าประกัน · ชุดไทย มัดจำ+จ่าย · ชุดพรีเวดดิ้งสตูดิโอ · ชุดเขาใหญ่ · ชุดเพื่อนบ่าวสาว) และงานพรีเวดดิ้ง (ถ่ายพรีเวดดิ้ง มัดจำ+จ่าย · แต่งหน้าวันพรีเวดดิ้ง) — เดาไม่ได้ว่าเป็นเจ้าเดียวกันหรือคนละเจ้า

### Seed ต้อง all-or-nothing

ใช้ **`db.batch()`** ยิง 43 แถวเป็น transaction เดียว — `neon-http` **ไม่รองรับ `db.transaction()`** (ต้องเปลี่ยนไป driver WebSocket ซึ่งเราไม่ต้องการ)

ผลที่ตามมา: batch ส่งทุกคำสั่งพร้อมกัน จึงใช้ id ที่ DB สร้างให้ vendor มาผูก expenses ในชุดเดียวกันไม่ได้ → **ไฟล์ JSON ต้องระบุ `vendorId` เป็นเลข 1–8 ตรงๆ** (ซึ่งกลับดี เพราะอ่านไฟล์แล้วเห็นทันทีว่าแถวไหนผูกกับใคร)

> **ต้องไม่ลืม:** insert id ตรงๆ ลงคอลัมน์ `serial` ต้องปิดท้ายด้วย `setval` ให้ sequence ขยับตาม ไม่งั้น vendor ที่เพิ่มเองในเว็บทีหลังจะชน id ทันที

---

## 8. Error handling

### Server Action ไม่ throw

ทุก action คืน `{ ok: true } | { ok: false, message, fieldErrors? }` เสมอ exception ที่หลุดจาก server action จะกลายเป็น error เต็มหน้า ทั้งที่ผู้ใช้แค่กรอกผิดช่องเดียว

| กรณี | ทำอะไร |
|---|---|
| validation ไม่ผ่าน | `fieldErrors` → ข้อความใต้ช่องนั้น ข้อมูลที่พิมพ์ไว้ยังอยู่ครบ |
| DB error | log ฝั่ง server + คืนข้อความอ่านรู้เรื่อง |
| สำเร็จ | `revalidatePath` หน้าตัวเอง + `/` |

**แสดง error จริงจาก Postgres ใน `<details>` ที่กดขยายได้** — ปกติเป็นสิ่งต้องห้าม แต่แอปนี้มีผู้ชม 2 คนที่เป็นเจ้าของข้อมูลเอง การซ่อนข้อความจริงไว้ใน log บนเครื่อง server มีแต่ทำให้แก้ปัญหายากขึ้น **ถ้าวันหนึ่งใส่ auth แล้วเปิดให้คนอื่นเข้า ต้องปิดส่วนนี้**

### Validation — schema เดียว ใช้ 2 ที่

valibot schema ใน `src/lib/schemas/` ถูก import ทั้งจาก client component (ผ่าน `valibotResolver`) และจาก server action

**server ต้อง `v.parse` ซ้ำเสมอ** validation ฝั่ง client เป็นเรื่อง UX ไม่ใช่การรับประกันข้อมูล แท็บที่เปิดค้างข้ามวันหรือบั๊กใน component ส่งค่าเพี้ยนเข้ามาได้ ตัวที่การันตีว่า DB ไม่มีขยะคือ server เท่านั้น

ตัวเลขเงินเป็น transform schema (string เข้า → number ออก) จึงต้องประกาศ generic ให้ครบ:
```ts
useForm<v.InferInput<typeof s>, unknown, v.InferOutput<typeof s>>({ resolver: valibotResolver(s) })
```

### `src/lib/money.ts` — จุดที่พังแล้วเงียบที่สุด

> **แก้ตามคำสั่งเจ้าของงาน 2026-09-02:** ตัดชั้นแปลงสตริงเงินทิ้ง เหลือ `formatBaht` สำหรับแสดงผลอย่างเดียว · ช่องกรอกตัวเลขใช้ helper กลางที่ไม่รู้เรื่องสกุลเงิน (`optionalInteger` / `requiredInteger` / `countOrZero` ใน `src/lib/schemas/shared.ts`) · ผลที่ตามมา: อินพุตเลขไทย/`฿`/คำว่าบาท ไม่ถูกยอมรับอีกต่อไป

เหตุผลเดิมที่ยังใช้ได้เต็มที่: `parseInt("70,000")` คืน `70` โดยไม่ error ทำให้ยอดรวมทั้งเว็บผิดไปพันเท่าโดยไม่มีอะไรฟ้อง นี่คือ error ประเภทเดียวในระบบนี้ที่ทำให้ตัดสินใจเรื่องเงินผิดได้จริง — helper ตัวเลขกลางที่แทนที่ฟังก์ชันแปลงสตริงเงินตัวเดิมยังกันเคสนี้อยู่ (ตัด comma/ช่องว่างก่อน แล้ว reject ถ้าเหลืออักขระที่ไม่ใช่ตัวเลข) เพียงแต่ไม่ผูกกับสกุลเงินอีกต่อไป และไม่รับเลขไทย/สัญลักษณ์เงินเหมือนเดิม

**`formatBaht(n: number): string`** — เรียกได้จาก **component เท่านั้น** (ปกติผ่าน `<Money>`) คืนสตริงพร้อมหน่วย เช่น `formatBaht(70000)` → `'70,000 บาท'`
```ts
new Intl.NumberFormat('th-TH', { numberingSystem: 'latn', maximumFractionDigits: 0 })
```
ระบุ `numberingSystem: 'latn'` ตรงๆ ไม่พึ่งค่า default เพราะ `th-TH` มีระบบตัวเลขไทยในตัว ถ้าสภาพแวดล้อมไหนหยิบไปใช้จะได้ `๗๐,๐๐๐` โดยไม่มีอะไรเตือน และถ้า server กับ browser ตัดสินต่างกันจะเป็น hydration mismatch — **ตัวเลขที่แสดงบนจอต้องเป็นเลขอาราบิกเสมอ**

### Error boundary ระดับหน้า

- `src/app/error.tsx` — จับ error ตอน render (Neon ต่อไม่ติด) แสดง "โหลดข้อมูลไม่ได้" + ปุ่มลองใหม่ที่เรียก `reset()`
- `src/app/not-found.tsx` — 404
- `src/app/loading.tsx` — spinner (Neon cold start กินเวลาได้ ~1 วินาที)

### `DATABASE_URL` หาย → ล้มทันที

`src/db/index.ts` ตรวจ env ตอน import ถ้าไม่มีหรือรูปแบบผิด โยน error ที่บอกตรงๆ ว่าต้องตั้งค่าอะไร ดีกว่าไปพังตอน query แรกด้วยข้อความที่อ่านไม่รู้เรื่อง

### ความเสี่ยงที่ยอมรับ — เลือกไม่ทำ ไม่ใช่ลืม

- **ลบแล้วไม่มี undo** — ใช้ `confirm()` ถามก่อนลบเท่านั้น ไม่ทำ soft delete เพราะต้องเพิ่มคอลัมน์และใส่เงื่อนไข filter ทุก query ทุกโมดูลตลอดไป เพื่อกันเหตุที่ผู้ใช้ 2 คนแทบไม่เจอ
- **แก้พร้อมกันแล้วทับกัน (last write wins)** — optimistic locking ต้องเพิ่มคอลัมน์ version และหน้าจอ conflict ซึ่งไม่คุ้มกับผู้ใช้ 2 คนที่คุยกันได้

---

## 9. Testing

`bun test` — **unit test อย่างเดียว ไม่มีเทสที่แตะ DB** จึงไม่ต้องมี env ใดๆ สำหรับเทส (`.env.test` ไม่ถูกใช้ ลบทิ้งได้)

ข้อจำกัดนี้เป็นเหตุผลที่ยอดรวมทั้งหมดคำนวณด้วยฟังก์ชันบริสุทธิ์ใน `src/lib/totals.ts` แทน `SUM()` ใน SQL (ดูข้อ 6)

### รายการเทส

**`money.ts` — เขียนก่อนโค้ดจริง** (แก้ตามคำสั่งเจ้าของงาน 2026-09-02: เหลือเฉพาะ `formatBaht` ตัวเดียว ไม่มีฟังก์ชันแปลงสตริงเงินอีกแล้ว)
- `formatBaht`: `formatBaht(70000)` → `'70,000 บาท'` · `formatBaht(0)` → `'0 บาท'` และยืนยันว่าไม่มีอักขระเลขไทยหลุดออกมา

**valibot schema** — ไม่มีเทสแยก (แก้ตามคำสั่งเจ้าของงาน 2026-09-02: เทสครอบเฉพาะฟังก์ชัน ไม่ครอบ schema) พฤติกรรม parse ที่สำคัญ เช่น `null` (ยังไม่รู้ยอด) ต้องไม่ถูกกลืนเป็น `0` ถูกใช้เป็น fixture ใน `action-result.test.ts` ที่เทส `toActionResult` แทน

**`totals.ts`**
- `จ่ายแล้ว` / `ค้างจ่าย` / `สุทธิ` ถูกต้อง และแถวที่ `amount` เป็น `null` ไม่ถูกนับเป็น 0 แต่ไปโผล่ที่ตัวนับ "ยังไม่ระบุยอด N รายการ"
- สรุปแยกหมวดของหน้า `/expenses`
- ยอดแขก ประมาณการ vs ยืนยันแล้ว เมื่อ `companionsConfirmed` เป็น `null`
- ยอดต่อ vendor

### สิ่งที่ไม่มีอะไรตรวจให้อัตโนมัติ

- **จำนวน query ต่อหน้า / N+1** — เหลือ Drizzle logger ตอน dev (เปิดเมื่อ `APP_ENV=development` พิมพ์ทุก SQL พร้อมเวลา) ให้ดูเอง กับกฎ Biome ที่ห้าม `page.tsx` import โมดูล mutation ซึ่งยังบังคับได้จริงด้วย `bun run lint`
- **seed** — ทดแทนด้วย `bun run db:seed --dry-run`
- **E2E** — ไม่ทำใน v1 เขียนและดูแลแพงกว่าที่ได้คืนสำหรับเว็บ 6 หน้าผู้ใช้ 2 คน

---

## 10. Theme และ UI components

### ชั้นที่ 1 — token ที่เดียว เปลี่ยนทั้งแอป

`src/app/globals.css` เป็นแหล่งเดียวของสี / ระยะ / ฟอนต์ ไม่มีไฟล์ JS config

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
  --font-sans: "IBM Plex Sans Thai", system-ui, sans-serif;
}
```

`@theme` ให้ของ 2 อย่างจากการประกาศครั้งเดียว — Tailwind utility (`bg-surface`) **และ** ตัวแปร CSS จริง (`var(--color-surface)`) ที่ CSS ธรรมดาเรียกใช้ได้ จึงไม่ต้องประกาศสีซ้ำสองที่

### ชั้นที่ 2 — ของที่ซ้ำเป็น CSS จริง ไม่ใช่ Tailwind class ยาว

```css
@layer components {
  .card  { background: var(--color-surface); border: 1px solid var(--color-border);
           border-radius: var(--radius-card); padding: 1rem; }
  .input { border: 1px solid var(--color-border); border-radius: 8px; padding: .5rem .75rem; }
  .btn   { border-radius: 8px; padding: .5rem 1rem; font-weight: 500; }
  .table { width: 100%; border-collapse: collapse; }
  .badge { border-radius: 999px; padding: .125rem .5rem; font-size: .8125rem; }
}
```

markup เป็น `<div className="card">` **Tailwind utility เหลือใช้แค่ layout เฉพาะจุด** (`flex gap-3`, `grid grid-cols-2`, `mt-4`) ซึ่งเป็นสิ่งที่ไม่ซ้ำและไม่ควรตั้งชื่อ

### ชั้นที่ 3 — React component ใช้ร่วมทั้งแอป (`src/components/ui/`)

| component | หน้าที่ |
|---|---|
| `<Card>` | กล่องเนื้อหา |
| `<Button variant>` | `primary` / `ghost` / `danger` |
| `<Field>` | label + input + ข้อความ error (ต่อกับ react-hook-form) |
| `<Money>` | แสดงจำนวนเงิน |
| `<Badge status>` | จ่ายแล้ว / ค้างจ่าย / ยังไม่ระบุ / rsvp / checklist status |
| `<DataTable>` | หัวตาราง + แถว + สถานะว่าง |
| `<PageHeader>` | `<h1>` + ตัวเลขสรุป |
| `<ConfirmButton>` | ถามก่อนลบ |
| `<EmptyState>` | ยังไม่มีข้อมูล |
| `<Spinner>` | `loading.tsx` |

**`<Money>` เป็นตัวบังคับกฎ "format ตอนแสดงเท่านั้น" ให้เกิดขึ้นจริง** ถ้าทุกที่ที่แสดงเงินต้องผ่าน `<Money value={70000} />` ก็ไม่มีใครมีโอกาสเผลอเรียก `formatBaht` ในชั้น logic หรือส่งสตริงเงินไปมา

### สีตามสถานะ

```ts
// src/lib/ui.ts
export const STATUS_STYLE = {
  paid:    'bg-paid/10 text-paid',
  unpaid:  'bg-unpaid/10 text-unpaid',
  unknown: 'bg-unknown/10 text-unknown',
} as const
```

`<Badge>` หยิบจาก map นี้ผ่าน `cn()` เพิ่มสถานะใหม่คือเพิ่มบรรทัดเดียว ไม่ต้องไล่แก้ `if` ที่กระจายตามหน้า

### dark mode

ไม่ทำใน v1 แต่โครง token รองรับแล้ว — เพิ่มทีหลังคือย้ายค่าไป `:root` / `[data-theme="dark"]` แล้วชี้ด้วย `@theme inline` ไม่ต้องแตะ component

---

## 11. Semantic HTML และกฎการเขียน Next.js

### Semantic HTML

เปิด rule group `a11y` ของ Biome ให้ `bun run lint` ตรวจ (`useButtonType`, `noLabelWithoutControl`, `useKeyWithClickEvents` ฯลฯ) ส่วนที่ lint ตรวจไม่ได้เป็นข้อบังคับ:

| ที่ | ใช้อะไร | เพราะอะไร |
|---|---|---|
| ตารางทั้ง 5 โมดูล | `<table><thead><th scope="col">` + `<caption>` | ข้อมูลเป็นตารางจริง — div grid ทำให้ screen reader อ่านไม่ออกว่าเลขอยู่คอลัมน์ไหน |
| `<Money>` | `<data value="70000">70,000</data>` | ถือค่าดิบกับค่าที่แสดงไว้ในแท็กเดียว |
| วันที่ | `<time dateTime="2026-11-28">28 พ.ย. 69</time>` | ปีไทยกับปีสากลต่างกัน `dateTime` เก็บค่าที่เครื่องอ่านถูก |
| `<Field>` | `useId()` ผูก `<label htmlFor>` ↔ input + `aria-invalid` + `aria-describedby` ชี้ข้อความ error | คลิก label แล้ว focus เข้าช่อง และ error ถูกอ่านออกเสียง |
| `<Badge>` | มีข้อความเสมอ ไม่ใช่แค่สี | สีอย่างเดียวคนตาบอดสีแยกไม่ออก และปริ้นขาวดำหายหมด |
| toggle จ่ายแล้ว / rsvp | `<input type="checkbox">` จริง | ได้ keyboard และ screen reader ฟรี ไม่ต้องเขียน `role`/`tabIndex`/`onKeyDown` เอง |
| โครงหน้า | `<nav>` · `<main>` · `<h1>` เดียวต่อหน้าผ่าน `<PageHeader>` | |
| root | `<html lang="th">` | ให้ browser เลือกฟอนต์ ตัดคำ และอ่านออกเสียงถูกภาษา |

### Next.js

**1. `await connection()` ในชั้น query — ถ้าไม่ทำ เว็บจะโชว์ข้อมูลค้างตั้งแต่วัน build**

Next ติดตามเฉพาะ `fetch` มันไม่รู้ว่า Drizzle ไปแตะ DB มา หน้าที่ไม่ได้เรียก dynamic API จะถูก prerender ตอน build → query วิ่งครั้งเดียวตอน build → ยอดเงินบนเว็บค้างอยู่ ณ วันนั้นตลอดไปโดยไม่มี error ให้เห็น

ใส่ `await connection()` (จาก `next/server`) ไว้ใน `src/db/queries.ts` **ที่เดียว** ทุกหน้าได้ผลหมด ดีกว่า `export const dynamic = 'force-dynamic'` ที่ต้องเขียนซ้ำ 6 หน้าและลืมได้ตอนเพิ่มหน้าที่ 7

**2. `robots: { index: false }` ผ่าน `metadata` ที่ root layout** — v1 **ไม่มีไฟล์ `middleware.ts`** ตอนจะเพิ่ม password ค่อยสร้างขึ้นมา

**3. `'use client'` เฉพาะ leaf ที่ต้องโต้ตอบ** — ฟอร์ม, toggle, ช่อง filter เท่านั้น ห้ามอยู่ใน `page.tsx` หรือ `layout.tsx`

**4. `next/font` โหลดฟอนต์ไทยแบบ self-host** ไม่ใช่ `<link>` ไป Google Fonts — ตัด render-blocking request และไม่มี layout shift ผูกเข้ากับ token `--font-sans`

**5. `next/link` ทุกลิงก์ภายใน**

**6. TypeScript `strict: true`**

**7. ไม่ตั้ง `export const dynamic` เอง** ปล่อยให้ `connection()` จัดการ

---

## 12. Environment

```
APP_ENV=development|production
DATABASE_URL=<Neon connection string>
```

`.gitignore` ครอบ `.env`, `.env.test`, `.env*.local` และยกเว้น `.env.example` ไว้ให้ commit ได้

ไม่มีตัวแปรอื่นนอกจากนี้ — ไม่มี `AUTH_SECRET`, ไม่มี Notion token, ไม่มี `TEST_DATABASE_URL`

---

## 13. ลำดับงานที่แนะนำ

1. `.gitignore` · scaffold Next.js + Bun + Biome + Tailwind v4 · `strict: true`
2. `money.ts` พร้อมเทส (เขียนเทสก่อน)
3. `schema.ts` + drizzle config + migration แรก
4. `data/notion-export.json` + `db:seed` (`--dry-run` ก่อน) → ตรวจข้อมูล → seed จริง
5. `totals.ts` พร้อมเทส · valibot schemas พร้อมเทส
6. `src/components/ui/*` + `globals.css`
7. โมดูลทีละตัว: expenses → envelopes → dashboard → guests → checklist → vendors
8. `error.tsx` / `loading.tsx` / `not-found.tsx` / metadata

รายละเอียดจริงอยู่ใน implementation plan ที่จะเขียนต่อจาก spec นี้

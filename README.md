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

## Deploy

- ตั้ง `DATABASE_URL` และ `APP_ENV=production` ใน environment ของ host
- **เลือก region ของ host ให้ตรงกับ region ของ Neon** ไม่งั้นทุก query ช้าขึ้น 10 เท่า
- ยังไม่มีระบบ login ตามที่เจ้าของงานเลือกไว้ ถ้าจะเพิ่มรหัสผ่านภายหลัง
  ให้สร้าง `middleware.ts` ไฟล์เดียว แล้ว **ปิด `<details>` ที่โชว์ error จริงใน `src/lib/action-result.ts` ด้วย**

## เทส

    bun test        # unit test ล้วน ไม่แตะ DB
    bun run lint    # Biome รวมกฎ a11y และกฎห้าม page.tsx import โมดูล mutation

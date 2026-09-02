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

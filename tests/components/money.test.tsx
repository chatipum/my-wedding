import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Money } from '@/components/ui/money'

describe('<Money>', () => {
  it('แสดงเป็น <data> ที่ถือทั้งค่าดิบและค่าที่แสดง', () => {
    const html = renderToStaticMarkup(<Money value={70000} />)
    expect(html).toContain('value="70000"')
    expect(html).toContain('70,000')
    // formatBaht ต่อหน่วยท้ายเสมอ (แก้ตามคำสั่งเจ้าของงาน 2026-09-02)
    expect(html).toContain('บาท')
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

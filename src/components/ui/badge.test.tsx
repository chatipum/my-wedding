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

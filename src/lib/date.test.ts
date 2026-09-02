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

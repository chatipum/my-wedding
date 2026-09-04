import { describe, expect, it } from 'bun:test'
import { formatBaht } from '@/lib/money'

describe('formatBaht', () => {
  it('ใส่จุลภาคและต่อท้ายด้วยหน่วย', () => {
    expect(formatBaht(70000)).toBe('70,000 บาท')
    expect(formatBaht(1234567)).toBe('1,234,567 บาท')
  })

  it('ศูนย์ก็ยังแสดงเป็นศูนย์ ไม่ใช่ค่าว่าง', () => {
    expect(formatBaht(0)).toBe('0 บาท')
  })

  it('ไม่มีเลขไทยหลุดออกมา', () => {
    expect(formatBaht(70000)).not.toMatch(/[๐-๙]/)
  })
})

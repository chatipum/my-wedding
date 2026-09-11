import { describe, expect, it } from 'bun:test'
import { addQuickAmount, formatBaht } from '@/lib/money'

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

describe('addQuickAmount', () => {
  it('ช่องว่างอยู่ กดปุ่มแล้วได้ยอดของปุ่มนั้น', () => {
    expect(addQuickAmount('', 500)).toBe('500')
  })

  it('กดซ้ำหลายปุ่มแล้วบวกสะสม', () => {
    expect(addQuickAmount('500', 1000)).toBe('1500')
  })

  it('ค่าที่มีจุลภาคหรือช่องว่างก็บวกได้', () => {
    expect(addQuickAmount('1,000', 100)).toBe('1100')
    expect(addQuickAmount(' 200 ', 200)).toBe('400')
  })

  it('ค่าที่ไม่ใช่ตัวเลขถือเป็นศูนย์ — กดปุ่มแล้วเริ่มนับใหม่', () => {
    expect(addQuickAmount('abc', 100)).toBe('100')
  })
})

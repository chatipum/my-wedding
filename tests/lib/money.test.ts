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

  it('ปฏิเสธสัญลักษณ์บาทเพียงอย่างเดียว', () => {
    expect(() => parseBaht('฿')).toThrow()
    expect(() => parseBaht(',')).toThrow()
    expect(() => parseBaht('บาท')).toThrow()
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

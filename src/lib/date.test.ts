import { describe, expect, it } from 'bun:test'
import { formatThaiDate, formatThaiDateTime, todayIso } from '@/lib/date'

describe('formatThaiDate', () => {
  it('แปลงเป็นวันเดือนย่อปี พ.ศ. สองหลัก', () => {
    expect(formatThaiDate('2026-11-28')).toBe('28 พ.ย. 69')
    expect(formatThaiDate('2026-01-05')).toBe('5 ม.ค. 69')
  })

  it('ปฏิเสธรูปแบบที่ไม่ใช่ ปปปป-ดด-วว', () => {
    expect(() => formatThaiDate('28/11/2569')).toThrow()
  })
})

describe('todayIso', () => {
  it('คืนสตริงรูปแบบ ปปปป-ดด-วว', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('คำนวณจากเวลาไทย (UTC+7) ไม่ใช่ UTC ของเครื่อง server', () => {
    // ไทยไม่มี DST ออฟเซ็ตคงที่ +7 เสมอ — คำนวณอิสระจากค่าที่จะทดสอบ ไม่ปักวันที่ตายตัวเพื่อกัน flaky
    const bangkokNow = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const expected = bangkokNow.toISOString().slice(0, 10)
    expect(todayIso()).toBe(expected)
  })
})

describe('formatThaiDateTime', () => {
  it('แสดงวันที่แบบไทยต่อด้วยเวลา 24 ชม. ตามเวลาไทย', () => {
    expect(formatThaiDateTime(new Date('2026-11-28T12:05:00Z'))).toBe('28 พ.ย. 69 19:05')
  })

  it('ข้ามวันตามเวลาไทย ไม่ใช่ UTC', () => {
    expect(formatThaiDateTime(new Date('2026-11-28T17:30:00Z'))).toBe('29 พ.ย. 69 00:30')
  })
})

import { describe, expect, it } from 'bun:test'
import {
  countGuests,
  NO_CATEGORY,
  sumEnvelopes,
  summarizeByCategory,
  summarizeByVendor,
  summarizeExpenses,
  summarizeNet,
  upcomingDeadlines,
} from '@/lib/totals'

describe('summarizeExpenses', () => {
  it('แยกจ่ายแล้วกับค้างจ่าย', () => {
    expect(
      summarizeExpenses([
        { amount: 20000, isPaid: true },
        { amount: 50000, isPaid: false },
      ]),
    ).toEqual({ paid: 20000, unpaid: 50000, unknownCount: 0 })
  })

  it('แถวที่ amount เป็น null ไม่ถูกนับเป็น 0 แต่ไปโผล่ที่ unknownCount', () => {
    const summary = summarizeExpenses([
      { amount: 1000, isPaid: true },
      { amount: null, isPaid: false },
      { amount: null, isPaid: true },
    ])
    expect(summary).toEqual({ paid: 1000, unpaid: 0, unknownCount: 2 })
  })

  it('ไม่มีแถวเลยก็ไม่พัง', () => {
    expect(summarizeExpenses([])).toEqual({ paid: 0, unpaid: 0, unknownCount: 0 })
  })
})

describe('summarizeByCategory', () => {
  it('รวมตามหมวดและเรียงยอดมากไปน้อย', () => {
    const result = summarizeByCategory([
      { category: 'สถานที่', amount: 20800, isPaid: true },
      { category: 'อาหาร', amount: 70000, isPaid: false },
      { category: 'สถานที่', amount: 5000, isPaid: false },
    ])
    expect(result.map((r) => r.category)).toEqual(['อาหาร', 'สถานที่'])
    expect(result[0]).toEqual({
      category: 'อาหาร',
      paid: 0,
      unpaid: 70000,
      total: 70000,
      unknownCount: 0,
      count: 1,
    })
    expect(result[1]).toEqual({
      category: 'สถานที่',
      paid: 20800,
      unpaid: 5000,
      total: 25800,
      unknownCount: 0,
      count: 2,
    })
  })

  it('หมวดว่างถูกจัดเข้า NO_CATEGORY และยังนับ unknownCount ของตัวเอง', () => {
    const result = summarizeByCategory([{ category: null, amount: null, isPaid: false }])
    expect(result[0]).toEqual({
      category: NO_CATEGORY,
      paid: 0,
      unpaid: 0,
      total: 0,
      unknownCount: 1,
      count: 1,
    })
  })
})

describe('sumEnvelopes', () => {
  it('บวกยอดซองทั้งหมด', () => {
    expect(sumEnvelopes([{ amount: 1000 }, { amount: 2000 }])).toBe(3000)
    expect(sumEnvelopes([])).toBe(0)
  })
})

describe('summarizeNet', () => {
  it('สุทธิ = ซองรับ − จ่ายแล้ว − ค้างจ่าย', () => {
    const net = summarizeNet(
      [
        { amount: 20000, isPaid: true },
        { amount: 50000, isPaid: false },
        { amount: null, isPaid: false },
      ],
      [{ amount: 100000 }],
    )
    expect(net).toEqual({
      received: 100000,
      paid: 20000,
      unpaid: 50000,
      net: 30000,
      unknownCount: 1,
    })
  })

  it('ติดลบได้ ไม่ปัดขึ้นเป็นศูนย์', () => {
    expect(summarizeNet([{ amount: 500, isPaid: true }], []).net).toBe(-500)
  })
})

describe('countGuests', () => {
  it('ประมาณการนับทุกแถวที่ยังไม่ปฏิเสธ บวกผู้ติดตามที่คาดไว้', () => {
    const counts = countGuests([
      { rsvp: 'pending', companionsEstimated: 2, companionsConfirmed: null },
      { rsvp: 'yes', companionsEstimated: 1, companionsConfirmed: null },
      { rsvp: 'no', companionsEstimated: 3, companionsConfirmed: null },
    ])
    expect(counts.estimated).toBe(5)
  })

  it('ยืนยันแล้วนับเฉพาะ rsvp=yes และใช้ confirmed ถ้ามี', () => {
    const counts = countGuests([
      { rsvp: 'yes', companionsEstimated: 2, companionsConfirmed: 0 },
      { rsvp: 'yes', companionsEstimated: 1, companionsConfirmed: 3 },
      { rsvp: 'pending', companionsEstimated: 5, companionsConfirmed: null },
    ])
    expect(counts.confirmed).toBe(5)
  })

  it('companionsConfirmed เป็น null (ยังไม่ได้ถาม) ตกกลับไปใช้ค่าที่คาดไว้', () => {
    expect(
      countGuests([{ rsvp: 'yes', companionsEstimated: 2, companionsConfirmed: null }]).confirmed,
    ).toBe(3)
  })

  it('confirmed = 0 ต่างจาก null — ถามแล้วมาคนเดียว', () => {
    expect(
      countGuests([{ rsvp: 'yes', companionsEstimated: 2, companionsConfirmed: 0 }]).confirmed,
    ).toBe(1)
  })

  it('นับจำนวนคนที่ปฏิเสธและที่ยังไม่ตอบ', () => {
    const counts = countGuests([
      { rsvp: 'no', companionsEstimated: 0, companionsConfirmed: null },
      { rsvp: 'pending', companionsEstimated: 0, companionsConfirmed: null },
      { rsvp: 'pending', companionsEstimated: 0, companionsConfirmed: null },
    ])
    expect(counts.declined).toBe(1)
    expect(counts.pending).toBe(2)
  })
})

describe('summarizeByVendor', () => {
  it('รวมยอดต่อ vendor และข้ามแถวที่ไม่ได้ผูก vendor', () => {
    const map = summarizeByVendor([
      { vendorId: 1, amount: 20000, isPaid: true },
      { vendorId: 1, amount: 59000, isPaid: false },
      { vendorId: 2, amount: null, isPaid: false },
      { vendorId: null, amount: 9999, isPaid: false },
    ])
    expect(map.get(1)).toEqual({
      paid: 20000,
      unpaid: 59000,
      total: 79000,
      unknownCount: 0,
      count: 2,
    })
    expect(map.get(2)).toEqual({ paid: 0, unpaid: 0, total: 0, unknownCount: 1, count: 1 })
    expect(map.has(0)).toBe(false)
    expect(map.size).toBe(2)
  })
})

describe('upcomingDeadlines', () => {
  it('เอาเฉพาะงานที่ยังไม่เสร็จและมี deadline เรียงจากใกล้ที่สุด', () => {
    const rows = upcomingDeadlines([
      { id: 1, name: 'จองช่างภาพ', status: 'done', deadline: '2026-09-10' },
      { id: 2, name: 'ส่งการ์ด', status: 'in_progress', deadline: '2026-10-01' },
      { id: 3, name: 'ลองชุด', status: 'not_started', deadline: '2026-09-20' },
      { id: 4, name: 'ของชำร่วย', status: 'not_started', deadline: null },
    ])
    expect(rows.map((r) => r.id)).toEqual([3, 2])
  })

  it('จำกัดจำนวนตาม limit', () => {
    const rows = upcomingDeadlines(
      [
        { id: 1, name: 'a', status: 'not_started', deadline: '2026-09-01' },
        { id: 2, name: 'b', status: 'not_started', deadline: '2026-09-02' },
      ],
      1,
    )
    expect(rows.map((r) => r.id)).toEqual([1])
  })
})

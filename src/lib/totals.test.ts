import { describe, expect, it } from 'bun:test'
import {
  countGuests,
  countGuestsBySide,
  NO_CATEGORY,
  sumEnvelopes,
  summarizeByCategory,
  summarizeByVendor,
  summarizeExpenses,
  summarizeNet,
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
  it('ยืนยันแล้วนับเฉพาะ rsvp=yes บวกผู้ติดตามที่ยืนยันแล้ว', () => {
    const counts = countGuests([
      { rsvp: 'yes', companionsConfirmed: 0, invitationGiven: false },
      { rsvp: 'yes', companionsConfirmed: 3, invitationGiven: false },
      { rsvp: 'pending', companionsConfirmed: 5, invitationGiven: false },
    ])
    expect(counts.confirmed).toBe(5)
  })

  it('companionsConfirmed เป็น null (ยังไม่ได้ถาม) นับแค่ตัวแขกเอง ไม่เดาผู้ติดตามให้', () => {
    expect(
      countGuests([{ rsvp: 'yes', companionsConfirmed: null, invitationGiven: false }]).confirmed,
    ).toBe(1)
  })

  it('ถามแล้วมาคนเดียว (0) ได้ยอดเท่ากับยังไม่ถาม (null) — ต่างกันแค่ตอนแสดงผล', () => {
    const asked = countGuests([{ rsvp: 'yes', companionsConfirmed: 0, invitationGiven: false }])
    const notAsked = countGuests([
      { rsvp: 'yes', companionsConfirmed: null, invitationGiven: false },
    ])
    expect(asked.confirmed).toBe(notAsked.confirmed)
  })

  it('confirmedRows นับเป็นแถว ไม่ใช่คน — เป็นตัวหารของคนเฉลี่ยต่อซอง', () => {
    const counts = countGuests([
      { rsvp: 'yes', companionsConfirmed: 3, invitationGiven: false },
      { rsvp: 'yes', companionsConfirmed: null, invitationGiven: false },
      { rsvp: 'pending', companionsConfirmed: null, invitationGiven: false },
      { rsvp: 'no', companionsConfirmed: null, invitationGiven: false },
    ])
    expect(counts.confirmedRows).toBe(2)
    expect(counts.confirmed).toBe(5)
  })

  it('ไม่มียอดประมาณการหลงเหลืออยู่ในผลนับ', () => {
    expect(countGuests([])).not.toHaveProperty('estimated')
  })

  it('นับจำนวนคนที่ปฏิเสธและที่ยังไม่ตอบ', () => {
    const counts = countGuests([
      { rsvp: 'no', companionsConfirmed: null, invitationGiven: false },
      { rsvp: 'pending', companionsConfirmed: null, invitationGiven: false },
      { rsvp: 'pending', companionsConfirmed: null, invitationGiven: false },
    ])
    expect(counts.declined).toBe(1)
    expect(counts.pending).toBe(2)
  })

  it('นับซองที่แจกแล้ว รวมคนที่ตอบว่าไม่มาด้วย เพราะการ์ดถูกแจกไปแล้วจริง', () => {
    const counts = countGuests([
      { rsvp: 'yes', companionsConfirmed: null, invitationGiven: true },
      { rsvp: 'no', companionsConfirmed: null, invitationGiven: true },
      { rsvp: 'pending', companionsConfirmed: null, invitationGiven: false },
    ])
    expect(counts.invitationsGiven).toBe(2)
  })

  it('ไม่มีแถวเลย ตัวนับซองเป็นศูนย์', () => {
    expect(countGuests([]).invitationsGiven).toBe(0)
  })

  it('total นับทุกแถว รวมคนที่ตอบว่าไม่มา — เป็นตัวหารของยอดแจกซอง', () => {
    const counts = countGuests([
      { rsvp: 'yes', companionsConfirmed: 3, invitationGiven: true },
      { rsvp: 'no', companionsConfirmed: null, invitationGiven: true },
      { rsvp: 'pending', companionsConfirmed: null, invitationGiven: false },
    ])
    expect(counts.total).toBe(3)
  })
})

describe('countGuestsBySide', () => {
  const rows = [
    {
      side: 'groom' as const,
      rsvp: 'yes' as const,
      companionsConfirmed: 2,
      invitationGiven: true,
    },
    {
      side: 'groom' as const,
      rsvp: 'pending' as const,
      companionsConfirmed: null,
      invitationGiven: false,
    },
    {
      side: 'bride' as const,
      rsvp: 'yes' as const,
      companionsConfirmed: null,
      invitationGiven: true,
    },
    {
      side: 'bride' as const,
      rsvp: 'no' as const,
      companionsConfirmed: null,
      invitationGiven: true,
    },
  ]

  it('แยกแถวเข้าฝั่งของตัวเอง แล้วนับด้วยกฎเดียวกับ countGuests', () => {
    const bySide = countGuestsBySide(rows)
    expect(bySide.groom.confirmed).toBe(3)
    expect(bySide.groom.confirmedRows).toBe(1)
    expect(bySide.bride.confirmed).toBe(1)
  })

  it('สองฝั่งบวกกันแล้วเท่ากับนับรวมทั้งหมด', () => {
    const bySide = countGuestsBySide(rows)
    const all = countGuests(rows)
    expect(bySide.groom.confirmed + bySide.bride.confirmed).toBe(all.confirmed)
    expect(bySide.groom.confirmedRows + bySide.bride.confirmedRows).toBe(all.confirmedRows)
    expect(bySide.groom.total + bySide.bride.total).toBe(all.total)
  })

  it('ฝั่งที่ไม่มีแขกเลยได้ตัวนับเป็นศูนย์ ไม่ใช่ค่าหาย', () => {
    const bySide = countGuestsBySide([rows[0]])
    expect(bySide.bride.total).toBe(0)
    expect(bySide.bride.confirmed).toBe(0)
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

import { describe, expect, it } from 'bun:test'
import { chairLabels, TABLE_INDEXES, TOTAL_SEATS, tableRow, tableSide } from '@/lib/seating'

describe('ผัง', () => {
  it('ที่นั่งรวม 416 ตามผังเวที4', () => {
    expect(TOTAL_SEATS).toBe(416)
  })

  it('ช่องใต้โต๊ะยาว และมุมแถวสุดท้ายทั้งสองข้างไม่มีโต๊ะ', () => {
    expect(TABLE_INDEXES).not.toContain(9)
    expect(TABLE_INDEXES).not.toContain(48)
    expect(TABLE_INDEXES).not.toContain(53)
  })
})

describe('tableSide', () => {
  it('3 คอลัมน์ซ้ายเป็นฝั่งเจ้าสาว', () => {
    expect(tableSide(0)).toBe('bride')
    expect(tableSide(50)).toBe('bride')
  })

  it('3 คอลัมน์ขวาเป็นฝั่งเจ้าบ่าว รวมโต๊ะยาว', () => {
    expect(tableSide(3)).toBe('groom')
    expect(tableSide(52)).toBe('groom')
  })
})

describe('tableRow', () => {
  it('นับแถวจากเวทีเริ่มที่ 1', () => {
    expect(tableRow(5)).toBe(1)
    expect(tableRow(6)).toBe(2)
  })
})

describe('chairLabels', () => {
  it('แขกหลักใช้ชื่อย่อ ผู้ติดตามต่อเลขลำดับ', () => {
    expect(
      chairLabels([{ name: 'สมชาย', nickname: 'ชาย', rsvp: 'yes', companionsConfirmed: 2 }]),
    ).toEqual(['ชาย', 'ชาย2', 'ชาย3'])
  })

  it('ไม่มีชื่อย่อ ใช้ 2 ตัวแรกของชื่อโดยไม่ตัดสระ/วรรณยุกต์ทิ้ง', () => {
    expect(
      chairLabels([{ name: 'นิ่มนวล', nickname: null, rsvp: 'yes', companionsConfirmed: 0 }]),
    ).toEqual(['นิ่ม'])
  })

  it('แขกที่ยังไม่ตอบได้เก้าอี้ตัวเดียว แม้กรอกผู้ติดตามไว้แล้ว', () => {
    expect(
      chairLabels([{ name: 'สมชาย', nickname: null, rsvp: 'pending', companionsConfirmed: 5 }]),
    ).toEqual(['สม'])
  })
})

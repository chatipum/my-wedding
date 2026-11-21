import { describe, expect, it } from 'bun:test'
import { seatsUsedByTable, tableRow, tableSide } from '@/lib/seating'

describe('tableSide', () => {
  it('3 คอลัมน์ซ้ายเป็นฝั่งเจ้าสาว', () => {
    expect(tableSide(0)).toBe('bride')
    expect(tableSide(2)).toBe('bride')
  })

  it('3 คอลัมน์ขวาเป็นฝั่งเจ้าบ่าว รวมโต๊ะสุดท้ายของผัง', () => {
    expect(tableSide(3)).toBe('groom')
    expect(tableSide(47)).toBe('groom')
  })
})

describe('tableRow', () => {
  it('นับแถวจากเวทีเริ่มที่ 1', () => {
    expect(tableRow(5)).toBe(1)
    expect(tableRow(6)).toBe(2)
  })
})

describe('seatsUsedByTable', () => {
  it('รวมตัวแขก + ผู้ติดตามที่ยืนยันแล้ว แยกตามโต๊ะ', () => {
    const used = seatsUsedByTable([
      { rsvp: 'yes', companionsConfirmed: 3, tableIndex: 0 },
      { rsvp: 'yes', companionsConfirmed: null, tableIndex: 0 },
      { rsvp: 'yes', companionsConfirmed: 1, tableIndex: 7 },
    ])
    expect(used.get(0)).toBe(5)
    expect(used.get(7)).toBe(2)
  })

  it('แขกที่ยังไม่ตอบนับ 1 ที่ แม้กรอกผู้ติดตามไว้แล้ว', () => {
    const used = seatsUsedByTable([{ rsvp: 'pending', companionsConfirmed: 5, tableIndex: 0 }])
    expect(used.get(0)).toBe(1)
  })

  it('แขกที่ยังไม่มีโต๊ะไม่ถูกนับเข้าโต๊ะไหน', () => {
    expect(seatsUsedByTable([{ rsvp: 'yes', companionsConfirmed: 2, tableIndex: null }]).size).toBe(
      0,
    )
  })
})

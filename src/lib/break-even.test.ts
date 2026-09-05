import { describe, expect, it } from 'bun:test'
import { calculateBreakEven, DEFAULT_ENVELOPE_AMOUNT, GUEST_CAPACITY } from '@/lib/break-even'

const NO_GUESTS = { estimated: 0, total: 0, declined: 0 }

describe('calculateBreakEven', () => {
  it('ปัดจำนวนซองขึ้นเสมอ — ขาดอีกบาทเดียวก็ต้องเพิ่มอีกซอง', () => {
    const result = calculateBreakEven({
      totalExpense: 499_001,
      perEnvelope: 1000,
      guestCounts: NO_GUESTS,
    })
    expect(result?.envelopesNeeded).toBe(500)
  })

  it('หารลงตัวแล้วไม่บวกซองเกินมา', () => {
    const result = calculateBreakEven({
      totalExpense: 500_000,
      perEnvelope: 1000,
      guestCounts: NO_GUESTS,
    })
    expect(result?.envelopesNeeded).toBe(500)
  })

  it('ยังไม่มีค่าใช้จ่ายเลย ไม่ต้องแจกสักซอง', () => {
    const result = calculateBreakEven({
      totalExpense: 0,
      perEnvelope: DEFAULT_ENVELOPE_AMOUNT,
      guestCounts: NO_GUESTS,
    })
    expect(result?.envelopesNeeded).toBe(0)
    expect(result?.isFeasible).toBe(true)
  })

  it('แปลงเพดานคนเป็นเพดานซองด้วยคนเฉลี่ยต่อซอง แล้วปัดลง', () => {
    const result = calculateBreakEven({
      totalExpense: 100_000,
      perEnvelope: 500,
      guestCounts: { estimated: 300, total: 200, declined: 0 },
    })
    expect(result?.peoplePerEnvelope).toBe(1.5)
    // 400 ÷ 1.5 = 266.67 — ปัดขึ้นแปลว่าเชิญเกินที่นั่ง
    expect(result?.envelopeCapacity).toBe(266)
  })

  it('แถวที่ตอบว่าไม่มาไม่ถูกนับเป็นตัวหาร เพราะไม่ได้กินที่นั่ง', () => {
    const result = calculateBreakEven({
      totalExpense: 100_000,
      perEnvelope: 500,
      guestCounts: { estimated: 300, total: 210, declined: 10 },
    })
    expect(result?.peoplePerEnvelope).toBe(1.5)
  })

  it('ยังไม่มีแขกในระบบ ถอยไปใช้ 1 คนต่อซอง ไม่ใช่หารด้วยศูนย์', () => {
    const result = calculateBreakEven({
      totalExpense: 100_000,
      perEnvelope: 500,
      guestCounts: NO_GUESTS,
    })
    expect(result?.peoplePerEnvelope).toBe(1)
    expect(result?.envelopeCapacity).toBe(GUEST_CAPACITY)
  })

  it('ทุกแถวตอบว่าไม่มา ก็ยังถอยไปใช้ 1 คนต่อซอง', () => {
    const result = calculateBreakEven({
      totalExpense: 100_000,
      perEnvelope: 500,
      guestCounts: { estimated: 0, total: 12, declined: 12 },
    })
    expect(result?.peoplePerEnvelope).toBe(1)
  })

  it('ต้องการซองเกินเพดาน — บอกว่าเกินไปกี่ซอง', () => {
    const result = calculateBreakEven({
      totalExpense: 500_000,
      perEnvelope: 500,
      guestCounts: NO_GUESTS,
    })
    expect(result?.envelopesNeeded).toBe(1000)
    expect(result?.isFeasible).toBe(false)
    expect(result?.envelopesOverCapacity).toBe(600)
  })

  it('พอดีเพดานยังถือว่าคุ้มทุนได้', () => {
    const result = calculateBreakEven({
      totalExpense: 200_000,
      perEnvelope: 500,
      guestCounts: NO_GUESTS,
    })
    expect(result?.envelopesNeeded).toBe(GUEST_CAPACITY)
    expect(result?.isFeasible).toBe(true)
    expect(result?.envelopesOverCapacity).toBe(0)
  })

  it('ยอดต่อซองเป็นศูนย์หรือติดลบคืน null — ไม่คืนตัวเลขมั่วตอนช่องกรอกว่าง', () => {
    const base = { totalExpense: 100_000, guestCounts: NO_GUESTS }
    expect(calculateBreakEven({ ...base, perEnvelope: 0 })).toBeNull()
    expect(calculateBreakEven({ ...base, perEnvelope: -500 })).toBeNull()
    expect(calculateBreakEven({ ...base, perEnvelope: Number.NaN })).toBeNull()
  })

  it('รับเพดานที่ส่งเข้ามาแทนค่าคงที่ได้', () => {
    const result = calculateBreakEven({
      totalExpense: 100_000,
      perEnvelope: 500,
      guestCounts: NO_GUESTS,
      capacity: 120,
    })
    expect(result?.envelopeCapacity).toBe(120)
    expect(result?.isFeasible).toBe(false)
  })
})

import { describe, expect, it } from 'bun:test'
import { parseSeedFile, seedStats } from '@/db/seed-data'

const valid = {
  vendors: [
    {
      id: 1,
      name: 'APN Organize (คุณปอนด์)',
      role: 'ออร์แกไนเซอร์',
      phone: null,
      line: null,
      totalPrice: 79000,
      note: null,
    },
  ],
  expenses: [
    {
      name: 'มัดจำ APN',
      category: 'ออร์แกไนเซอร์',
      categorySource: 'notion',
      amount: 20000,
      isPaid: true,
      vendorId: 1,
      dueDate: null,
      note: null,
    },
    {
      name: 'เครื่องดื่ม',
      category: 'เครื่องดื่ม',
      categorySource: 'filled-in',
      amount: null,
      isPaid: false,
      vendorId: null,
      dueDate: null,
      note: null,
    },
  ],
}

describe('parseSeedFile', () => {
  it('รับไฟล์ที่ถูกต้อง', () => {
    const file = parseSeedFile(valid)
    expect(file.expenses).toHaveLength(2)
  })

  it('เก็บ amount null ไว้เป็น null ไม่แปลงเป็น 0', () => {
    const file = parseSeedFile(valid)
    expect(file.expenses[1]?.amount).toBeNull()
  })

  it('ปฏิเสธ amount ที่เป็นสตริง', () => {
    expect(() =>
      parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], amount: '20,000' }] }),
    ).toThrow()
  })

  it('ปฏิเสธ amount ที่มีทศนิยมหรือติดลบ', () => {
    expect(() =>
      parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], amount: 20000.5 }] }),
    ).toThrow()
    expect(() =>
      parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], amount: -1 }] }),
    ).toThrow()
  })

  it('ปฏิเสธ vendorId ที่ไม่มีใน vendors', () => {
    expect(() =>
      parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], vendorId: 99 }] }),
    ).toThrow(/vendorId/)
  })

  it('ปฏิเสธ categorySource ที่ไม่ใช่ notion หรือ filled-in', () => {
    expect(() =>
      parseSeedFile({ ...valid, expenses: [{ ...valid.expenses[0], categorySource: 'guess' }] }),
    ).toThrow()
  })

  it('ปฏิเสธ vendor id ซ้ำ', () => {
    expect(() =>
      parseSeedFile({ ...valid, vendors: [valid.vendors[0], valid.vendors[0]] }),
    ).toThrow(/ซ้ำ/)
  })
})

describe('seedStats', () => {
  it('นับรายการที่ยังไม่ระบุยอดและหมวดที่เติมเอง', () => {
    const stats = seedStats(parseSeedFile(valid))
    expect(stats).toEqual({
      vendorCount: 1,
      expenseCount: 2,
      unknownAmountCount: 1,
      filledCategoryCount: 1,
    })
  })
})

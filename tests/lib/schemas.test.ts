import { describe, expect, it } from 'bun:test'
import * as v from 'valibot'
import { checklistInputSchema } from '@/lib/schemas/checklist'
import { envelopeInputSchema } from '@/lib/schemas/envelope'
import { expenseInputSchema } from '@/lib/schemas/expense'
import { guestInputSchema } from '@/lib/schemas/guest'
import { vendorInputSchema } from '@/lib/schemas/vendor'

const expenseForm = {
  name: 'จ่ายโต๊ะจีน',
  category: 'อาหาร',
  amount: '70,000',
  isPaid: false,
  vendorId: '5',
  dueDate: '',
  note: '',
}

describe('expenseInputSchema', () => {
  it('แปลงสตริงเงินเป็นจำนวนเต็มบาท', () => {
    expect(v.parse(expenseInputSchema, expenseForm).amount).toBe(70000)
  })

  it('ช่องเงินว่าง = ยังไม่ระบุยอด (null) ไม่ใช่ 0', () => {
    expect(v.parse(expenseInputSchema, { ...expenseForm, amount: '' }).amount).toBeNull()
  })

  it('ช่องข้อความว่างกลายเป็น null และตัดช่องว่างหัวท้าย', () => {
    const parsed = v.parse(expenseInputSchema, { ...expenseForm, category: '  ', note: '  ok  ' })
    expect(parsed.category).toBeNull()
    expect(parsed.note).toBe('ok')
  })

  it('vendorId ว่างเป็น null มีค่าเป็นตัวเลข', () => {
    expect(v.parse(expenseInputSchema, { ...expenseForm, vendorId: '' }).vendorId).toBeNull()
    expect(v.parse(expenseInputSchema, expenseForm).vendorId).toBe(5)
  })

  it('ปฏิเสธชื่อว่าง', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, name: '   ' })).toThrow()
  })

  it('ปฏิเสธยอดเงินที่พิมพ์มั่ว', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, amount: 'ประมาณ 70000' })).toThrow()
  })

  it('ปฏิเสธยอดเงินติดลบ', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, amount: '-500' })).toThrow()
  })

  it('ปฏิเสธยอดเงินทศนิยม', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, amount: '70.5' })).toThrow()
  })

  it('ปฏิเสธยอดเงินที่ใหญ่เกิน int ของ Postgres', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, amount: '9999999999' })).toThrow()
  })

  it('ปฏิเสธวันที่รูปแบบผิด', () => {
    expect(() => v.parse(expenseInputSchema, { ...expenseForm, dueDate: '28/11/2569' })).toThrow()
  })
})

describe('envelopeInputSchema', () => {
  const form = { giverName: '', amount: '1,000', receivedAt: '2026-11-28', note: '' }

  it('ชื่อผู้ให้ว่างได้ เพราะวันงานต้องกรอกเร็ว', () => {
    expect(v.parse(envelopeInputSchema, form).giverName).toBeNull()
  })

  it('ยอดซองต้องมีเสมอ', () => {
    expect(() => v.parse(envelopeInputSchema, { ...form, amount: '' })).toThrow()
  })

  it('ยอดซองเป็น 0 ได้', () => {
    expect(v.parse(envelopeInputSchema, { ...form, amount: '0' }).amount).toBe(0)
  })
})

describe('guestInputSchema', () => {
  const form = {
    name: 'พี่เอ',
    side: 'groom',
    group: 'ที่ทำงาน',
    companionsEstimated: '2',
    companionsConfirmed: '',
    rsvp: 'pending',
    note: '',
  }

  it('ผู้ติดตามที่ยืนยันแล้ว: ว่าง = ยังไม่ได้ถาม (null)', () => {
    expect(v.parse(guestInputSchema, form).companionsConfirmed).toBeNull()
  })

  it('ผู้ติดตามที่ยืนยันแล้วเป็น 0 ได้ และไม่กลายเป็น null', () => {
    expect(
      v.parse(guestInputSchema, { ...form, companionsConfirmed: '0' }).companionsConfirmed,
    ).toBe(0)
  })

  it('ผู้ติดตามที่คาดไว้ว่างเปล่ากลายเป็น 0', () => {
    expect(
      v.parse(guestInputSchema, { ...form, companionsEstimated: '' }).companionsEstimated,
    ).toBe(0)
  })

  it('ปฏิเสธจำนวนผู้ติดตามที่ติดลบหรือไม่ใช่ตัวเลข', () => {
    expect(() => v.parse(guestInputSchema, { ...form, companionsEstimated: '-1' })).toThrow()
    expect(() => v.parse(guestInputSchema, { ...form, companionsConfirmed: 'สอง' })).toThrow()
  })

  it('ปฏิเสธ side และ rsvp นอกรายการ', () => {
    expect(() => v.parse(guestInputSchema, { ...form, side: 'other' })).toThrow()
    expect(() => v.parse(guestInputSchema, { ...form, rsvp: 'maybe' })).toThrow()
  })
})

describe('checklistInputSchema', () => {
  const form = {
    name: 'จองช่างภาพ',
    category: 'ภาพถ่าย',
    status: 'not_started',
    budget: '',
    deadline: '',
    depositPaid: false,
    vendorId: '',
    note: '',
  }

  it('งบที่ยังไม่ตั้งเป็น null', () => {
    expect(v.parse(checklistInputSchema, form).budget).toBeNull()
  })

  it('ปฏิเสธสถานะนอกรายการ', () => {
    expect(() => v.parse(checklistInputSchema, { ...form, status: 'ทำอยู่' })).toThrow()
  })
})

describe('vendorInputSchema', () => {
  it('เว้นเบอร์และ LINE ว่างได้ ให้เจ้าของงานเติมทีหลัง', () => {
    const parsed = v.parse(vendorInputSchema, {
      name: 'ช่างภาพวันงาน',
      role: '',
      phone: '',
      line: '',
      totalPrice: '',
      note: '',
    })
    expect(parsed).toEqual({
      name: 'ช่างภาพวันงาน',
      role: null,
      phone: null,
      line: null,
      totalPrice: null,
      note: null,
    })
  })
})

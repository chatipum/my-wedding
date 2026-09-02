import { describe, expect, it } from 'bun:test'
import * as v from 'valibot'
import { toActionResult } from '@/lib/action-result'
import { expenseInputSchema } from '@/lib/schemas/expense'

describe('toActionResult', () => {
  it('แปลง validation error เป็น fieldErrors รายช่อง', () => {
    let result = { ok: true } as ReturnType<typeof toActionResult>
    try {
      v.parse(expenseInputSchema, {
        name: '',
        category: '',
        amount: 'abc',
        isPaid: false,
        vendorId: '',
        dueDate: '',
        note: '',
      })
    } catch (error) {
      result = toActionResult(error)
    }
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('ควรเป็น error')
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(['amount', 'name'])
    expect(result.message).toBeTruthy()
  })

  it('error อื่นคืนข้อความอ่านรู้เรื่องพร้อม detail สำหรับ <details>', () => {
    const result = toActionResult(new Error('connection terminated'))
    if (result.ok) throw new Error('ควรเป็น error')
    expect(result.message).toBe('บันทึกไม่สำเร็จ')
    expect(result.detail).toBe('connection terminated')
    expect(result.fieldErrors).toBeUndefined()
  })
})

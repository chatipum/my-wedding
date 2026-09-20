import { describe, expect, it } from 'bun:test'
import { type Column, cellAttributes } from '@/components/ui/data-table'

const COLUMNS: readonly Column[] = [
  { key: 'name', label: 'รายการ' },
  { key: 'amount', label: 'ยอด', numeric: true },
  { key: 'category', label: 'หมวด', hideOnMobile: true },
  { key: 'total', label: 'รวม', numeric: true, hideOnMobile: true },
  { key: 'actions', label: '' },
]

describe('cellAttributes', () => {
  it('คอลัมน์ธรรมดาได้ป้ายเป็น label ของตัวเอง ไม่มีคลาสพิเศษ', () => {
    expect(cellAttributes(COLUMNS, 'name')).toEqual({
      'data-label': 'รายการ',
      className: undefined,
    })
  })

  it('คอลัมน์ตัวเลขได้คลาส num', () => {
    expect(cellAttributes(COLUMNS, 'amount')).toEqual({
      'data-label': 'ยอด',
      className: 'num',
    })
  })

  it('คอลัมน์ที่สั่งซ่อนบนมือถือได้คลาส hide-sm', () => {
    expect(cellAttributes(COLUMNS, 'category')).toEqual({
      'data-label': 'หมวด',
      className: 'hide-sm',
    })
  })

  it('เป็นได้ทั้งตัวเลขและซ่อนบนมือถือพร้อมกัน', () => {
    expect(cellAttributes(COLUMNS, 'total')).toEqual({
      'data-label': 'รวม',
      className: 'num hide-sm',
    })
  })

  it('คอลัมน์ปุ่มป้ายว่าง — CSS จะได้ไม่ขึ้นป้ายเปล่าให้บนการ์ด', () => {
    expect(cellAttributes(COLUMNS, 'actions')).toEqual({
      'data-label': '',
      className: undefined,
    })
  })

  it('key ที่ไม่มีในตารางโยน error พร้อมบอกชื่อ key ที่หาไม่เจอ', () => {
    expect(() => cellAttributes(COLUMNS, 'ไม่มีจริง')).toThrow('ไม่มีจริง')
  })
})

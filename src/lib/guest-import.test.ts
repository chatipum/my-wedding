import { describe, expect, it } from 'bun:test'
import { toImportRows } from '@/lib/guest-import'

describe('toImportRows', () => {
  it('ข้ามแถวหัวตารางและอ่านชื่อจากคอลัมน์แรก', () => {
    expect(toImportRows([['ชื่อ'], ['สมชาย'], ['สมหญิง']], [])).toEqual([
      { name: 'สมชาย', duplicate: false },
      { name: 'สมหญิง', duplicate: false },
    ])
  })

  it('ไฟล์ที่มีแต่หัวตารางได้รายการว่าง', () => {
    expect(toImportRows([['ชื่อ']], [])).toEqual([])
  })

  it('ตัดแถวว่างและช่องที่มีแต่ช่องว่างทิ้ง', () => {
    expect(toImportRows([['ชื่อ'], [], ['   '], [null], ['สมชาย']], [])).toEqual([
      { name: 'สมชาย', duplicate: false },
    ])
  })

  it('ตัดช่องว่างหน้าหลังชื่อออก', () => {
    expect(toImportRows([['ชื่อ'], ['  สมชาย  ']], [])).toEqual([{ name: 'สมชาย', duplicate: false }])
  })

  it('แปลงค่าที่ไม่ใช่ข้อความเป็นข้อความ', () => {
    expect(toImportRows([['ชื่อ'], [1234]], [])).toEqual([{ name: '1234', duplicate: false }])
  })

  it('ชื่อที่ตรงกับแขกใน DB ถูกทำเครื่องหมายว่าซ้ำ', () => {
    expect(toImportRows([['ชื่อ'], ['สมชาย'], ['สมหญิง']], ['สมชาย'])).toEqual([
      { name: 'สมชาย', duplicate: true },
      { name: 'สมหญิง', duplicate: false },
    ])
  })

  it('ชื่อซ้ำกันเองในไฟล์ ทำเครื่องหมายเฉพาะแถวหลัง', () => {
    expect(toImportRows([['ชื่อ'], ['สมชาย'], ['สมชาย']], [])).toEqual([
      { name: 'สมชาย', duplicate: false },
      { name: 'สมชาย', duplicate: true },
    ])
  })

  it('เทียบชื่อซ้ำโดยไม่สนช่องว่างเกินและตัวพิมพ์', () => {
    expect(toImportRows([['ชื่อ'], ['somchai  jaidee']], ['Somchai Jaidee'])).toEqual([
      { name: 'somchai  jaidee', duplicate: true },
    ])
  })
})

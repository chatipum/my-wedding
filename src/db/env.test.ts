import { describe, expect, it } from 'bun:test'
import { requireDatabaseUrl } from '@/db/env'

describe('requireDatabaseUrl', () => {
  it('คืนค่าเดิมเมื่อรูปแบบถูกต้อง', () => {
    const url = 'postgresql://user:pw@ep-x.ap-southeast-1.aws.neon.tech/wedding?sslmode=require'
    expect(requireDatabaseUrl(url)).toBe(url)
  })

  it('รับ postgres:// ด้วย', () => {
    expect(requireDatabaseUrl('postgres://u:p@h/db')).toBe('postgres://u:p@h/db')
  })

  it('ไม่มีค่า → error ที่บอกชื่อตัวแปร', () => {
    expect(() => requireDatabaseUrl(undefined)).toThrow(/DATABASE_URL/)
    expect(() => requireDatabaseUrl('')).toThrow(/DATABASE_URL/)
    expect(() => requireDatabaseUrl('   ')).toThrow(/DATABASE_URL/)
  })

  it('รูปแบบผิด → error ที่บอกว่าต้องขึ้นต้นด้วยอะไร', () => {
    expect(() => requireDatabaseUrl('mysql://u:p@h/db')).toThrow(/postgres/)
  })
})

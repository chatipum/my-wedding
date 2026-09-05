import { describe, expect, it } from 'bun:test'
import type { Guest } from '@/db/schema'
import {
  EMPTY_GUEST_FILTER,
  filterGuests,
  type GuestFilter,
  parseGuestFilter,
  toSearchParams,
} from '@/lib/guest-filter'

function guest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: 1,
    name: 'สมชาย ใจดี',
    side: 'groom',
    group: 'เพื่อนมหาลัย',
    companionsEstimated: 0,
    companionsConfirmed: null,
    rsvp: 'pending',
    invitationGiven: false,
    note: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function filter(overrides: Partial<GuestFilter> = {}): GuestFilter {
  return { ...EMPTY_GUEST_FILTER, ...overrides }
}

describe('filterGuests', () => {
  it('ตัวกรองว่างคืนแขกทุกคน', () => {
    const guests = [guest({ id: 1 }), guest({ id: 2 })]
    expect(filterGuests(guests, EMPTY_GUEST_FILTER)).toEqual(guests)
  })

  it('กรองตามฝ่าย', () => {
    const groom = guest({ id: 1, side: 'groom' })
    const bride = guest({ id: 2, side: 'bride' })
    expect(filterGuests([groom, bride], filter({ side: 'bride' }))).toEqual([bride])
  })

  it('กรองตามกลุ่ม', () => {
    const uni = guest({ id: 1, group: 'เพื่อนมหาลัย' })
    const work = guest({ id: 2, group: 'ที่ทำงาน' })
    expect(filterGuests([uni, work], filter({ group: 'ที่ทำงาน' }))).toEqual([work])
  })

  it('กรองตามการตอบรับ', () => {
    const yes = guest({ id: 1, rsvp: 'yes' })
    const pending = guest({ id: 2, rsvp: 'pending' })
    expect(filterGuests([yes, pending], filter({ rsvp: 'yes' }))).toEqual([yes])
  })

  it('กรอง "แจกแล้ว" กับ "ยังไม่แจก" แยกกัน', () => {
    const given = guest({ id: 1, invitationGiven: true })
    const notGiven = guest({ id: 2, invitationGiven: false })
    const guests = [given, notGiven]
    expect(filterGuests(guests, filter({ invitation: 'given' }))).toEqual([given])
    expect(filterGuests(guests, filter({ invitation: 'not-given' }))).toEqual([notGiven])
  })

  it('ค้นหาคำจากชื่อ กลุ่ม และหมายเหตุ', () => {
    const byName = guest({ id: 1, name: 'มานี', group: null, note: null })
    const byGroup = guest({ id: 2, name: 'ปิติ', group: 'มานีพาม', note: null })
    const byNote = guest({ id: 3, name: 'ชูใจ', group: null, note: 'มากับมานี' })
    const other = guest({ id: 4, name: 'วีระ', group: null, note: null })
    expect(filterGuests([byName, byGroup, byNote, other], filter({ keyword: 'มานี' }))).toEqual([
      byName,
      byGroup,
      byNote,
    ])
  })

  it('ค้นหาไม่สนตัวพิมพ์เล็กใหญ่และช่องว่างหัวท้าย', () => {
    const john = guest({ id: 1, name: 'John Smith' })
    expect(filterGuests([john], filter({ keyword: '  jOhN  ' }))).toEqual([john])
  })

  it('รวมหลายตัวกรองแบบ and', () => {
    const match = guest({ id: 1, side: 'bride', rsvp: 'yes' })
    const wrongSide = guest({ id: 2, side: 'groom', rsvp: 'yes' })
    const wrongRsvp = guest({ id: 3, side: 'bride', rsvp: 'no' })
    expect(
      filterGuests([match, wrongSide, wrongRsvp], filter({ side: 'bride', rsvp: 'yes' })),
    ).toEqual([match])
  })

  it('แขกที่กลุ่มเป็น null ไม่หลุดออกมาเมื่อกรองตามกลุ่ม', () => {
    const noGroup = guest({ id: 1, group: null })
    expect(filterGuests([noGroup], filter({ group: 'ที่ทำงาน' }))).toEqual([])
  })
})

describe('parseGuestFilter', () => {
  it('อ่านค่าจาก query string', () => {
    const params = new URLSearchParams({
      q: 'มานี',
      side: 'bride',
      group: 'ที่ทำงาน',
      rsvp: 'yes',
      invitation: 'given',
    })
    expect(parseGuestFilter(params)).toEqual({
      keyword: 'มานี',
      side: 'bride',
      group: 'ที่ทำงาน',
      rsvp: 'yes',
      invitation: 'given',
    })
  })

  it('ไม่มี param เลยได้ตัวกรองว่าง', () => {
    expect(parseGuestFilter(new URLSearchParams())).toEqual(EMPTY_GUEST_FILTER)
  })

  it('ค่าที่ไม่รู้จักถูกโยนทิ้ง ไม่ใช่กรองจนไม่เหลือใคร', () => {
    const params = new URLSearchParams({ side: 'ไม่รู้', rsvp: 'maybe', invitation: 'x' })
    expect(parseGuestFilter(params)).toEqual(EMPTY_GUEST_FILTER)
  })
})

describe('toSearchParams', () => {
  it('ตัดค่าว่างออก ไม่ส่ง param เปล่าไปกับลิงก์', () => {
    expect(toSearchParams(filter({ side: 'bride' })).toString()).toBe('side=bride')
  })

  it('ตัวกรองว่างได้ query string ว่าง', () => {
    expect(toSearchParams(EMPTY_GUEST_FILTER).toString()).toBe('')
  })

  it('ส่งครบทุกค่าที่ตั้งไว้', () => {
    const params = toSearchParams({
      keyword: 'มานี',
      side: 'groom',
      group: 'ที่ทำงาน',
      rsvp: 'no',
      invitation: 'not-given',
    })
    expect(Object.fromEntries(params)).toEqual({
      q: 'มานี',
      side: 'groom',
      group: 'ที่ทำงาน',
      rsvp: 'no',
      invitation: 'not-given',
    })
  })
})

import type { Rsvp, Side } from '@/db/schema'

export type InvitationFilter = 'given' | 'not-given'

/** ค่าว่าง = ไม่กรองด้วยช่องนั้น (ตรงกับ <option value=""> บนหน้าจอ) */
export type GuestFilter = {
  keyword: string
  side: Side | ''
  group: string
  rsvp: Rsvp | ''
  invitation: InvitationFilter | ''
}

export const EMPTY_GUEST_FILTER: GuestFilter = {
  keyword: '',
  side: '',
  group: '',
  rsvp: '',
  invitation: '',
}

const SIDES: Side[] = ['groom', 'bride']
const RSVPS: Rsvp[] = ['pending', 'yes', 'no']
const INVITATIONS: InvitationFilter[] = ['given', 'not-given']

/** เฉพาะฟิลด์ที่ตัวกรองใช้ — route ที่ select มาไม่ครบทั้งแถวก็ยังส่งเข้ามาได้ */
export type FilterableGuest = {
  name: string
  side: Side
  group: string | null
  rsvp: Rsvp
  invitationGiven: boolean
  note: string | null
}

export function filterGuests<T extends FilterableGuest>(guests: T[], filter: GuestFilter): T[] {
  const needle = filter.keyword.trim().toLowerCase()

  return guests.filter((guest) => {
    if (filter.side && guest.side !== filter.side) return false
    if (filter.group && guest.group !== filter.group) return false
    if (filter.rsvp && guest.rsvp !== filter.rsvp) return false
    if (filter.invitation && guest.invitationGiven !== (filter.invitation === 'given')) return false
    if (
      needle &&
      !`${guest.name} ${guest.group ?? ''} ${guest.note ?? ''}`.toLowerCase().includes(needle)
    )
      return false
    return true
  })
}

/** คำค้นที่มีแต่เว้นวรรคไม่นับ — filterGuests trim ทิ้งอยู่แล้ว กรองไปก็ได้ทุกคน */
export function isGuestFilterActive(filter: GuestFilter): boolean {
  return (
    filter.keyword.trim() !== '' ||
    filter.side !== '' ||
    filter.group !== '' ||
    filter.rsvp !== '' ||
    filter.invitation !== ''
  )
}

/** ค่าที่ไม่รู้จักกลายเป็น "ไม่กรอง" — ไม่ใช่กรองจนไม่เหลือใคร เพราะ URL แก้มือได้ */
function pickAllowed<T extends string>(value: string | null, allowed: T[]): T | '' {
  return allowed.find((option) => option === value) ?? ''
}

export function parseGuestFilter(params: URLSearchParams): GuestFilter {
  return {
    keyword: params.get('q') ?? '',
    side: pickAllowed(params.get('side'), SIDES),
    group: params.get('group') ?? '',
    rsvp: pickAllowed(params.get('rsvp'), RSVPS),
    invitation: pickAllowed(params.get('invitation'), INVITATIONS),
  }
}

export function toSearchParams(filter: GuestFilter): URLSearchParams {
  const entries: [string, string][] = [
    ['q', filter.keyword],
    ['side', filter.side],
    ['group', filter.group],
    ['rsvp', filter.rsvp],
    ['invitation', filter.invitation],
  ]

  return new URLSearchParams(entries.filter(([, value]) => value !== ''))
}

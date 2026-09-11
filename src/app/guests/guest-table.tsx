'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import type { Guest, Rsvp, Side } from '@/db/schema'
import {
  EMPTY_GUEST_FILTER,
  filterGuests,
  type GuestFilter,
  type InvitationFilter,
  isGuestFilterActive,
  toSearchParams,
} from '@/lib/guest-filter'
import { countGuests } from '@/lib/totals'
import { GuestRow } from './guest-row'

const COLUMNS = [
  { key: 'name', label: 'ชื่อ' },
  { key: 'side', label: 'ฝ่าย' },
  { key: 'group', label: 'กลุ่ม' },
  { key: 'confirmed', label: 'ผู้ติดตามที่ยืนยันแล้ว', numeric: true },
  { key: 'rsvp', label: 'ตอบรับ' },
  { key: 'invitation', label: 'แจกซอง' },
  { key: 'actions', label: '' },
]

export function GuestTable({ guests }: { guests: Guest[] }) {
  const [filter, setFilter] = useState<GuestFilter>(EMPTY_GUEST_FILTER)

  const update = <K extends keyof GuestFilter>(key: K, value: GuestFilter[K]) =>
    setFilter((current) => ({ ...current, [key]: value }))

  const groups = useMemo(
    () =>
      [
        ...new Set(guests.map((guest) => guest.group).filter((g): g is string => g !== null)),
      ].sort(),
    [guests],
  )

  // 400 แถวกรองใน memory เร็วกว่ายิง query ใหม่ทุกครั้งที่พิมพ์
  const filtered = useMemo(() => filterGuests(guests, filter), [guests, filter])

  // ส่งตัวกรองไปให้ route ทาง query string — server กรองซ้ำด้วย filterGuests ตัวเดียวกัน
  const exportQuery = toSearchParams(filter).toString()

  const counts = countGuests(filtered)

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="input max-w-xs"
          type="search"
          placeholder="ค้นหาชื่อ / กลุ่ม / หมายเหตุ"
          aria-label="ค้นหาชื่อ / กลุ่ม / หมายเหตุ"
          value={filter.keyword}
          onChange={(event) => update('keyword', event.target.value)}
        />
        <select
          className="input max-w-40"
          aria-label="กรองตามฝ่าย"
          value={filter.side}
          onChange={(e) => update('side', e.target.value as Side | '')}
        >
          <option value="">ทุกฝ่าย</option>
          <option value="groom">เจ้าบ่าว</option>
          <option value="bride">เจ้าสาว</option>
        </select>
        <select
          className="input max-w-40"
          aria-label="กรองตามกลุ่ม"
          value={filter.group}
          onChange={(e) => update('group', e.target.value)}
        >
          <option value="">ทุกกลุ่ม</option>
          {groups.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="input max-w-40"
          aria-label="กรองตามการตอบรับ"
          value={filter.rsvp}
          onChange={(e) => update('rsvp', e.target.value as Rsvp | '')}
        >
          <option value="">ทุกสถานะ</option>
          <option value="pending">ยังไม่ตอบ</option>
          <option value="yes">มาแน่</option>
          <option value="no">ไม่มา</option>
        </select>
        <select
          className="input max-w-40"
          aria-label="กรองตามการแจกซอง"
          value={filter.invitation}
          onChange={(e) => update('invitation', e.target.value as InvitationFilter | '')}
        >
          <option value="">ซองทุกสถานะ</option>
          <option value="given">แจกแล้ว</option>
          <option value="not-given">ยังไม่แจก</option>
        </select>

        <Button
          variant="ghost"
          className="ml-auto"
          disabled={!isGuestFilterActive(filter)}
          onClick={() => setFilter(EMPTY_GUEST_FILTER)}
        >
          ล้างตัวกรอง
        </Button>
        <a
          className="btn btn-ghost"
          href={exportQuery ? `/guests/export?${exportQuery}` : '/guests/export'}
        >
          ดาวน์โหลด Excel
        </a>
      </div>

      <p className="text-muted mb-2">
        แสดง {filtered.length} จาก {guests.length} ราย · ยืนยันแล้ว {counts.confirmed} คน · แจกซองแล้ว{' '}
        {counts.invitationsGiven} จาก {counts.total} ซอง
      </p>

      <DataTable
        caption="รายชื่อแขก"
        columns={COLUMNS}
        isEmpty={filtered.length === 0}
        emptyMessage={guests.length === 0 ? 'ยังไม่มีรายชื่อแขก' : 'ไม่พบแขกที่ตรงกับที่กรอง'}
      >
        {filtered.map((guest) => (
          <GuestRow key={guest.id} guest={guest} columnCount={COLUMNS.length} />
        ))}
      </DataTable>
    </>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import type { Guest } from '@/db/schema'
import { countGuests } from '@/lib/totals'
import { GuestRow } from './guest-row'

const COLUMNS = [
  { key: 'name', label: 'ชื่อ' },
  { key: 'side', label: 'ฝ่าย' },
  { key: 'group', label: 'กลุ่ม' },
  { key: 'estimated', label: 'ผู้ติดตาม (คาด)', numeric: true },
  { key: 'confirmed', label: 'ผู้ติดตาม (ยืนยัน)', numeric: true },
  { key: 'rsvp', label: 'ตอบรับ' },
  { key: 'actions', label: '' },
]

export function GuestTable({ guests }: { guests: Guest[] }) {
  const [keyword, setKeyword] = useState('')
  const [side, setSide] = useState('')
  const [group, setGroup] = useState('')
  const [rsvp, setRsvp] = useState('')

  const groups = useMemo(
    () =>
      [
        ...new Set(guests.map((guest) => guest.group).filter((g): g is string => g !== null)),
      ].sort(),
    [guests],
  )

  // 400 แถวกรองใน memory เร็วกว่ายิง query ใหม่ทุกครั้งที่พิมพ์
  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    return guests.filter((guest) => {
      if (side && guest.side !== side) return false
      if (group && guest.group !== group) return false
      if (rsvp && guest.rsvp !== rsvp) return false
      if (
        needle &&
        !`${guest.name} ${guest.group ?? ''} ${guest.note ?? ''}`.toLowerCase().includes(needle)
      )
        return false
      return true
    })
  }, [guests, keyword, side, group, rsvp])

  const counts = countGuests(filtered)

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          className="input max-w-xs"
          type="search"
          placeholder="ค้นหาชื่อ"
          aria-label="ค้นหาชื่อแขก"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <select
          className="input max-w-40"
          aria-label="กรองตามฝ่าย"
          value={side}
          onChange={(e) => setSide(e.target.value)}
        >
          <option value="">ทุกฝ่าย</option>
          <option value="groom">เจ้าบ่าว</option>
          <option value="bride">เจ้าสาว</option>
        </select>
        <select
          className="input max-w-40"
          aria-label="กรองตามกลุ่ม"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
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
          value={rsvp}
          onChange={(e) => setRsvp(e.target.value)}
        >
          <option value="">ทุกสถานะ</option>
          <option value="pending">ยังไม่ตอบ</option>
          <option value="yes">มาแน่</option>
          <option value="no">ไม่มา</option>
        </select>
      </div>

      <p className="text-muted mb-2">
        แสดง {filtered.length} จาก {guests.length} ราย · ประมาณการ {counts.estimated} คน · ยืนยันแล้ว{' '}
        {counts.confirmed} คน
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

'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import type { Guest, Side } from '@/db/schema'
import { cn } from '@/lib/cn'
import {
  SEATS_PER_TABLE,
  seatsUsedByTable,
  TABLE_COUNT,
  TABLE_INDEXES,
  tableRow,
  tableSide,
} from '@/lib/seating'
import { headcount } from '@/lib/totals'
import { assignTableAction } from './actions'

const SIDE_LABEL: Record<Side, string> = { bride: 'เจ้าสาว', groom: 'เจ้าบ่าว' }

type Assignment = { id: number; tableIndex: number | null }

function tableTitle(index: number): string {
  return `โต๊ะฝั่ง${SIDE_LABEL[tableSide(index)]} แถว ${tableRow(index)}`
}

function tableTone(used: number): string {
  if (used > SEATS_PER_TABLE) return 'border-unpaid bg-unpaid/10 text-unpaid font-semibold'
  if (used === SEATS_PER_TABLE) return 'border-paid bg-paid/10 text-paid'
  if (used > 0) return 'border-accent bg-accent/10'
  return 'border-border bg-surface text-muted'
}

function GuestLine({ guest, action }: { guest: Guest; action: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-b-0">
      <span>
        {guest.name}
        {guest.rsvp === 'yes' && guest.companionsConfirmed ? ` +${guest.companionsConfirmed}` : ''}
        {guest.rsvp === 'pending' ? <span className="text-muted"> (ยังไม่ตอบ)</span> : null}
      </span>
      {action}
    </li>
  )
}

export function SeatingPlanner({ guests }: { guests: Guest[] }) {
  const [optimisticGuests, assignOptimistic] = useOptimistic(
    guests,
    (state, { id, tableIndex }: Assignment) =>
      state.map((guest) => (guest.id === id ? { ...guest, tableIndex } : guest)),
  )
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const assign = (assignment: Assignment) =>
    startTransition(async () => {
      assignOptimistic(assignment)
      const result = await assignTableAction(assignment)
      setError(result.ok ? null : result.message)
    })

  const used = seatsUsedByTable(optimisticGuests)
  const usedAt = (index: number) => used.get(index) ?? 0
  const seated = optimisticGuests.filter((guest) => guest.tableIndex !== null)
  const seatedPeople = seated.reduce((sum, guest) => sum + headcount(guest), 0)
  const overTables = TABLE_INDEXES.filter((index) => usedAt(index) > SEATS_PER_TABLE).length

  const selectedSide = tableSide(selected)
  const atSelected = optimisticGuests.filter((guest) => guest.tableIndex === selected)
  const needle = keyword.trim().toLowerCase()
  const waiting = optimisticGuests.filter(
    (guest) =>
      guest.tableIndex === null &&
      guest.side === selectedSide &&
      guest.name.toLowerCase().includes(needle),
  )

  return (
    <>
      <PageHeader title="จัดโต๊ะ">
        <span>
          จัดแล้ว {seatedPeople} คน / {TABLE_COUNT * SEATS_PER_TABLE} ที่
        </span>
        <span>ยังไม่มีโต๊ะ {optimisticGuests.length - seated.length} ราย</span>
        {overTables > 0 ? <span className="text-unpaid">เกิน {overTables} โต๊ะ</span> : null}
      </PageHeader>

      <div className="grid items-start gap-4 md:grid-cols-[1fr_18rem]">
        <Card>
          <div className="mb-3 rounded-lg border border-border bg-bg p-2 text-center font-semibold">
            เวที
          </div>
          <div className="grid grid-cols-[repeat(3,minmax(0,1fr))_1.25rem_repeat(3,minmax(0,1fr))] gap-2">
            <div className="col-span-3 text-center text-sm text-muted">ญาติเจ้าสาว</div>
            <div className="col-span-3 col-start-5 text-center text-sm text-muted">ญาติเจ้าบ่าว</div>
            <div className="col-start-4 row-span-8 row-start-2 rounded bg-bg" />
            {TABLE_INDEXES.map((index) => (
              <button
                key={index}
                type="button"
                aria-pressed={index === selected}
                aria-label={`${tableTitle(index)} ใช้ ${usedAt(index)} จาก ${SEATS_PER_TABLE} ที่`}
                onClick={() => setSelected(index)}
                className={cn(
                  'grid aspect-square cursor-pointer place-items-center rounded-full border-[1.5px] text-xs tabular-nums',
                  tableTone(usedAt(index)),
                  index === selected && 'outline-3 outline-offset-2 outline-accent',
                )}
              >
                {usedAt(index)}/{SEATS_PER_TABLE}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">{tableTitle(selected)}</h2>
          <p className={usedAt(selected) > SEATS_PER_TABLE ? 'text-unpaid' : 'text-muted'}>
            {usedAt(selected)}/{SEATS_PER_TABLE} ที่
          </p>
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}

          <h3 className="mt-3 mb-1 text-sm text-muted">นั่งโต๊ะนี้</h3>
          {atSelected.length === 0 ? (
            <p className="text-muted">ยังว่าง</p>
          ) : (
            <ul>
              {atSelected.map((guest) => (
                <GuestLine
                  key={guest.id}
                  guest={guest}
                  action={
                    <Button
                      variant="ghost"
                      onClick={() => assign({ id: guest.id, tableIndex: null })}
                    >
                      เอาออก
                    </Button>
                  }
                />
              ))}
            </ul>
          )}

          <h3 className="mt-4 mb-1 text-sm text-muted">แขกฝั่ง{SIDE_LABEL[selectedSide]}ที่ยังไม่มีโต๊ะ</h3>
          <input
            className="input mb-1"
            type="search"
            placeholder="ค้นชื่อ"
            aria-label="ค้นชื่อแขกที่ยังไม่มีโต๊ะ"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          {waiting.length === 0 ? (
            <p className="text-muted py-2">ไม่มีแขกที่ยังไม่มีโต๊ะ</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {waiting.map((guest) => (
                <GuestLine
                  key={guest.id}
                  guest={guest}
                  action={
                    <Button onClick={() => assign({ id: guest.id, tableIndex: selected })}>
                      ใส่
                    </Button>
                  }
                />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

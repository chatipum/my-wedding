'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import type { Guest, Side } from '@/db/schema'
import { cn } from '@/lib/cn'
import {
  chairLabels,
  LONG_TABLE_INDEX,
  TABLE_INDEXES,
  TOTAL_SEATS,
  tableColumn,
  tableRow,
  tableSeats,
  tableSide,
} from '@/lib/seating'
import { assignTableAction } from './actions'

const SIDE_LABEL: Record<Side, string> = { bride: 'เจ้าสาว', groom: 'เจ้าบ่าว' }

type Assignment = { id: number; tableIndex: number | null }

function tableTitle(index: number): string {
  return `โต๊ะฝั่ง${SIDE_LABEL[tableSide(index)]} แถว ${tableRow(index)}`
}

function tableTone(used: number, seats: number): string {
  if (used > seats) return 'border-unpaid bg-unpaid/10 text-unpaid font-semibold'
  if (used === seats) return 'border-paid bg-paid/10 text-paid'
  if (used > 0) return 'border-accent bg-accent/10'
  return 'border-border bg-surface text-muted'
}

/** ช่องตาราง: คอลัมน์ 4 ของ grid เป็นทางเดิน แถว 1 เป็นหัวฝั่ง */
function gridPlacement(index: number): React.CSSProperties {
  const column = tableColumn(index)
  const row = tableRow(index) + 1
  return {
    gridColumn: column > 3 ? column + 1 : column,
    gridRow: index === LONG_TABLE_INDEX ? `${row} / span 2` : row,
  }
}

function Chair({ label, over }: { label: string | null; over: boolean }) {
  return (
    <span
      className={cn(
        'grid aspect-square w-[min(24cqw,2rem)] place-items-center rounded-full border text-[min(9cqw,11px)] leading-none',
        label === null && 'border-dashed border-border bg-surface',
        label !== null && !over && 'border-accent bg-surface',
        over && 'border-unpaid bg-unpaid/10 text-unpaid',
      )}
    >
      {label}
    </span>
  )
}

function chairsOf(labels: string[], seats: number) {
  return Array.from({ length: Math.max(seats, labels.length) }, (_, order) => ({
    key: order,
    label: labels[order] ?? null,
    over: order >= seats,
  }))
}

function TableFace({ guests, used, seats }: { guests: Guest[]; used: number; seats: number }) {
  const groups = [...new Set(guests.flatMap((guest) => (guest.group ? [guest.group] : [])))]
  return (
    <>
      {groups.length > 0 ? (
        <span className="line-clamp-3 text-[min(7cqw,10px)] leading-tight">
          {groups.join(' · ')}
        </span>
      ) : null}
      <span className="text-[min(9cqw,12px)] tabular-nums">
        {used}/{seats}
      </span>
    </>
  )
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

  const guestsAt = (index: number) => optimisticGuests.filter((guest) => guest.tableIndex === index)
  const labelsAt = new Map(TABLE_INDEXES.map((index) => [index, chairLabels(guestsAt(index))]))
  const usedAt = (index: number) => labelsAt.get(index)?.length ?? 0
  const seated = optimisticGuests.filter((guest) => guest.tableIndex !== null)
  const seatedPeople = chairLabels(seated).length
  const overTables = TABLE_INDEXES.filter((index) => usedAt(index) > tableSeats(index)).length

  const selectedSide = tableSide(selected)
  const atSelected = guestsAt(selected)
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
          จัดแล้ว {seatedPeople} คน / {TOTAL_SEATS} ที่
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
            <div className="col-span-3 text-center text-sm text-muted">แขกเจ้าสาว</div>
            <div className="col-span-3 col-start-5 text-center text-sm text-muted">แขกเจ้าบ่าว</div>
            <div className="col-start-4 row-span-9 row-start-2 rounded bg-bg" />
            {TABLE_INDEXES.map((index) => {
              const seats = tableSeats(index)
              const chairs = chairsOf(labelsAt.get(index) ?? [], seats)
              const half = Math.ceil(chairs.length / 2)
              const face = <TableFace guests={guestsAt(index)} used={usedAt(index)} seats={seats} />
              return (
                <button
                  key={index}
                  type="button"
                  style={gridPlacement(index)}
                  aria-pressed={index === selected}
                  aria-label={`${tableTitle(index)} ใช้ ${usedAt(index)} จาก ${seats} ที่`}
                  onClick={() => setSelected(index)}
                  className={cn(
                    'cursor-pointer rounded-lg text-xs',
                    index === selected && 'outline-3 outline-offset-2 outline-accent',
                  )}
                >
                  {index === LONG_TABLE_INDEX ? (
                    <span className="@container grid h-full grid-cols-[auto_1fr_auto] gap-1 p-1">
                      {[
                        { side: 'left', column: chairs.slice(0, half) },
                        { side: 'right', column: chairs.slice(half) },
                      ].map(({ side, column }) => (
                        <span
                          key={side}
                          className={cn(
                            'flex flex-col justify-around',
                            side === 'right' && 'col-start-3',
                          )}
                        >
                          {column.map((chair) => (
                            <Chair key={chair.key} label={chair.label} over={chair.over} />
                          ))}
                        </span>
                      ))}
                      <span
                        className={cn(
                          'col-start-2 row-start-1 flex flex-col items-center justify-center gap-1 rounded border-[1.5px] p-1',
                          tableTone(usedAt(index), seats),
                        )}
                      >
                        {face}
                      </span>
                    </span>
                  ) : (
                    <span className="@container relative block aspect-square">
                      <span
                        className={cn(
                          'absolute inset-[25%] flex flex-col items-center justify-center gap-0.5 rounded-full border-[1.5px] p-1',
                          tableTone(usedAt(index), seats),
                        )}
                      >
                        {face}
                      </span>
                      {chairs.map((chair, order) => {
                        const angle = (2 * Math.PI * order) / chairs.length
                        return (
                          <span
                            key={chair.key}
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{
                              left: `${50 + 40 * Math.sin(angle)}%`,
                              top: `${50 - 40 * Math.cos(angle)}%`,
                            }}
                          >
                            <Chair label={chair.label} over={chair.over} />
                          </span>
                        )
                      })}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">{tableTitle(selected)}</h2>
          <p className={usedAt(selected) > tableSeats(selected) ? 'text-unpaid' : 'text-muted'}>
            {usedAt(selected)}/{tableSeats(selected)} ที่
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

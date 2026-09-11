'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Money } from '@/components/ui/money'
import { calculateBreakEven, DEFAULT_ENVELOPE_AMOUNT, GUEST_CAPACITY } from '@/lib/break-even'
import type { GuestCounts } from '@/lib/totals'

/**
 * คำนวณสดฝั่ง client ทุกครั้งที่พิมพ์ ไม่ยิง server —
 * ยอดต่อซองเป็นตัวเลขสมมติที่ปรับเล่นไปมา ไม่ใช่ข้อมูลที่ต้องเก็บ
 */
export function BreakEvenCard({
  totalExpense,
  unknownCount,
  envelopesReceived,
  guestCounts,
}: {
  totalExpense: number
  unknownCount: number
  envelopesReceived: number
  guestCounts: Pick<GuestCounts, 'confirmed' | 'confirmedRows'>
}) {
  const [perEnvelope, setPerEnvelope] = useState(String(DEFAULT_ENVELOPE_AMOUNT))
  const result = calculateBreakEven({
    totalExpense,
    perEnvelope: Number(perEnvelope),
    guestCounts,
  })

  return (
    <Card>
      <h2 className="font-semibold mb-2">คุ้มทุน</h2>

      <label htmlFor="per-envelope" className="flex items-center gap-2 mb-3">
        ซองละ
        <input
          id="per-envelope"
          type="number"
          min={1}
          step={100}
          inputMode="numeric"
          className="input w-28"
          value={perEnvelope}
          onChange={(event) => setPerEnvelope(event.target.value)}
        />
        บาท
      </label>

      {result === null ? (
        <p className="field-error" role="alert">
          กรอกยอดต่อซองให้มากกว่า 0 ก่อน
        </p>
      ) : (
        <>
          <p>
            ต้องได้ <strong>{result.envelopesNeeded}</strong> ซอง
          </p>
          <p className="text-muted text-sm">
            ค่าใช้จ่ายทั้งหมด <Money value={totalExpense} /> · ได้ซองมาแล้ว {envelopesReceived} ซอง
          </p>
          <p className="text-muted text-sm mt-2">
            เพดาน {GUEST_CAPACITY} คน ≈ {result.envelopeCapacity} ซอง (เฉลี่ย{' '}
            {result.peoplePerEnvelope.toFixed(1)} คน/ซอง)
          </p>
          {result.isFeasible ? (
            <p className="text-sm">คุ้มทุนได้ภายในเพดานแขก</p>
          ) : (
            <p className="field-error text-sm">
              เกินเพดาน {result.envelopesOverCapacity} ซอง — แขกเต็มงานก็ยังไม่คุ้มทุน
            </p>
          )}
          {/* ค่าใช้จ่ายที่ยังไม่ระบุยอดไม่เข้าสูตร ไม่บอกตรงนี้ตัวเลขจะต่ำกว่าจริงแบบเงียบๆ */}
          {unknownCount > 0 ? (
            <p className="text-muted text-sm mt-2">
              ยังไม่ระบุยอด {unknownCount} รายการ ยอดจริงจะสูงกว่านี้
            </p>
          ) : null}
        </>
      )}
    </Card>
  )
}

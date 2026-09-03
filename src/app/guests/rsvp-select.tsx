'use client'

import { useOptimistic, useState, useTransition } from 'react'
import type { Rsvp } from '@/db/schema'
import { setRsvpAction } from './actions'

export function RsvpSelect({ id, rsvp, name }: { id: number; rsvp: Rsvp; name: string }) {
  const [optimisticRsvp, setOptimisticRsvp] = useOptimistic(rsvp)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <select
        className="input"
        value={optimisticRsvp}
        aria-label={`สถานะตอบรับของ ${name}`}
        onChange={(event) => {
          const next = event.target.value as Rsvp
          startTransition(async () => {
            setOptimisticRsvp(next)
            const result = await setRsvpAction({ id, rsvp: next })
            setError(result.ok ? null : result.message)
          })
        }}
      >
        <option value="pending">ยังไม่ตอบ</option>
        <option value="yes">มาแน่</option>
        <option value="no">ไม่มา</option>
      </select>
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

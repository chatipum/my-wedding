'use client'

import { useOptimistic, useState, useTransition } from 'react'
import type { ChecklistStatus } from '@/db/schema'
import { setChecklistStatusAction } from './actions'

export function StatusSelect({
  id,
  status,
  name,
}: {
  id: number
  status: ChecklistStatus
  name: string
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <select
        className="input"
        value={optimisticStatus}
        aria-label={`สถานะของ ${name}`}
        onChange={(event) => {
          const next = event.target.value as ChecklistStatus
          startTransition(async () => {
            setOptimisticStatus(next)
            const result = await setChecklistStatusAction({ id, status: next })
            setError(result.ok ? null : result.message)
          })
        }}
      >
        <option value="not_started">ยังไม่เริ่ม</option>
        <option value="in_progress">กำลังทำ</option>
        <option value="done">เสร็จแล้ว</option>
      </select>
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

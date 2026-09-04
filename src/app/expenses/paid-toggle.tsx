'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { togglePaidAction } from './actions'

/** useOptimistic ใช้กับ toggle เท่านั้น — มันคือสิ่งเดียวที่กดรัวติดกันจนความหน่วงกวนใจ */
export function PaidToggle({ id, isPaid, label }: { id: number; isPaid: boolean; label: string }) {
  const [optimisticPaid, setOptimisticPaid] = useOptimistic(isPaid)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <input
        type="checkbox"
        checked={optimisticPaid}
        aria-label={`จ่ายแล้ว: ${label}`}
        onChange={() => {
          // อ้างอิงจาก optimisticPaid ไม่ใช่ isPaid — กันกดรัวแล้วค่าที่ส่งไปไม่ตรงกับที่เห็นบนจอ
          const next = !optimisticPaid
          startTransition(async () => {
            setOptimisticPaid(next)
            const result = await togglePaidAction({ id, isPaid: next })
            setError(result.ok ? null : result.message)
          })
        }}
      />
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

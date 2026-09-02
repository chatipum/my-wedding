'use client'

import { useOptimistic, useTransition } from 'react'
import { togglePaidAction } from './actions'

/** useOptimistic ใช้กับ toggle เท่านั้น — มันคือสิ่งเดียวที่กดรัวติดกันจนความหน่วงกวนใจ */
export function PaidToggle({ id, isPaid, label }: { id: number; isPaid: boolean; label: string }) {
  const [optimisticPaid, setOptimisticPaid] = useOptimistic(isPaid)
  const [, startTransition] = useTransition()

  return (
    <input
      type="checkbox"
      checked={optimisticPaid}
      aria-label={`จ่ายแล้ว: ${label}`}
      onChange={() => {
        startTransition(async () => {
          setOptimisticPaid(!isPaid)
          await togglePaidAction({ id, isPaid: !isPaid })
        })
      }}
    />
  )
}

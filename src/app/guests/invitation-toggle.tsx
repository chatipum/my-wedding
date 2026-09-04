'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { setInvitationGivenAction } from './actions'

/** ยก pattern มาจาก PaidToggle — นั่งไล่ติ๊กทีละสิบรายรวด ความหน่วงต่อครั้งกวนใจกว่าที่คิด */
export function InvitationToggle({
  id,
  invitationGiven,
  name,
}: {
  id: number
  invitationGiven: boolean
  name: string
}) {
  const [optimisticGiven, setOptimisticGiven] = useOptimistic(invitationGiven)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <input
        type="checkbox"
        checked={optimisticGiven}
        aria-label={`แจกซองแล้ว: ${name}`}
        onChange={() => {
          // อ้างอิงจาก optimisticGiven ไม่ใช่ invitationGiven — กันกดรัวแล้วค่าที่ส่งไปไม่ตรงกับที่เห็นบนจอ
          const next = !optimisticGiven
          startTransition(async () => {
            setOptimisticGiven(next)
            const result = await setInvitationGivenAction({ id, invitationGiven: next })
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

'use client'

import { useState } from 'react'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { deleteExpenseAction } from './actions'

export function DeleteExpenseButton({ id, name }: { id: number; name: string }) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <ConfirmButton
        question={`ลบ "${name}" ? ลบแล้วกู้คืนไม่ได้`}
        onConfirm={async () => {
          const result = await deleteExpenseAction({ id })
          setError(result.ok ? null : result.message)
        }}
      >
        ลบ
      </ConfirmButton>
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

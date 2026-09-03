'use client'

import { useState } from 'react'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { deleteEnvelopeAction } from './actions'

export function DeleteEnvelopeButton({ id, label }: { id: number; label: string }) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <ConfirmButton
        question={`ลบซองของ ${label} ? ลบแล้วกู้คืนไม่ได้`}
        onConfirm={async () => {
          const result = await deleteEnvelopeAction({ id })
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

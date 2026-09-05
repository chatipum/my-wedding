'use client'

import { useState } from 'react'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { TrashIcon } from '@/components/ui/icons'
import { deleteEnvelopeAction } from './actions'

export function DeleteEnvelopeButton({ id, label }: { id: number; label: string }) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <ConfirmButton
        label={`ลบซองของ ${label}`}
        question={`ลบซองของ ${label} ? ลบแล้วกู้คืนไม่ได้`}
        onConfirm={async () => {
          const result = await deleteEnvelopeAction({ id })
          setError(result.ok ? null : result.message)
        }}
      >
        <TrashIcon />
      </ConfirmButton>
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  )
}

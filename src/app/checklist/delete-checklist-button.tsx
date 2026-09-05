'use client'

import { useState } from 'react'
import { ConfirmButton } from '@/components/ui/confirm-button'
import { TrashIcon } from '@/components/ui/icons'
import { deleteChecklistItemAction } from './actions'

export function DeleteChecklistButton({ id, name }: { id: number; name: string }) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      <ConfirmButton
        label={`ลบ ${name}`}
        question={`ลบงาน "${name}" ? ลบแล้วกู้คืนไม่ได้`}
        onConfirm={async () => {
          const result = await deleteChecklistItemAction({ id })
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

'use client'

import { ConfirmButton } from '@/components/ui/confirm-button'
import { deleteEnvelopeAction } from './actions'

export function DeleteEnvelopeButton({ id, label }: { id: number; label: string }) {
  return (
    <ConfirmButton
      question={`ลบซองของ ${label} ? ลบแล้วกู้คืนไม่ได้`}
      onConfirm={() => deleteEnvelopeAction({ id })}
    >
      ลบ
    </ConfirmButton>
  )
}

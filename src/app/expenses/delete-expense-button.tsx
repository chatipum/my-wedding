'use client'

import { ConfirmButton } from '@/components/ui/confirm-button'
import { deleteExpenseAction } from './actions'

export function DeleteExpenseButton({ id, name }: { id: number; name: string }) {
  return (
    <ConfirmButton
      question={`ลบ "${name}" ? ลบแล้วกู้คืนไม่ได้`}
      onConfirm={() => deleteExpenseAction({ id })}
    >
      ลบ
    </ConfirmButton>
  )
}

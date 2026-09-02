'use client'

import { useTransition } from 'react'
import { Button } from './button'

export function ConfirmButton({
  question,
  onConfirm,
  children,
}: {
  question: string
  onConfirm: () => Promise<unknown>
  children: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      disabled={isPending}
      onClick={() => {
        // ไม่มี undo — confirm() คือด่านเดียว (ตัดสินใจไว้ในสเปคข้อ 8)
        if (!window.confirm(question)) return
        startTransition(async () => {
          await onConfirm()
        })
      }}
    >
      {children}
    </Button>
  )
}

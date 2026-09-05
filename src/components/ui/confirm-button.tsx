'use client'

import { useTransition } from 'react'
import { Button } from './button'

export function ConfirmButton({
  question,
  onConfirm,
  label,
  children,
}: {
  question: string
  onConfirm: () => Promise<unknown>
  /** ปุ่มเป็น icon ล้วน — label คือชื่อที่ screen reader อ่านและ tooltip ตอน hover */
  label: string
  children: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      aria-label={label}
      title={label}
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

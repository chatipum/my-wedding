'use client'

import { useTransition } from 'react'
import { Button } from './button'

export function ConfirmButton({
  question,
  onConfirm,
  label,
  children,
}: {
  /** เว้นว่าง = ลบทันทีไม่ถาม — ใช้กับของที่กรอกใหม่ได้ในสองวินาที (ซองที่มีแค่ยอด) */
  question?: string
  onConfirm: () => Promise<unknown>
  /** ปุ่มเป็น icon ล้วน — label คือชื่อที่ screen reader อ่านและ tooltip ตอน hover */
  label: string
  children: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="danger"
      className="btn-icon"
      aria-label={label}
      title={label}
      disabled={isPending}
      onClick={() => {
        // ลบแล้วไม่มี undo — ถ้ามี question ให้ confirm() เป็นด่านเดียวก่อนลบ
        if (question !== undefined && !window.confirm(question)) return
        startTransition(async () => {
          await onConfirm()
        })
      }}
    >
      {children}
    </Button>
  )
}

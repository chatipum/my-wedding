'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js requires this file's default export to be named Error
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card>
      <h1 className="text-lg font-semibold">โหลดข้อมูลไม่ได้</h1>
      <p className="text-muted mt-1">ต่อฐานข้อมูลไม่ติด ลองใหม่อีกครั้ง</p>
      <details className="mt-3">
        <summary className="text-muted cursor-pointer text-sm">รายละเอียดข้อผิดพลาด</summary>
        <pre className="mt-2 overflow-x-auto text-sm">{error.message}</pre>
      </details>
      <Button className="mt-4" onClick={reset}>
        ลองใหม่
      </Button>
    </Card>
  )
}

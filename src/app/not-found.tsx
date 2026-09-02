import Link from 'next/link'
import { Card } from '@/components/ui/card'

export default function NotFound() {
  return (
    <Card>
      <h1 className="text-lg font-semibold">ไม่พบหน้านี้</h1>
      <Link href="/" className="text-accent mt-2 inline-block">
        กลับไปหน้าภาพรวม
      </Link>
    </Card>
  )
}

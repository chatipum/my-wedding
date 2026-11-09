import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/cn'
import { loadDashboard } from '@/db/queries'
import { countGuests, countGuestsBySide, type GuestCounts, summarizeNet } from '@/lib/totals'
import { BreakEvenCard } from './break-even-card'

export default async function DashboardPage() {
  const { expenseRows, envelopeRows, guestRows } = await loadDashboard()
  const money = summarizeNet(expenseRows, envelopeRows)
  const guestCounts = countGuests(guestRows)
  const bySide = countGuestsBySide(guestRows)

  return (
    <>
      <PageHeader title="ภาพรวม" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <p className="text-muted">ซองรับ</p>
          <p className="text-xl font-semibold">
            <Money value={money.received} />
          </p>
        </Card>
        <Card>
          <p className="text-muted">จ่ายแล้ว</p>
          <p className="text-xl font-semibold">
            <Money value={money.paid} />
          </p>
        </Card>
        <Card>
          <p className="text-muted">ค้างจ่าย</p>
          <p className="text-xl font-semibold">
            <Money value={money.unpaid} />
          </p>
          {/* ตัวเลขค้างจ่ายเชื่อได้แค่ไหนขึ้นกับบรรทัดนี้ */}
          <p className="text-muted text-sm">ยังไม่ระบุยอด {money.unknownCount} รายการ</p>
        </Card>
        <Card>
          <p className="text-muted">สุทธิ</p>
          <p className="text-xl font-semibold">
            <Money value={money.net} />
          </p>
          <p className="text-muted text-sm">ซองรับ − จ่ายแล้ว − ค้างจ่าย</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <h2 className="font-semibold">แขก</h2>
            <div className="flex flex-wrap gap-2">
              <Stat label="ทั้งหมด" value={guestCounts.invitedPeople} />
              <Stat label="คาดว่ามา (ขั้นต่ำ)" value={guestCounts.expectedMin} />
              <Stat label="ยืนยัน" value={guestCounts.confirmed} />
            </div>
          </div>

          <div className="grid gap-3">
            <SideBars label="เจ้าบ่าว" counts={bySide.groom} />
            <SideBars label="เจ้าสาว" counts={bySide.bride} />
          </div>

          <p className="text-muted text-sm mt-4">
            {/* หน่วยเป็นซอง ไม่ใช่คน — แจกต่อแถวแขก ผู้ติดตามไม่ได้ซองของตัวเอง */}
            แจกซองแล้ว {guestCounts.invitationsGiven} จาก {guestCounts.total} ซอง · ยังไม่ตอบ{' '}
            {guestCounts.pending} ราย · ไม่มา {guestCounts.declined} ราย
          </p>
          <Link href="/guests" className="text-accent mt-2 inline-block">
            ดูรายชื่อแขก
          </Link>
        </Card>

        <BreakEvenCard
          totalExpense={money.paid + money.unpaid}
          unknownCount={money.unknownCount}
          envelopesReceived={envelopeRows.length}
          guestCounts={guestCounts}
        />
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-bg px-3 py-1.5">
      <p className="text-muted text-xs">{label}</p>
      <p className="font-semibold">{value} คน</p>
    </div>
  )
}

function SideBars({ label, counts }: { label: string; counts: GuestCounts }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr] items-center gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid gap-1">
        <Bar label="คาดว่ามา" value={counts.expectedMin} max={counts.invitedPeople} className="bg-accent/25" />
        <Bar label="ยืนยัน" value={counts.confirmed} max={counts.invitedPeople} className="bg-accent/60" />
      </div>
    </div>
  )
}

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  const widthPercent = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="relative h-6 rounded bg-bg">
      <div className={cn('h-full rounded', className)} style={{ width: `${widthPercent}%` }} />
      {/* ป้ายลอยบนราง ไม่อยู่ในแท่ง — แท่งสั้นหรือเป็นศูนย์ก็ยังอ่านออก */}
      <span className="absolute inset-y-0 left-2 flex items-center text-xs whitespace-nowrap">
        {label} {value} คน
      </span>
    </div>
  )
}

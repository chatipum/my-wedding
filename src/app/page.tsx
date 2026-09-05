import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { loadDashboard } from '@/db/queries'
import { countGuests, countGuestsBySide, summarizeNet } from '@/lib/totals'
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
          <h2 className="font-semibold mb-2">แขก</h2>
          <p>
            ประมาณการ <strong>{guestCounts.estimated}</strong> คน
            <span className="text-muted">
              {' · '}เจ้าบ่าว {bySide.groom.estimated} · เจ้าสาว {bySide.bride.estimated}
            </span>
          </p>
          <p>
            ยืนยันแล้ว <strong>{guestCounts.confirmed}</strong> คน
            <span className="text-muted">
              {' · '}เจ้าบ่าว {bySide.groom.confirmed} · เจ้าสาว {bySide.bride.confirmed}
            </span>
          </p>
          <p>
            {/* หน่วยเป็นซอง ไม่ใช่คน — แจกต่อแถวแขก ผู้ติดตามไม่ได้ซองของตัวเอง */}
            แจกซองแล้ว <strong>{guestCounts.invitationsGiven}</strong> จาก {guestCounts.total} ซอง
          </p>
          <p className="text-muted text-sm">
            ยังไม่ตอบ {guestCounts.pending} ราย · ตอบว่าไม่มา {guestCounts.declined} ราย
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

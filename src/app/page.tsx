import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { loadDashboard } from '@/db/queries'
import { countGuests, summarizeNet, upcomingDeadlines } from '@/lib/totals'
import { checklistStatus } from '@/lib/ui'

export default async function DashboardPage() {
  const { expenseRows, envelopeRows, guestRows, checklistRows } = await loadDashboard()
  const money = summarizeNet(expenseRows, envelopeRows)
  const guestCounts = countGuests(guestRows)
  const deadlines = upcomingDeadlines(checklistRows)

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
          </p>
          <p>
            ยืนยันแล้ว <strong>{guestCounts.confirmed}</strong> คน
          </p>
          <p className="text-muted text-sm">
            ยังไม่ตอบ {guestCounts.pending} ราย · ตอบว่าไม่มา {guestCounts.declined} ราย
          </p>
          <Link href="/guests" className="text-accent mt-2 inline-block">
            ดูรายชื่อแขก
          </Link>
        </Card>

        <Card>
          <h2 className="font-semibold mb-2">งานค้างที่ใกล้กำหนด</h2>
          <DataTable
            caption="งานที่ยังไม่เสร็จ เรียงตามกำหนดส่ง"
            columns={[
              { key: 'name', label: 'งาน' },
              { key: 'status', label: 'สถานะ' },
              { key: 'deadline', label: 'กำหนด' },
            ]}
            isEmpty={deadlines.length === 0}
            emptyMessage="ยังไม่มีงานที่ตั้งกำหนดไว้"
          >
            {deadlines.map((row) => {
              const status = checklistStatus(row.status)
              return (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>
                    <Badge status={status.key}>{status.label}</Badge>
                  </td>
                  <td>
                    <DateText value={row.deadline} />
                  </td>
                </tr>
              )
            })}
          </DataTable>
        </Card>
      </div>
    </>
  )
}

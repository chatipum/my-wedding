import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { listEnvelopes } from '@/db/queries'
import { todayIso } from '@/lib/date'
import { sumEnvelopes } from '@/lib/totals'
import { DeleteEnvelopeButton } from './delete-envelope-button'
import { EnvelopeForm } from './envelope-form'

export default async function EnvelopesPage() {
  const rows = await listEnvelopes()
  const total = sumEnvelopes(rows)

  return (
    <>
      <PageHeader title="ซองรับ">
        <span>
          รวม <Money value={total} />
        </span>
        <span>{rows.length} ซอง</span>
      </PageHeader>

      <EnvelopeForm today={todayIso()} />

      <Card>
        <DataTable
          caption="ซองที่รับมาแล้ว"
          columns={[
            { key: 'giver', label: 'ผู้ให้' },
            { key: 'received', label: 'วันที่รับ' },
            { key: 'note', label: 'หมายเหตุ' },
            { key: 'amount', label: 'ยอด', numeric: true },
            { key: 'actions', label: '' },
          ]}
          isEmpty={rows.length === 0}
          emptyMessage="ยังไม่มีซอง"
        >
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.giverName ?? 'ไม่ระบุชื่อ'}</td>
              <td>
                <DateText value={row.receivedAt} />
              </td>
              <td>{row.note ?? '—'}</td>
              <td className="num">
                <Money value={row.amount} />
              </td>
              <td>
                <DeleteEnvelopeButton id={row.id} label={row.giverName ?? 'ไม่ระบุชื่อ'} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  )
}

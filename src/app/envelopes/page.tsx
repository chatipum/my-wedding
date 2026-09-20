import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { listEnvelopes } from '@/db/queries'
import { sumEnvelopes } from '@/lib/totals'
import { COLUMNS } from './columns'
import { EnvelopeForm } from './envelope-form'
import { EnvelopeRow } from './envelope-row'

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

      <EnvelopeForm />

      <Card className="card-flush">
        <DataTable
          caption="ซองที่รับมาแล้ว"
          columns={COLUMNS}
          isEmpty={rows.length === 0}
          emptyMessage="ยังไม่มีซอง"
        >
          {rows.map((row) => (
            <EnvelopeRow key={row.id} row={row} />
          ))}
        </DataTable>
      </Card>
    </>
  )
}

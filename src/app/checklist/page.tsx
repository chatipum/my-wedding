import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { type ChecklistWithVendor, loadChecklistPage } from '@/db/queries'
import { CHECKLIST_STATUS_ORDER, checklistStatus } from '@/lib/ui'
import { ChecklistForm } from './checklist-form'
import { ChecklistRow } from './checklist-row'

const COLUMNS = [
  { key: 'name', label: 'งาน' },
  { key: 'category', label: 'หมวด' },
  { key: 'vendor', label: 'ผู้ให้บริการ' },
  { key: 'deadline', label: 'กำหนดส่ง' },
  { key: 'budget', label: 'งบที่ตั้งไว้', numeric: true },
  { key: 'deposit', label: 'มัดจำ' },
  { key: 'status', label: 'สถานะ' },
  { key: 'actions', label: '' },
]

export default async function ChecklistPage() {
  const { items, vendorOptions } = await loadChecklistPage()

  const grouped = CHECKLIST_STATUS_ORDER.map((status) => ({
    status,
    label: checklistStatus(status).label,
    rows: items.filter((item: ChecklistWithVendor) => item.status === status),
  }))

  return (
    <>
      <PageHeader title="Checklist">
        <span>ทั้งหมด {items.length} งาน</span>
        {/* งบใน checklist คือ "เงินที่ตั้งไว้" ไม่ใช่เงินที่จ่ายจริง จึงไม่มียอดรวมที่นี่ */}
        <span className="text-sm">ยอดเงินจริงดูที่หน้าค่าใช้จ่าย</span>
      </PageHeader>

      <ChecklistForm vendorOptions={vendorOptions} />

      {grouped.map((group) => (
        <Card key={group.status} className="mb-4">
          <h2 className="font-semibold mb-2">
            {group.label} ({group.rows.length})
          </h2>
          <DataTable
            caption={`งานที่${group.label}`}
            columns={COLUMNS}
            isEmpty={group.rows.length === 0}
            emptyMessage={`ยังไม่มีงานที่${group.label}`}
          >
            {group.rows.map((row) => (
              <ChecklistRow
                key={row.id}
                row={row}
                vendorOptions={vendorOptions}
                columnCount={COLUMNS.length}
              />
            ))}
          </DataTable>
        </Card>
      ))}
    </>
  )
}

import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { loadVendorsPage } from '@/db/queries'
import { summarizeByVendor } from '@/lib/totals'
import { VendorForm } from './vendor-form'
import { VendorRow } from './vendor-row'

const COLUMNS = [
  { key: 'name', label: 'ผู้ให้บริการ' },
  { key: 'role', label: 'หน้าที่' },
  { key: 'phone', label: 'เบอร์โทร' },
  { key: 'line', label: 'LINE' },
  { key: 'agreed', label: 'ราคาที่ตกลง', numeric: true },
  { key: 'paid', label: 'จ่ายแล้ว', numeric: true },
  { key: 'unpaid', label: 'ค้างจ่าย', numeric: true },
  { key: 'unknown', label: 'ยังไม่ระบุยอด', numeric: true },
  { key: 'actions', label: '' },
]

export default async function VendorsPage() {
  const { vendorRows, expenseRows } = await loadVendorsPage()
  const totals = summarizeByVendor(expenseRows)

  return (
    <>
      <PageHeader title="ผู้ให้บริการ">
        <span>{vendorRows.length} เจ้า</span>
      </PageHeader>

      <VendorForm />

      <Card>
        <DataTable
          caption="ผู้ให้บริการและยอดที่จ่ายให้แต่ละเจ้า"
          columns={COLUMNS}
          isEmpty={vendorRows.length === 0}
          emptyMessage="ยังไม่มีผู้ให้บริการ"
        >
          {vendorRows.map((vendor) => (
            <VendorRow
              key={vendor.id}
              vendor={vendor}
              summary={totals.get(vendor.id)}
              columnCount={COLUMNS.length}
            />
          ))}
        </DataTable>
      </Card>
    </>
  )
}

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import { PageHeader } from '@/components/ui/page-header'
import { loadExpensesPage } from '@/db/queries'
import { summarizeByCategory, summarizeExpenses } from '@/lib/totals'
import { paidStatus } from '@/lib/ui'
import { DeleteExpenseButton } from './delete-expense-button'
import { ExpenseForm } from './expense-form'
import { PaidToggle } from './paid-toggle'

const COLUMNS = [
  { key: 'paid', label: 'จ่ายแล้ว' },
  { key: 'name', label: 'รายการ' },
  { key: 'category', label: 'หมวด' },
  { key: 'vendor', label: 'ผู้ให้บริการ' },
  { key: 'due', label: 'กำหนดจ่าย' },
  { key: 'amount', label: 'ยอด', numeric: true },
  { key: 'status', label: 'สถานะ' },
  { key: 'actions', label: '' },
]

export default async function ExpensesPage() {
  const { rows, vendorOptions } = await loadExpensesPage()
  const summary = summarizeExpenses(rows)
  const byCategory = summarizeByCategory(rows)

  return (
    <>
      <PageHeader title="ค่าใช้จ่าย">
        <span>
          จ่ายแล้ว <Money value={summary.paid} />
        </span>
        <span>
          ค้างจ่าย <Money value={summary.unpaid} />
        </span>
        {/* ตัวนับนี้ต้องอยู่ทุกที่ที่แสดงยอดรวม ไม่งั้นตัวเลขค้างจ่ายจะต่ำกว่าความจริงเงียบๆ */}
        <span>ยังไม่ระบุยอด {summary.unknownCount} รายการ</span>
      </PageHeader>

      <ExpenseForm vendorOptions={vendorOptions} />

      <Card className="mb-6">
        <DataTable
          caption="ค่าใช้จ่ายทั้งหมด"
          columns={COLUMNS}
          isEmpty={rows.length === 0}
          emptyMessage="ยังไม่มีรายการค่าใช้จ่าย"
        >
          {rows.map((row) => {
            const status = paidStatus(row.amount, row.isPaid)
            return (
              <tr key={row.id}>
                <td>
                  <PaidToggle id={row.id} isPaid={row.isPaid} label={row.name} />
                </td>
                <td>{row.name}</td>
                <td>{row.category ?? '—'}</td>
                <td>{row.vendorName ?? '—'}</td>
                <td>
                  <DateText value={row.dueDate} />
                </td>
                <td className="num">
                  <Money value={row.amount} />
                </td>
                <td>
                  <Badge status={status.key}>{status.label}</Badge>
                </td>
                <td>
                  <DeleteExpenseButton id={row.id} name={row.name} />
                </td>
              </tr>
            )
          })}
        </DataTable>
      </Card>

      <Card>
        <DataTable
          caption="สรุปแยกหมวด"
          columns={[
            { key: 'category', label: 'หมวด' },
            { key: 'count', label: 'รายการ', numeric: true },
            { key: 'paid', label: 'จ่ายแล้ว', numeric: true },
            { key: 'unpaid', label: 'ค้างจ่าย', numeric: true },
            { key: 'total', label: 'รวม', numeric: true },
            { key: 'unknown', label: 'ยังไม่ระบุยอด', numeric: true },
          ]}
          isEmpty={byCategory.length === 0}
        >
          {byCategory.map((row) => (
            <tr key={row.category}>
              <td>{row.category}</td>
              <td className="num">{row.count}</td>
              <td className="num">
                <Money value={row.paid} />
              </td>
              <td className="num">
                <Money value={row.unpaid} />
              </td>
              <td className="num">
                <Money value={row.total} />
              </td>
              <td className="num">{row.unknownCount}</td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  )
}

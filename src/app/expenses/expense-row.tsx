'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DateText } from '@/components/ui/date-text'
import { PencilIcon } from '@/components/ui/icons'
import { Money } from '@/components/ui/money'
import type { ExpenseWithVendor, VendorOption } from '@/db/queries'
import { paidStatus } from '@/lib/ui'
import { Cell } from './columns'
import { DeleteExpenseButton } from './delete-expense-button'
import { ExpenseForm, toExpenseFormValues } from './expense-form'
import { PaidToggle } from './paid-toggle'

/** กางฟอร์มเป็น <tr> เต็มความกว้างใต้แถวเดิม ไม่ใช้ modal — ตารางยังเป็นตารางจริง */
export function ExpenseRow({
  row,
  vendorOptions,
  columnCount,
}: {
  row: ExpenseWithVendor
  vendorOptions: VendorOption[]
  columnCount: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const status = paidStatus(row.amount, row.isPaid)

  return (
    <>
      <tr>
        <Cell name="paid">
          <PaidToggle id={row.id} isPaid={row.isPaid} label={row.name} />
        </Cell>
        <Cell name="name">{row.name}</Cell>
        <Cell name="category">{row.category ?? '—'}</Cell>
        <Cell name="vendor">{row.vendorName ?? '—'}</Cell>
        <Cell name="due">
          <DateText value={row.dueDate} />
        </Cell>
        <Cell name="amount">
          <Money value={row.amount} />
        </Cell>
        <Cell name="status">
          <Badge status={status.key}>{status.label}</Badge>
        </Cell>
        <Cell name="actions" className="flex gap-2">
          <Button
            variant="ghost"
            className="btn-icon"
            aria-label={`แก้ไข ${row.name}`}
            title={`แก้ไข ${row.name}`}
            aria-expanded={isEditing}
            onClick={() => setIsEditing((open) => !open)}
          >
            <PencilIcon />
          </Button>
          <DeleteExpenseButton id={row.id} name={row.name} />
        </Cell>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <ExpenseForm
              vendorOptions={vendorOptions}
              initial={toExpenseFormValues(row)}
              onDone={() => setIsEditing(false)}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}

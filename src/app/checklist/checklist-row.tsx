'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DateText } from '@/components/ui/date-text'
import { PencilIcon } from '@/components/ui/icons'
import { Money } from '@/components/ui/money'
import type { ChecklistWithVendor, VendorOption } from '@/db/queries'
import { ChecklistForm, toChecklistFormValues } from './checklist-form'
import { DeleteChecklistButton } from './delete-checklist-button'
import { StatusSelect } from './status-select'

export function ChecklistRow({
  row,
  vendorOptions,
  columnCount,
}: {
  row: ChecklistWithVendor
  vendorOptions: VendorOption[]
  columnCount: number
}) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <tr>
        <td>{row.name}</td>
        <td>{row.category ?? '—'}</td>
        <td>{row.vendorName ?? '—'}</td>
        <td>
          <DateText value={row.deadline} />
        </td>
        <td className="num">
          <Money value={row.budget} />
        </td>
        <td>{row.depositPaid ? 'จ่ายแล้ว' : '—'}</td>
        <td>
          <StatusSelect id={row.id} status={row.status} name={row.name} />
        </td>
        <td className="flex gap-2">
          <Button
            variant="ghost"
            aria-label={`แก้ไข ${row.name}`}
            title={`แก้ไข ${row.name}`}
            aria-expanded={isEditing}
            onClick={() => setIsEditing((open) => !open)}
          >
            <PencilIcon />
          </Button>
          <DeleteChecklistButton id={row.id} name={row.name} />
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <ChecklistForm
              vendorOptions={vendorOptions}
              initial={toChecklistFormValues(row)}
              onDone={() => setIsEditing(false)}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}

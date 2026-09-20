'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PencilIcon } from '@/components/ui/icons'
import { Money } from '@/components/ui/money'
import type { Vendor } from '@/db/schema'
import type { VendorSummary } from '@/lib/totals'
import { Cell } from './columns'
import { DeleteVendorButton } from './delete-vendor-button'
import { toVendorFormValues, VendorForm } from './vendor-form'

export function VendorRow({
  vendor,
  summary,
  columnCount,
}: {
  vendor: Vendor
  summary: VendorSummary | undefined
  columnCount: number
}) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <tr>
        <Cell name="name">{vendor.name}</Cell>
        <Cell name="role">{vendor.role ?? '—'}</Cell>
        <Cell name="phone">
          {vendor.phone ? <a href={`tel:${vendor.phone}`}>{vendor.phone}</a> : '—'}
        </Cell>
        <Cell name="line">{vendor.line ?? '—'}</Cell>
        <Cell name="agreed">
          <Money value={vendor.totalPrice} />
        </Cell>
        <Cell name="paid">
          <Money value={summary?.paid ?? 0} />
        </Cell>
        <Cell name="unpaid">
          <Money value={summary?.unpaid ?? 0} />
        </Cell>
        <Cell name="unknown">{summary?.unknownCount ?? 0}</Cell>
        <Cell name="actions" className="flex gap-2">
          <Button
            variant="ghost"
            className="btn-icon"
            aria-label={`แก้ไข ${vendor.name}`}
            title={`แก้ไข ${vendor.name}`}
            aria-expanded={isEditing}
            onClick={() => setIsEditing((open) => !open)}
          >
            <PencilIcon />
          </Button>
          <DeleteVendorButton id={vendor.id} name={vendor.name} />
        </Cell>
      </tr>
      {isEditing ? (
        <tr className="row-form">
          <td colSpan={columnCount}>
            <VendorForm initial={toVendorFormValues(vendor)} onDone={() => setIsEditing(false)} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

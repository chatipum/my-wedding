'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/money'
import type { Vendor } from '@/db/schema'
import type { VendorSummary } from '@/lib/totals'
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
        <td>{vendor.name}</td>
        <td>{vendor.role ?? '—'}</td>
        <td>{vendor.phone ? <a href={`tel:${vendor.phone}`}>{vendor.phone}</a> : '—'}</td>
        <td>{vendor.line ?? '—'}</td>
        <td className="num">
          <Money value={vendor.totalPrice} />
        </td>
        <td className="num">
          <Money value={summary?.paid ?? 0} />
        </td>
        <td className="num">
          <Money value={summary?.unpaid ?? 0} />
        </td>
        <td className="num">{summary?.unknownCount ?? 0}</td>
        <td className="flex gap-2">
          <Button
            variant="ghost"
            aria-expanded={isEditing}
            onClick={() => setIsEditing((open) => !open)}
          >
            แก้ไข
          </Button>
          <DeleteVendorButton id={vendor.id} name={vendor.name} />
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <VendorForm initial={toVendorFormValues(vendor)} onDone={() => setIsEditing(false)} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

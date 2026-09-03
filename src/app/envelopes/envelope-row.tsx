'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DateText } from '@/components/ui/date-text'
import { Money } from '@/components/ui/money'
import type { Envelope } from '@/db/schema'
import { DeleteEnvelopeButton } from './delete-envelope-button'
import { EnvelopeForm, toEnvelopeFormValues } from './envelope-form'

export function EnvelopeRow({ row, columnCount }: { row: Envelope; columnCount: number }) {
  const [isEditing, setIsEditing] = useState(false)
  const label = row.giverName ?? 'ไม่ระบุชื่อ'

  return (
    <>
      <tr>
        <td>{label}</td>
        <td>
          <DateText value={row.receivedAt} />
        </td>
        <td>{row.note ?? '—'}</td>
        <td className="num">
          <Money value={row.amount} />
        </td>
        <td className="flex gap-2">
          <Button
            variant="ghost"
            aria-expanded={isEditing}
            onClick={() => setIsEditing((open) => !open)}
          >
            แก้ไข
          </Button>
          <DeleteEnvelopeButton id={row.id} label={label} />
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <EnvelopeForm
              today={row.receivedAt}
              initial={toEnvelopeFormValues(row)}
              onDone={() => setIsEditing(false)}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}

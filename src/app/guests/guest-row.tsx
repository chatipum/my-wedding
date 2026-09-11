'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PencilIcon } from '@/components/ui/icons'
import type { Guest } from '@/db/schema'
import { rsvpStatus } from '@/lib/ui'
import { DeleteGuestButton } from './delete-guest-button'
import { GuestForm, toGuestFormValues } from './guest-form'
import { InvitationToggle } from './invitation-toggle'

export function GuestRow({ guest, columnCount }: { guest: Guest; columnCount: number }) {
  const [isEditing, setIsEditing] = useState(false)
  const rsvp = rsvpStatus(guest.rsvp)

  return (
    <>
      <tr>
        <td>{guest.name}</td>
        <td>{guest.side === 'groom' ? 'เจ้าบ่าว' : 'เจ้าสาว'}</td>
        <td>{guest.group ?? '—'}</td>
        <td className="num">{guest.companionsConfirmed ?? 'ยังไม่ถาม'}</td>
        <td>
          <Badge status={rsvp.key}>{rsvp.label}</Badge>
        </td>
        <td>
          <InvitationToggle
            id={guest.id}
            invitationGiven={guest.invitationGiven}
            name={guest.name}
          />
        </td>
        <td className="flex gap-2">
          <Button
            variant="ghost"
            className="btn-icon"
            aria-label={`แก้ไข ${guest.name}`}
            title={`แก้ไข ${guest.name}`}
            aria-expanded={isEditing}
            onClick={() => setIsEditing((open) => !open)}
          >
            <PencilIcon />
          </Button>
          <DeleteGuestButton id={guest.id} name={guest.name} />
        </td>
      </tr>
      {isEditing ? (
        <tr>
          <td colSpan={columnCount}>
            <GuestForm initial={toGuestFormValues(guest)} onDone={() => setIsEditing(false)} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

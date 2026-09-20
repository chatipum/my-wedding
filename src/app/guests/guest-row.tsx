'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PencilIcon } from '@/components/ui/icons'
import type { Guest } from '@/db/schema'
import { rsvpStatus } from '@/lib/ui'
import { Cell } from './columns'
import { DeleteGuestButton } from './delete-guest-button'
import { GuestForm, toGuestFormValues } from './guest-form'
import { InvitationToggle } from './invitation-toggle'

export function GuestRow({ guest, columnCount }: { guest: Guest; columnCount: number }) {
  const [isEditing, setIsEditing] = useState(false)
  const rsvp = rsvpStatus(guest.rsvp)

  return (
    <>
      <tr>
        <Cell name="name">{guest.name}</Cell>
        <Cell name="side">{guest.side === 'groom' ? 'เจ้าบ่าว' : 'เจ้าสาว'}</Cell>
        <Cell name="group">{guest.group ?? '—'}</Cell>
        <Cell name="confirmed">{guest.companionsConfirmed ?? 'ยังไม่ถาม'}</Cell>
        <Cell name="rsvp">
          <Badge status={rsvp.key}>{rsvp.label}</Badge>
        </Cell>
        <Cell name="invitation">
          <InvitationToggle
            id={guest.id}
            invitationGiven={guest.invitationGiven}
            name={guest.name}
          />
        </Cell>
        <Cell name="actions" className="flex gap-2">
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
        </Cell>
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

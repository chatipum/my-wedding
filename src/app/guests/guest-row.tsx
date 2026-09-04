'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Guest } from '@/db/schema'
import { DeleteGuestButton } from './delete-guest-button'
import { GuestForm, toGuestFormValues } from './guest-form'
import { InvitationToggle } from './invitation-toggle'
import { RsvpSelect } from './rsvp-select'

export function GuestRow({ guest, columnCount }: { guest: Guest; columnCount: number }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <>
      <tr>
        <td>{guest.name}</td>
        <td>{guest.side === 'groom' ? 'เจ้าบ่าว' : 'เจ้าสาว'}</td>
        <td>{guest.group ?? '—'}</td>
        <td className="num">{guest.companionsEstimated}</td>
        <td className="num">{guest.companionsConfirmed ?? 'ยังไม่ถาม'}</td>
        <td>
          <RsvpSelect id={guest.id} rsvp={guest.rsvp} name={guest.name} />
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
            aria-expanded={isEditing}
            onClick={() => setIsEditing((open) => !open)}
          >
            แก้ไข
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

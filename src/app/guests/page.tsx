import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { listGuests } from '@/db/queries'
import { countGuests } from '@/lib/totals'
import { GuestForm } from './guest-form'
import { GuestTable } from './guest-table'
import { ImportGuests } from './import-guests'

export default async function GuestsPage() {
  const guests = await listGuests()
  const counts = countGuests(guests)

  return (
    <>
      <PageHeader title="แขก">
        <span>ยืนยันแล้ว {counts.confirmed} คน</span>
        <span>ยังไม่ตอบ {counts.pending} ราย</span>
        <span>
          แจกซองแล้ว {counts.invitationsGiven} จาก {counts.total} ซอง
        </span>
      </PageHeader>

      <GuestForm />

      <ImportGuests existingNames={guests.map((guest) => guest.name)} />

      <Card>
        <GuestTable guests={guests} />
      </Card>
    </>
  )
}

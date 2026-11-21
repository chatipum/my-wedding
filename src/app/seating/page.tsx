import { listGuests } from '@/db/queries'
import { SeatingPlanner } from './seating-planner'

export default async function SeatingPage() {
  const guests = await listGuests()
  // ไม่ล้างโต๊ะของคนที่ตอบว่าไม่มา เผื่อเปลี่ยนใจ — แค่ไม่โชว์และไม่นับที่นั่ง
  return <SeatingPlanner guests={guests.filter((guest) => guest.rsvp !== 'no')} />
}

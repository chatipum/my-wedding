import type { GuestCounts } from '@/lib/totals'

/** ที่นั่งสูงสุดของงาน นับเป็น "คน" รวมผู้ติดตามแล้ว */
export const GUEST_CAPACITY = 400
export const DEFAULT_ENVELOPE_AMOUNT = 500

export type BreakEvenInput = {
  /** จ่ายแล้ว + ค้างจ่าย — รายการที่ยังไม่ระบุยอดไม่เข้าสูตร ต้องเตือนบนหน้าจอ */
  totalExpense: number
  perEnvelope: number
  guestCounts: Pick<GuestCounts, 'estimated' | 'total' | 'declined'>
  capacity?: number
}

export type BreakEven = {
  envelopesNeeded: number
  peoplePerEnvelope: number
  envelopeCapacity: number
  isFeasible: boolean
  envelopesOverCapacity: number
}

/**
 * คืน null เมื่อยอดต่อซองใช้ไม่ได้ — ช่องกรอกว่างต้องได้ "ยังคำนวณไม่ได้"
 * ไม่ใช่ Infinity หรือ 0 ที่หน้าตาเหมือนคำตอบจริง
 */
export function calculateBreakEven({
  totalExpense,
  perEnvelope,
  guestCounts,
  capacity = GUEST_CAPACITY,
}: BreakEvenInput): BreakEven | null {
  if (!Number.isFinite(perEnvelope) || perEnvelope <= 0) return null

  // แถวที่ตอบว่าไม่มาไม่กินที่นั่ง จึงไม่ควรถ่วงค่าเฉลี่ยให้ต่ำลง
  const invitableRows = guestCounts.total - guestCounts.declined
  const peoplePerEnvelope = invitableRows > 0 ? guestCounts.estimated / invitableRows : 1

  const envelopesNeeded = Math.ceil(totalExpense / perEnvelope)
  // ปัดลง — ปัดขึ้นแปลว่าเชิญคนเกินที่นั่งที่มีจริง
  const envelopeCapacity = Math.floor(capacity / peoplePerEnvelope)

  return {
    envelopesNeeded,
    peoplePerEnvelope,
    envelopeCapacity,
    isFeasible: envelopesNeeded <= envelopeCapacity,
    envelopesOverCapacity: Math.max(0, envelopesNeeded - envelopeCapacity),
  }
}

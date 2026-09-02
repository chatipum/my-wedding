import type { ChecklistStatus, Rsvp } from '@/db/schema'

export type StatusKey = 'paid' | 'unpaid' | 'unknown'

export const STATUS_STYLE = {
  paid: 'bg-paid/10 text-paid',
  unpaid: 'bg-unpaid/10 text-unpaid',
  unknown: 'bg-unknown/10 text-unknown',
} as const satisfies Record<StatusKey, string>

export function paidStatus(
  amount: number | null,
  isPaid: boolean,
): { key: StatusKey; label: string } {
  if (amount === null) return { key: 'unknown', label: 'ยังไม่ระบุยอด' }
  return isPaid ? { key: 'paid', label: 'จ่ายแล้ว' } : { key: 'unpaid', label: 'ค้างจ่าย' }
}

export function rsvpStatus(rsvp: Rsvp): { key: StatusKey; label: string } {
  if (rsvp === 'yes') return { key: 'paid', label: 'มาแน่' }
  if (rsvp === 'no') return { key: 'unpaid', label: 'ไม่มา' }
  return { key: 'unknown', label: 'ยังไม่ตอบ' }
}

export function checklistStatus(status: ChecklistStatus): { key: StatusKey; label: string } {
  if (status === 'done') return { key: 'paid', label: 'เสร็จแล้ว' }
  if (status === 'in_progress') return { key: 'unpaid', label: 'กำลังทำ' }
  return { key: 'unknown', label: 'ยังไม่เริ่ม' }
}

export const CHECKLIST_STATUS_ORDER: ChecklistStatus[] = ['in_progress', 'not_started', 'done']

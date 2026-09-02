import * as v from 'valibot'

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string; detail?: string; fieldErrors?: Record<string, string> }

export function toActionResult(error: unknown): ActionResult {
  if (v.isValiError(error)) {
    const flat = v.flatten(error.issues)
    const fieldErrors: Record<string, string> = {}
    for (const [field, messages] of Object.entries(flat.nested ?? {})) {
      const first = messages?.[0]
      if (first) fieldErrors[field] = first
    }
    return { ok: false, message: 'ข้อมูลที่กรอกยังไม่ถูกต้อง', fieldErrors }
  }

  console.error('[action]', error)
  return {
    ok: false,
    message: 'บันทึกไม่สำเร็จ',
    // แสดง error จริงได้เพราะผู้ใช้ 2 คนเป็นเจ้าของข้อมูลเอง
    // ถ้าวันหนึ่งใส่ auth แล้วเปิดให้คนอื่นเข้า ต้องตัดบรรทัดนี้ทิ้ง
    detail: error instanceof Error ? error.message : String(error),
  }
}

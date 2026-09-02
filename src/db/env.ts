export function requireDatabaseUrl(raw: string | undefined): string {
  if (!raw || raw.trim() === '') {
    throw new Error(
      'DATABASE_URL ยังไม่ได้ตั้งค่า — คัดลอก .env.example เป็น .env แล้วใส่ connection string ของ Neon',
    )
  }
  if (!/^postgres(ql)?:\/\//.test(raw)) {
    throw new Error('DATABASE_URL รูปแบบผิด — ต้องขึ้นต้นด้วย postgres:// หรือ postgresql://')
  }
  return raw
}

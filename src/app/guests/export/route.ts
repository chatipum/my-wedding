import writeXlsxFile from 'write-excel-file/node'
import { listGuests } from '@/db/queries'
import { todayIso } from '@/lib/date'
import { filterGuests, parseGuestFilter } from '@/lib/guest-filter'

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * ตัวกรองมาทาง query string จากหน้า /guests แล้วกรองซ้ำด้วย filterGuests ตัวเดียวกับหน้าจอ
 * — ไฟล์ที่ได้จึงเป็นข้อมูลล่าสุดใน DB ไม่ใช่ค่าที่ค้างอยู่ในแท็บ
 */
export async function GET(request: Request) {
  const filter = parseGuestFilter(new URL(request.url).searchParams)
  const guests = filterGuests(await listGuests(), filter)

  const buffer = await writeXlsxFile(
    [[{ value: 'ชื่อ', fontWeight: 'bold' }], ...guests.map((guest) => [{ value: guest.name }])],
    { sheet: 'รายชื่อแขก', stickyRowsCount: 1, columns: [{ width: 32 }] },
  ).toBuffer()

  const today = todayIso()

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': XLSX_CONTENT_TYPE,
      // filename ธรรมดารับได้แค่ ASCII — ชื่อไทยต้องมากับ filename* ซึ่งเบราว์เซอร์ปัจจุบันเลือกใช้ก่อน
      'Content-Disposition': `attachment; filename="guests-${today}.xlsx"; filename*=UTF-8''${encodeURIComponent(`แขก-${today}.xlsx`)}`,
    },
  })
}

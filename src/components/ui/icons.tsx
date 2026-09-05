/**
 * ปุ่ม action เป็น icon ล้วน — ตัว svg จึง aria-hidden ทั้งหมด
 * ชื่อที่ screen reader อ่านมาจาก aria-label บนปุ่มที่ครอบอยู่
 */
const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function PencilIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true" focusable="false">
      <path d="M11.06 2.44a1.5 1.5 0 0 1 2.12 2.12l-7.7 7.7-2.83.71.71-2.83z" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true" focusable="false">
      <path d="M2.5 4h11" />
      <path d="M6.5 4V2.5h3V4" />
      <path d="M4 4l.6 9a1 1 0 0 0 1 .95h4.8a1 1 0 0 0 1-.95L12 4" />
      <path d="M6.75 7v4M9.25 7v4" />
    </svg>
  )
}

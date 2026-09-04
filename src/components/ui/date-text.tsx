import { formatThaiDate } from '@/lib/date'

export function DateText({ value }: { value: string | null }) {
  if (value === null) return <span className="text-unknown">—</span>
  return <time dateTime={value}>{formatThaiDate(value)}</time>
}

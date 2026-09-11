import { Money } from '@/components/ui/money'
import type { Envelope } from '@/db/schema'
import { formatThaiDateTime } from '@/lib/date'
import { formatBaht } from '@/lib/money'
import { DeleteEnvelopeButton } from './delete-envelope-button'

export function EnvelopeRow({ row }: { row: Envelope }) {
  const receivedAt = formatThaiDateTime(row.createdAt)

  return (
    <tr>
      <td>
        <time dateTime={row.createdAt.toISOString()}>{receivedAt}</time>
      </td>
      <td className="num">
        <Money value={row.amount} />
      </td>
      <td>
        <DeleteEnvelopeButton id={row.id} label={`${formatBaht(row.amount)} รับเมื่อ ${receivedAt}`} />
      </td>
    </tr>
  )
}

import { Money } from '@/components/ui/money'
import type { Envelope } from '@/db/schema'
import { formatThaiDateTime } from '@/lib/date'
import { formatBaht } from '@/lib/money'
import { Cell } from './columns'
import { DeleteEnvelopeButton } from './delete-envelope-button'

export function EnvelopeRow({ row }: { row: Envelope }) {
  const receivedAt = formatThaiDateTime(row.createdAt)

  return (
    <tr>
      <Cell name="received">
        <time dateTime={row.createdAt.toISOString()}>{receivedAt}</time>
      </Cell>
      <Cell name="amount">
        <Money value={row.amount} />
      </Cell>
      <Cell name="actions">
        <DeleteEnvelopeButton id={row.id} label={`${formatBaht(row.amount)} รับเมื่อ ${receivedAt}`} />
      </Cell>
    </tr>
  )
}

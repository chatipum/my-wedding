import { cn } from '@/lib/cn'
import { STATUS_STYLE, type StatusKey } from '@/lib/ui'

export function Badge({ status, children }: { status: StatusKey; children: React.ReactNode }) {
  return <span className={cn('badge', STATUS_STYLE[status])}>{children}</span>
}

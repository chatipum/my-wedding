import Link from 'next/link'

const LINKS = [
  { href: '/', label: 'ภาพรวม' },
  { href: '/expenses', label: 'ค่าใช้จ่าย' },
  { href: '/envelopes', label: 'ซองรับ' },
  { href: '/guests', label: 'แขก' },
  { href: '/vendors', label: 'ผู้ให้บริการ' },
] as const

export function Nav() {
  return (
    <nav className="border-b border-border bg-surface">
      {/* เมนู 5 อันไม่เคยล้นบนจอ ≥640px — flex-nowrap จึงมีผลแค่ตอนจอแคบ */}
      <ul className="mx-auto flex max-w-5xl flex-nowrap gap-4 overflow-x-auto px-4 py-3">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="whitespace-nowrap">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

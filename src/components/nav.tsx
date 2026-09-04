import Link from 'next/link'

const LINKS = [
  { href: '/', label: 'ภาพรวม' },
  { href: '/expenses', label: 'ค่าใช้จ่าย' },
  { href: '/envelopes', label: 'ซองรับ' },
  { href: '/guests', label: 'แขก' },
  { href: '/checklist', label: 'Checklist' },
  { href: '/vendors', label: 'ผู้ให้บริการ' },
] as const

export function Nav() {
  return (
    <nav className="border-b border-border bg-surface">
      <ul className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-3">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

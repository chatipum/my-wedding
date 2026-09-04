export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children ? <div className="flex flex-wrap gap-4 text-muted">{children}</div> : null}
    </header>
  )
}

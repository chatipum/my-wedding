export function Spinner({ label = 'กำลังโหลด' }: { label?: string }) {
  return (
    <output className="text-muted flex items-center gap-2 py-8 justify-center">
      <span
        aria-hidden="true"
        className="inline-block size-4 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      {label}
    </output>
  )
}

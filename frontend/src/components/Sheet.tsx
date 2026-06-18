import type { ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full bg-[var(--bg)] rounded-t-2xl shadow-xl max-h-[92svh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--text-h)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 -mr-1 text-[var(--text)] hover:text-[var(--text-h)] transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

import { AlertIcon, CheckIcon } from './Icons'

export function FullPageLoader({ label }: { label: string }) {
  return (
    <main className="full-page-loader" aria-live="polite">
      <span className="spinner spinner--large" />
      <p>{label}</p>
    </main>
  )
}

interface NoticeProps {
  tone: 'error' | 'success'
  children: React.ReactNode
}

export function Notice({ tone, children }: NoticeProps) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'error' ? <AlertIcon /> : <CheckIcon />}
      <span>{children}</span>
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-list" aria-label="Loading requests" role="status">
      {Array.from({ length: rows }, (_, index) => <div className="skeleton-row" key={index} />)}
    </div>
  )
}


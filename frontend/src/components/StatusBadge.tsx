import type { ServiceRequestStatus } from '../api/types'

export function StatusBadge({ status }: { status: ServiceRequestStatus }) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      <span className="status-badge__dot" />
      {status === 'PENDING' ? 'Pending' : 'Assigned'}
    </span>
  )
}


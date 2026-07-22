import type { ProblemType, ServiceRequestStatus, UserRole } from './types'

export const problemMetadata = {
  BATTERY: { label: 'Battery', description: 'Won\u2019t start or electrical issue' },
  TIRE: { label: 'Tire', description: 'Flat, puncture, or wheel problem' },
  MECHANICAL: { label: 'Mechanical', description: 'Engine or mechanical fault' },
  TOWING: { label: 'Towing', description: 'Vehicle transport required' },
  OTHER: { label: 'Other', description: 'Something else needs attention' },
} satisfies Record<ProblemType, { label: string; description: string }>

export const serviceRequestStatusLabels = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
} satisfies Record<ServiceRequestStatus, string>

export const userRoleLabels = {
  OWNER: 'Vehicle owner',
  OPERATOR: 'Operator',
  ADMIN: 'Administrator',
} satisfies Record<UserRole, string>

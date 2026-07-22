import type { UserRole } from '../api/types'

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case 'OWNER':
      return '/requests'
    case 'OPERATOR':
      return '/operator'
    case 'ADMIN':
      return '/admin'
  }
}

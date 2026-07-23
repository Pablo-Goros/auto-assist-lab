import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { userRoleLabels } from '../api/metadata'
import type { User, UserRoleUpdate } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { ListSkeleton, Notice } from '../components/Feedback'
import { MenuSelect } from '../components/MenuSelect'

const manageableRoles: UserRoleUpdate['role'][] = ['OWNER', 'OPERATOR']

const countryOptions = [
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
] as const

const roleOptions = manageableRoles.map((role) => ({
  value: role,
  label: userRoleLabels[role],
}))

export function AdminPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setUsers(await api.getAdminUsers(token))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load registered users.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const manageableUsers = useMemo(
    () => users.filter((user) => user.role !== 'ADMIN'),
    [users],
  )

  async function changeRole(user: User, role: UserRoleUpdate['role']) {
    if (!token || user.role === role) return

    const previousRole = user.role
    setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, role } : item)))
    setError(null)
    setSuccess(null)

    try {
      const updated = await api.updateUserRole(token, user.id, { role })
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(`${updated.name}'s role was updated.`)
    } catch (caught) {
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, role: previousRole } : item)))
      setError(caught instanceof Error ? caught.message : 'Could not update the user role.')
    }
  }

  async function changeTenant(user: User, tenantCode: string) {
    if (!token || !tenantCode || user.tenant?.code === tenantCode) return
    setError(null)
    setSuccess(null)
    try {
      const updated = await api.correctUserTenant(token, user.id, { tenant_code: tenantCode })
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(`${updated.name}'s country was updated.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the user country.')
    }
  }

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>User management</h1>
          <p>Manage registered owner and operator accounts.</p>
        </div>
      </div>

      {success && <Notice tone="success">{success}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <section className="data-card data-card--overflow-visible" aria-label="Registered users">
        <div className="data-card__header">
          <div><h2>Registered users</h2><p>Country corrections are available only before the account creates a service request.</p></div>
          {!loading && <span className="result-count">{manageableUsers.length} {manageableUsers.length === 1 ? 'user' : 'users'}</span>}
        </div>
        {loading ? <ListSkeleton /> : error && manageableUsers.length === 0 ? (
          <div className="empty-state"><span className="empty-state__graphic">!</span><h3>We couldn’t load users</h3><p>Try again in a moment.</p><button className="button button--secondary" onClick={() => void loadUsers()}>Try again</button></div>
        ) : (
          <div className="user-table" role="table">
            <div className="user-table__head" role="row"><span>Name</span><span>Email</span><span>Firebase UID</span><span>Country</span><span>Role</span></div>
            {manageableUsers.map((user) => (
              <div className="user-table__row" role="row" key={user.id}>
                <strong>{user.name}</strong><span>{user.email}</span><code>{user.firebase_uid}</code>
                <MenuSelect
                  value={user.tenant?.code ?? ''}
                  options={[...countryOptions]}
                  ariaLabel={`Country for ${user.name}`}
                  onChange={(tenantCode) => void changeTenant(user, tenantCode)}
                />
                <MenuSelect
                  value={user.role}
                  options={roleOptions}
                  ariaLabel={`Role for ${user.name}`}
                  onChange={(role) => void changeRole(user, role as UserRoleUpdate['role'])}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { userRoleLabels } from '../api/metadata'
import type { User, UserRoleUpdate } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { ListSkeleton, Notice } from '../components/Feedback'

const manageableRoles: UserRoleUpdate['role'][] = ['OWNER', 'OPERATOR']

export function AdminPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
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

  async function changeRole(user: User, role: UserRoleUpdate['role']) {
    if (!token || user.role === role) return
    setSavingId(user.id)
    setError(null)
    setSuccess(null)
    try {
      const updated = await api.updateUserRole(token, user.id, { role })
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(`${updated.name}'s role was updated.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the user role.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>User management</h1>
          <p>Manage registered owner and operator accounts. The configured administrator is locked.</p>
        </div>
      </div>

      {success && <Notice tone="success">{success}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <section className="data-card" aria-label="Registered users">
        <div className="data-card__header">
          <div><h2>Registered users</h2><p>Role changes apply when the user next makes an API request.</p></div>
          {!loading && <span className="result-count">{users.length} {users.length === 1 ? 'user' : 'users'}</span>}
        </div>
        {loading ? <ListSkeleton /> : error && users.length === 0 ? (
          <div className="empty-state"><span className="empty-state__graphic">!</span><h3>We couldn’t load users</h3><p>Try again in a moment.</p><button className="button button--secondary" onClick={() => void loadUsers()}>Try again</button></div>
        ) : (
          <div className="user-table" role="table">
            <div className="user-table__head" role="row"><span>Name</span><span>Email</span><span>Firebase UID</span><span>Role</span></div>
            {users.map((user) => {
              const locked = user.role === 'ADMIN'
              return (
                <div className="user-table__row" role="row" key={user.id}>
                  <strong>{user.name}</strong><span>{user.email}</span><code>{user.firebase_uid}</code>
                  {locked ? <span className="role-lock">Administrator</span> : (
                    <label className="role-control"> <span className="sr-only">Role for {user.name}</span>
                      <select value={user.role} disabled={savingId === user.id} onChange={(event) => void changeRole(user, event.target.value as UserRoleUpdate['role'])}>
                        {manageableRoles.map((role) => <option key={role} value={role}>{userRoleLabels[role]}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </AppShell>
  )
}

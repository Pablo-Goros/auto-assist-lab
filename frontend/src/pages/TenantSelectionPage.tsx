import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Tenant } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { dashboardPathForRole } from '../auth/roleRouting'
import { Brand } from '../components/Brand'
import { Notice } from '../components/Feedback'

export function TenantSelectionPage() {
  const { status, token, user, replaceUser } = useAuth()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !user || user.tenant) return
    void api.getTenants(token).then(setTenants).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Could not load available countries.')
    })
  }, [token, user])

  if (status === 'initializing') return null
  if (!user || !token) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN' || user.tenant) return <Navigate to={dashboardPathForRole(user.role)} replace />

  async function selectTenant(tenant: Tenant) {
    if (!token) return
    setSaving(tenant.code)
    setError(null)
    try {
      const updated = await api.selectTenant(token, { tenant_code: tenant.code })
      replaceUser(updated)
      navigate(dashboardPathForRole(updated.role), { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your country selection.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <main className="tenant-selection-page">
      <section className="tenant-selection-card">
        <Brand />
        <span className="eyebrow">First-time setup</span>
        <h1>Choose your country</h1>
        <p>Your requests and available workshops stay within the selected country. This choice is locked after onboarding.</p>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="tenant-selection-options" aria-label="Available countries">
          {tenants.map((tenant) => (
            <button key={tenant.code} type="button" className="tenant-option" disabled={saving !== null} onClick={() => void selectTenant(tenant)}>
              <strong>{tenant.name}</strong><span>{tenant.code}</span>
              {saving === tenant.code && <span>Saving…</span>}
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { problemMetadata } from '../api/metadata'
import type { ServiceRequest } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { ListSkeleton, Notice } from '../components/Feedback'
import { CalendarIcon, CarIcon, ToolIcon } from '../components/Icons'
import { StatusBadge } from '../components/StatusBadge'

export function OwnerRequestsPage() {
  const { token, user } = useAuth()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const success = (location.state as { created?: boolean } | null)?.created

  const loadRequests = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setRequests(await api.getMyRequests(token))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load your service requests.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const assignedCount = requests.filter((request) => request.status === 'ASSIGNED').length
  const firstName = user?.name.split(/\s+/)[0] ?? 'there'

  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Owner dashboard</span>
          <h1>Hi, {firstName}</h1>
          <p>Here’s a summary of your roadside service requests.</p>
        </div>
      </div>

      <section className="metric-grid" aria-label="Request summary">
        <article className="metric-card"><span className="metric-card__icon"><CarIcon /></span><div><strong>{requests.length}</strong><span>Total requests</span></div></article>
        <article className="metric-card"><span className="metric-card__icon metric-card__icon--amber"><CalendarIcon /></span><div><strong>{requests.length - assignedCount}</strong><span>Awaiting assignment</span></div></article>
        <article className="metric-card"><span className="metric-card__icon metric-card__icon--green"><ToolIcon /></span><div><strong>{assignedCount}</strong><span>Workshop assigned</span></div></article>
      </section>

      {success && <Notice tone="success">Your service request was created successfully.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <section className="data-card">
        <div className="data-card__header owner-request-grid">
          <h2 className="data-card__title">My service requests</h2>
          {!loading && <span className="result-count">{requests.length} {requests.length === 1 ? 'request' : 'requests'}</span>}
        </div>

        {loading ? (
          <ListSkeleton />
        ) : error ? (
          <div className="empty-state"><AlertGraphic /><h3>We couldn’t load your requests</h3><p>Try again in a moment.</p><button className="button button--secondary" onClick={() => void loadRequests()}>Try again</button></div>
        ) : requests.length === 0 ? (
          <div className="empty-state"><CarIcon /><h3>No service requests yet</h3><p>Create your first request and we’ll help you find a workshop.</p><Link className="button button--primary" to="/requests/new">Create request</Link></div>
        ) : (
          <div className="request-list owner-request-list">
            <div className="request-list__head owner-request-grid"><span>Request</span><span>Vehicle</span><span>Issue</span><span>Status</span><span>Workshop</span></div>
            {requests.map((request) => (
              <article className="request-row owner-request-grid" key={request.id}>
                <div className="request-id"><small>Request</small><strong>{String(request.id).padStart(4, '0')}</strong></div>
                <div><small>Vehicle</small><strong>{request.vehicle}</strong></div>
                <div><small>Issue</small><strong>{problemMetadata[request.problem_type].label}</strong><span className="muted-line">{request.description}</span></div>
                <div><small>Status</small><StatusBadge status={request.status} /></div>
                <div><small>Workshop</small>{request.assigned_workshop ? <strong>{request.assigned_workshop.name}</strong> : <span className="muted-line">—</span>}</div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}

function AlertGraphic() {
  return <span className="empty-state__graphic">!</span>
}

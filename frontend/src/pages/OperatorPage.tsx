import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { problemMetadata } from '../api/metadata'
import type { OperatorServiceRequest, ServiceRequestStatus, Workshop } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { ListSkeleton, Notice } from '../components/Feedback'
import { FormSelect } from '../components/FormSelect'
import { CalendarIcon, CheckIcon, ToolIcon } from '../components/Icons'
import { StatusBadge } from '../components/StatusBadge'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export function OperatorPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState<OperatorServiceRequest[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [selected, setSelected] = useState<Record<number, number>>({})
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
  const [successId, setSuccessId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | ServiceRequestStatus>('ALL')

  const loadData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [nextRequests, nextWorkshops] = await Promise.all([api.getOperatorRequests(token), api.getWorkshops(token)])
      setRequests(nextRequests)
      setWorkshops(nextWorkshops)
      setSelected(Object.fromEntries(nextRequests.flatMap((request) => request.assigned_workshop ? [[request.id, request.assigned_workshop.id]] : [])))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the operator dashboard.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => statusFilter === 'ALL' || request.status === statusFilter)
  }, [requests, statusFilter])

  async function assignWorkshop(requestId: number) {
    const workshopId = selected[requestId]
    if (!token || !workshopId || assigningId !== null) return
    setAssigningId(requestId)
    setSuccessId(null)
    setRowErrors((current) => ({ ...current, [requestId]: '' }))
    try {
      const updated = await api.assignWorkshop(token, requestId, workshopId)
      setRequests((current) => current.map((request) => request.id === requestId ? { ...request, ...updated } : request))
      setSuccessId(requestId)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not assign this workshop.'
      setRowErrors((current) => ({ ...current, [requestId]: message }))
    } finally {
      setAssigningId(null)
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'PENDING').length

  return (
    <AppShell>
      <div className="page-heading">
        <div><span className="eyebrow">Operations dashboard</span><h1>Service requests</h1><p>Review incoming requests and coordinate workshop assignments.</p></div>
        <div className="date-chip"><CalendarIcon />{formatDate(new Date().toISOString())}</div>
      </div>

      <section className="metric-grid metric-grid--operator" aria-label="Request summary">
        <article className="metric-card"><span className="metric-card__icon"><ToolIcon /></span><div><strong>{requests.length}</strong><span>Total requests</span></div></article>
        <article className="metric-card"><span className="metric-card__icon metric-card__icon--amber"><CalendarIcon /></span><div><strong>{pendingCount}</strong><span>Pending assignment</span></div></article>
        <article className="metric-card"><span className="metric-card__icon metric-card__icon--green"><CheckIcon /></span><div><strong>{requests.length - pendingCount}</strong><span>Assigned</span></div></article>
      </section>

      {error && <Notice tone="error">{error}</Notice>}

      <section className="data-card operator-card">
        <div className="data-card__header operator-card__toolbar">
          <div><h2>All service requests</h2><p>{filteredRequests.length} results across all owners.</p></div>
          <label className="filter-select"><span>Status</span><FormSelect value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)} options={[{ value: 'ALL', label: 'All statuses' }, { value: 'PENDING', label: 'Pending' }, { value: 'ASSIGNED', label: 'Assigned' }]} /></label>
        </div>

        {loading ? (
          <ListSkeleton rows={5} />
        ) : error ? (
          <div className="empty-state"><h3>Dashboard unavailable</h3><p>Refresh the data to try again.</p><button className="button button--secondary" onClick={() => void loadData()}>Refresh</button></div>
        ) : requests.length === 0 ? (
          <div className="empty-state"><ToolIcon /><h3>No incoming requests</h3><p>New service requests will appear here.</p></div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state empty-state--compact"><h3>No matching requests</h3><p>Choose a different status filter.</p></div>
        ) : (
          <div className="request-list operator-request-list">
            <div className="request-list__head operator-request-grid"><span>Request</span><span>Owner</span><span>Vehicle & issue</span><span>Status</span><span>Workshop assignment</span></div>
            {filteredRequests.map((request) => {
              const isAssigning = assigningId === request.id
              const hasSelection = Boolean(selected[request.id])
              const isCurrentSelection = request.assigned_workshop?.id === selected[request.id]
              return (
                <article className="request-row operator-request-grid" key={request.id}>
                  <div className="request-id"><small>Request</small><strong>REQ-{String(request.id).padStart(4, '0')}</strong><span className="muted-line">{formatDate(request.created_at)}</span></div>
                  <div><small>Owner</small><strong>{request.owner.name}</strong><span className="muted-line">{request.owner.email}</span></div>
                  <div><small>Vehicle & issue</small><strong>{request.vehicle}</strong><span className="muted-line">{problemMetadata[request.problem_type].label} · {request.description}</span></div>
                  <div><small>Status</small><StatusBadge status={request.status} /></div>
                  <div className="assignment-cell">
                    <small>Workshop assignment</small>
                    <div className="assignment-controls">
                      <FormSelect
                        aria-label={`Workshop for request ${request.id}`}
                        value={selected[request.id] ? String(selected[request.id]) : ''}
                        disabled={isAssigning}
                        onValueChange={(value) => setSelected((current) => ({ ...current, [request.id]: Number(value) }))}
                      >
                        <option value="">Select workshop</option>
                        {workshops.map((workshop) => <option value={workshop.id} key={workshop.id}>{workshop.name} · {workshop.specialty}</option>)}
                      </FormSelect>
                      <button className="button button--small" type="button" disabled={!hasSelection || isAssigning || isCurrentSelection} onClick={() => void assignWorkshop(request.id)}>
                        {isAssigning && <span className="spinner" />}
                        {isAssigning ? 'Assigning…' : request.status === 'ASSIGNED' ? 'Reassign' : 'Assign'}
                      </button>
                    </div>
                    {successId === request.id && <span className="row-message row-message--success"><CheckIcon />Assignment saved</span>}
                    {rowErrors[request.id] && <span className="row-message row-message--error">{rowErrors[request.id]}</span>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </AppShell>
  )
}

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { AuthAdapter } from './auth/types'

const owner = {
  id: 1,
  firebase_uid: 'owner-token',
  email: 'pablo@example.com',
  name: 'Pablo Pérez',
  role: 'OWNER',
} as const

const operator = {
  id: 2,
  firebase_uid: 'operator-token',
  email: 'operator@example.com',
  name: 'Operations Team',
  role: 'OPERATOR',
} as const

const admin = {
  id: 3,
  firebase_uid: 'admin-token',
  email: 'admin@example.com',
  name: 'Admin Team',
  role: 'ADMIN',
} as const

const ownerRequest = {
  id: 12,
  vehicle: 'Honda Civic 2018',
  problem_type: 'BATTERY',
  description: 'The car will not start',
  status: 'PENDING',
  assigned_workshop: null,
  created_at: '2026-07-22T12:00:00Z',
  assigned_at: null,
} as const

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function adapter(restoredToken: string | null = null): AuthAdapter {
  let tokenObserver: ((token: string | null) => void) | undefined

  return {
    subscribe: vi.fn((onTokenChanged) => {
      tokenObserver = onTokenChanged
      queueMicrotask(() => onTokenChanged(restoredToken))
      return () => undefined
    }),
    signIn: vi.fn(async () => {
      tokenObserver?.('owner-token')
      return 'owner-token'
    }),
    signOut: vi.fn(async () => undefined),
  }
}

function setRoute(path: string) {
  window.history.replaceState({}, '', path)
}

beforeEach(() => {
  setRoute('/login')
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Phase 4 frontend', () => {
  it('renders the login and signs in without asking for a role', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/me')) return jsonResponse(owner)
      if (url.endsWith('/api/service-requests/me')) return jsonResponse([])
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App authAdapter={adapter()} />)

    expect(await screen.findByRole('heading', { name: 'Get back on the road' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByRole('heading', { name: 'Hi, Pablo', level: 1 })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/me'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer owner-token' }) }),
    )
    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/api/me'))).toHaveLength(1)
  })

  it('redirects an owner away from the operator route', async () => {
    setRoute('/operator')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/me')) return jsonResponse(owner)
      if (url.endsWith('/api/service-requests/me')) return jsonResponse([])
      return jsonResponse({}, 404)
    }))

    render(<App authAdapter={adapter('owner-token')} />)

    expect(await screen.findByRole('heading', { name: 'Hi, Pablo' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/requests')
  })

  it('routes an authenticated administrator to the admin landing page', async () => {
    setRoute('/admin')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/me')) return jsonResponse(admin)
      return jsonResponse({}, 404)
    }))

    render(<App authAdapter={adapter('admin-token')} />)

    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
  })

  it('renders an owner request list with its status', async () => {
    setRoute('/requests')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/me')) return jsonResponse(owner)
      if (url.endsWith('/api/service-requests/me')) return jsonResponse([ownerRequest])
      return jsonResponse({}, 404)
    }))

    render(<App authAdapter={adapter('owner-token')} />)

    expect(await screen.findByText('Honda Civic 2018')).toBeInTheDocument()
    expect(screen.getByText('REQ-0012')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open profile' }))
    expect(await screen.findByText('pablo@example.com')).toBeInTheDocument()
    expect(screen.getByText('Account ID')).toBeInTheDocument()
  })

  it('validates and submits a new service request once', async () => {
    setRoute('/requests/new')
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/me')) return jsonResponse(owner)
      if (url.endsWith('/api/service-requests') && init?.method === 'POST') return jsonResponse(ownerRequest, 201)
      if (url.endsWith('/api/service-requests/me')) return jsonResponse([ownerRequest])
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App authAdapter={adapter('owner-token')} />)

    expect(await screen.findByRole('heading', { name: 'New service request' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }))
    expect(screen.getByText('Enter the vehicle make, model, and year.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Vehicle \*/), { target: { value: 'Honda Civic 2018' } })
    fireEvent.click(screen.getByRole('radio', { name: /Tire/ }))
    fireEvent.change(screen.getByLabelText(/Description \*/), { target: { value: 'Flat tire on the front left wheel' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }))
    fireEvent.click(screen.getByRole('button', { name: /Submitting request/ }))

    expect(await screen.findByText('Your service request was created successfully.')).toBeInTheDocument()
    const postCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(postCalls).toHaveLength(1)
    expect(JSON.parse(String(postCalls[0]?.[1]?.body))).toEqual({
      vehicle: 'Honda Civic 2018',
      problem_type: 'TIRE',
      description: 'Flat tire on the front left wheel',
    })
  })

  it('loads requests and assigns a workshop from the operator dashboard', async () => {
    setRoute('/operator')
    const operatorRequest = { ...ownerRequest, owner: { id: 1, name: owner.name, email: owner.email } }
    const workshop = { id: 7, name: 'Baterías Palermo', specialty: 'Battery', active: true }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/me')) return jsonResponse(operator)
      if (url.endsWith('/api/operator/service-requests')) return jsonResponse([operatorRequest])
      if (url.endsWith('/api/workshops')) return jsonResponse([workshop])
      if (url.endsWith('/api/operator/service-requests/12/assign') && init?.method === 'POST') {
        return jsonResponse({ ...ownerRequest, status: 'ASSIGNED', assigned_workshop: workshop, assigned_at: '2026-07-22T13:00:00Z' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<App authAdapter={adapter('operator-token')} />)

    const workshopSelect = await screen.findByLabelText('Workshop for request 12')
    fireEvent.change(workshopSelect, { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }))

    expect(await screen.findByText('Assignment saved')).toBeInTheDocument()
    expect(screen.getByText('Assigned', { selector: '.status-badge' })).toBeInTheDocument()
    const assignmentCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/assign'))
    expect(JSON.parse(String(assignmentCall?.[1]?.body))).toEqual({ workshop_id: 7 })
  })

  it('shows loading and readable API error states', async () => {
    setRoute('/requests')
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/api/me')) return jsonResponse(owner)
      if (url.endsWith('/api/service-requests/me')) return jsonResponse({ detail: 'Database unavailable' }, 500)
      return jsonResponse({}, 404)
    }))
    render(<App authAdapter={adapter('owner-token')} />)

    expect(screen.getByText('Restoring your session')).toBeInTheDocument()
    expect(await screen.findByText('Database unavailable')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'We couldn’t load your requests' })).toBeInTheDocument()
  })
})

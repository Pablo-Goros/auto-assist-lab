import type {
  CreateServiceRequestInput,
  OperatorServiceRequest,
  ServiceRequest,
  User,
  Workshop,
} from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

interface ApiValidationIssue {
  msg?: string
}

interface ApiErrorBody {
  detail?: string | ApiValidationIssue[]
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function readableError(body: ApiErrorBody | null, status: number): string {
  if (typeof body?.detail === 'string') return body.detail
  if (Array.isArray(body?.detail)) {
    const messages = body.detail.flatMap((issue) => (issue.msg ? [issue.msg] : []))
    if (messages.length > 0) return messages.join('. ')
  }

  if (status === 401) return 'Your session is no longer valid. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status >= 500) return 'AutoAssist is temporarily unavailable. Please try again.'
  return 'We could not complete your request. Please try again.'
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError('Could not connect to AutoAssist. Check your connection and try again.', 0)
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      // Some infrastructure errors do not include a JSON response.
    }
    throw new ApiError(readableError(body, response.status), response.status)
  }

  return (await response.json()) as T
}

export const api = {
  getMe: (token: string): Promise<User> => request<User>('/me', token),

  getMyRequests: (token: string): Promise<ServiceRequest[]> =>
    request<ServiceRequest[]>('/service-requests/me', token),

  createRequest: (token: string, input: CreateServiceRequestInput): Promise<ServiceRequest> =>
    request<ServiceRequest>('/service-requests', token, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getOperatorRequests: (token: string): Promise<OperatorServiceRequest[]> =>
    request<OperatorServiceRequest[]>('/operator/service-requests', token),

  getWorkshops: (token: string): Promise<Workshop[]> => request<Workshop[]>('/workshops', token),

  assignWorkshop: (token: string, requestId: number, workshopId: number): Promise<ServiceRequest> =>
    request<ServiceRequest>(`/operator/service-requests/${requestId}/assign`, token, {
      method: 'POST',
      body: JSON.stringify({ workshop_id: workshopId }),
    }),
}


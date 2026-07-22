export type UserRole = 'OWNER' | 'OPERATOR'

export type ProblemType = 'BATTERY' | 'TIRE' | 'MECHANICAL' | 'TOWING' | 'OTHER'

export type ServiceRequestStatus = 'PENDING' | 'ASSIGNED'

export interface User {
  id: number
  firebase_uid: string
  email: string
  name: string
  role: UserRole
}

export interface OwnerSummary {
  id: number
  name: string
  email: string
}

export interface Workshop {
  id: number
  name: string
  specialty: string
  active?: boolean
}

export interface ServiceRequest {
  id: number
  vehicle: string
  problem_type: ProblemType
  description: string
  status: ServiceRequestStatus
  assigned_workshop: Workshop | null
  created_at: string
  assigned_at: string | null
}

export interface OperatorServiceRequest extends ServiceRequest {
  owner: OwnerSummary
}

export interface CreateServiceRequestInput {
  vehicle: string
  problem_type: ProblemType
  description: string
}


import type { components } from './generated'

type Schemas = components['schemas']

export type UserRole = Schemas['UserRole']
export type ProblemType = Schemas['ProblemType']
export type ServiceRequestStatus = Schemas['ServiceRequestStatus']
export type User = Schemas['UserResponse']
export type UserRoleUpdate = Schemas['UserRoleUpdate']
export type OwnerSummary = Schemas['OwnerSummary']
export type Workshop = Schemas['WorkshopResponse']
export type ServiceRequest = Schemas['ServiceRequestResponse']
export type OperatorServiceRequest = Schemas['OperatorServiceRequestResponse']
export type CreateServiceRequestInput = Schemas['ServiceRequestCreate']

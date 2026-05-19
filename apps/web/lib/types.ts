export type UserRole = 'admin' | 'engineer'

export interface Session {
  id: string
  username: string
  name: string
  role: UserRole
  company_id: string
}

export interface GuardSession {
  id: string
  name: string
  code: string
  anonymous_code: string
  company_id: string
}

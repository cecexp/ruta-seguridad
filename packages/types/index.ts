// ============================================================
// SECURITY ROUTE — Shared Types
// ============================================================

export type UserRole = 'admin' | 'engineer'
export type RoundStatus = 'in_progress' | 'completed' | 'interrupted'
export type CheckMethod = 'qr' | 'manual'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type AnomalyStatus = 'open' | 'in_review' | 'resolved'

export interface Company {
  id: string
  name: string
  created_at: string
}

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  company_id: string
}

export interface Guard {
  id: string
  name: string
  code: string
  anonymous_code: string
  company_id: string
  active: boolean
}

export interface Route {
  id: string
  company_id: string
  name: string
  description?: string
  active: boolean
  checkpoints?: Checkpoint[]
}

export interface Checkpoint {
  id: string
  route_id: string
  name: string
  description?: string
  zone?: string
  order_num: number
  qr_code?: string
  pos_x: number
  pos_y: number
}

export interface Round {
  id: string
  route_id: string
  guard_id: string
  anonymous_code: string
  status: RoundStatus
  started_at: string
  ended_at?: string
  duration_secs?: number
  route?: Route
  checks?: Check[]
}

export interface Check {
  id: string
  round_id: string
  checkpoint_id: string
  guard_id: string
  anonymous_code: string
  method: CheckMethod
  latitude?: number
  longitude?: number
  checked_at: string
  secs_since_prev?: number
  checkpoint?: Checkpoint
}

export interface Anomaly {
  id: string
  round_id?: string
  checkpoint_id?: string
  guard_id: string
  anonymous_code: string
  company_id: string
  title: string
  description?: string
  severity: Severity
  status: AnomalyStatus
  latitude?: number
  longitude?: number
  reported_at: string
  photos?: AnomalyPhoto[]
}

export interface AnomalyPhoto {
  id: string
  anomaly_id: string
  url: string
}

// ============================================================
// UI State Types
// ============================================================

export interface CheckpointWithStatus extends Checkpoint {
  checked: boolean
  check?: Check
}

export interface ActiveRound {
  round: Round
  checkpoints: CheckpointWithStatus[]
  totalChecked: number
  percentage: number
}

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

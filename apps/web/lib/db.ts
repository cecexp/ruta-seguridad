import { createClient } from './supabase'
import type { Session } from './types'

// ============================================================
// AUTH
// ============================================================

export async function login(username: string, password: string): Promise<Session> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('login', {
    p_username: username,
    p_password: password,
  })
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Invalid username or password')
  const session: Session = data[0]
  localStorage.setItem('sr_session', JSON.stringify(session))
  return session
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('sr_session')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function logout() {
  localStorage.removeItem('sr_session')
}

// ============================================================
// GUARDS
// ============================================================

export async function getGuards(company_id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('guards')
    .select('id, name, code, anonymous_code, active')
    .eq('company_id', company_id)
    .eq('active', true)
    .order('code')
  if (error) throw error
  return data
}

// ============================================================
// ROUTES
// ============================================================

export async function getRoutes(company_id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('routes')
    .select('*, checkpoints(*)')
    .eq('company_id', company_id)
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================
// ROUNDS
// ============================================================

export async function getRoundsToday(company_id: string) {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('rounds_engineer_view')
    .select('*')
    .eq('company_id', company_id)
    .gte('started_at', today.toISOString())
    .order('started_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================
// ANOMALIES
// ============================================================

export async function getAnomalies(company_id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('anomalies_engineer_view')
    .select('*')
    .order('reported_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================
// KPIs
// ============================================================

export async function getKPIs(company_id: string) {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [rounds, anomalies] = await Promise.all([
    supabase
      .from('rounds')
      .select('status, duration_secs')
      .gte('created_at', today.toISOString()),
    supabase
      .from('anomalies')
      .select('severity, status')
      .eq('company_id', company_id)
      .gte('reported_at', today.toISOString()),
  ])

  const r = rounds.data || []
  const a = anomalies.data || []

  return {
    total_rounds:     r.length,
    completed_rounds: r.filter(x => x.status === 'completed').length,
    in_progress:      r.filter(x => x.status === 'in_progress').length,
    avg_duration:     r.filter(x => x.duration_secs).reduce((acc, x) => acc + (x.duration_secs || 0), 0) / (r.filter(x => x.duration_secs).length || 1),
    open_anomalies:   a.filter(x => x.status === 'open').length,
    critical:         a.filter(x => x.severity === 'critical').length,
  }
}

// ============================================================
// REAL-TIME
// ============================================================

export function subscribeRounds(company_id: string, callback: () => void) {
  const supabase = createClient()
  return supabase
    .channel(`rounds:${company_id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds' }, callback)
    .subscribe()
}

export function subscribeAnomalies(company_id: string, callback: () => void) {
  const supabase = createClient()
  return supabase
    .channel(`anomalies:${company_id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'anomalies' }, callback)
    .subscribe()
}

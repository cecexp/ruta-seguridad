'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, List, QrCode, LogOut, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type Vista = 'map' | 'list' | 'qr' | 'anomaly'

export default function RoundPage() {
  const router = useRouter()
  const [guard, setGuard] = useState<any>(null)
  const [round, setRound] = useState<any>(null)
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('map')
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const raw = localStorage.getItem('sr_guard')
      if (!raw) { router.push('/login'); return }
      const g = JSON.parse(raw)
      setGuard(g)

      const supabase = createClient()

      // 1. buscar rondín activo
      let { data: activeRound } = await supabase
        .from('rounds')
        .select('*')
        .eq('guard_id', g.id)
        .eq('status', 'in_progress')
        .maybeSingle()

      // 2. si no hay, buscar ruta y crear uno
      if (!activeRound) {
        const { data: routes } = await supabase
          .from('routes')
          .select('*')
          .eq('company_id', g.company_id)
          .eq('active', true)
          .limit(1)

        if (!routes || routes.length === 0) {
          setError('No active routes found. Contact your supervisor.')
          setLoading(false)
          return
        }

        const { data: newRound } = await supabase
          .from('rounds')
          .insert({
            route_id: routes[0].id,
            guard_id: g.id,
            anonymous_code: g.anonymous_code,
            status: 'in_progress'
          })
          .select()
          .single()

        activeRound = newRound
      }

      setRound(activeRound)

      // 3. checkpoints de la ruta
      const { data: cps } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('route_id', activeRound.route_id)
        .order('order_num', { ascending: true })

      // 4. checks ya realizados
      const { data: checks } = await supabase
        .from('checks')
        .select('*')
        .eq('round_id', activeRound.id)

      const merged = (cps || []).map((cp: any) => {
        const check = (checks || []).find((c: any) => c.checkpoint_id === cp.id)
        return { ...cp, checked: !!check, check }
      })

      setCheckpoints(merged)
      setLoading(false)
    }
    init()
  }, [router])

  async function markCheckpoint(checkpoint_id: string, method: 'qr' | 'manual' = 'manual') {
    if (!guard || !round) return
    const supabase = createClient()

    // get GPS
    let latitude: number | null = null
    let longitude: number | null = null
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      )
      latitude = pos.coords.latitude
      longitude = pos.coords.longitude
    } catch {}

    await supabase.from('checks').upsert({
      round_id: round.id,
      checkpoint_id,
      guard_id: guard.id,
      anonymous_code: guard.anonymous_code,
      method,
      latitude,
      longitude,
      checked_at: new Date().toISOString(),
    })

    setCheckpoints(prev => {
      const updated = prev.map(cp =>
        cp.id === checkpoint_id ? { ...cp, checked: true } : cp
      )
      return updated
    })
  }

  function logout() {
    localStorage.removeItem('sr_guard')
    router.push('/login')
  }

  const totalChecked = checkpoints.filter(c => c.checked).length
  const percentage = checkpoints.length > 0
    ? Math.round((totalChecked / checkpoints.length) * 100) : 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#0d1a3e] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading round...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
      <p className="text-gray-800 font-medium text-center">{error}</p>
      <button onClick={logout} className="text-sm text-[#0d1a3e] underline">Sign out</button>
    </div>
  )

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto">
      {/* Topbar */}
      <div className="bg-[#0d1a3e] px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-white font-semibold text-sm">Security Route</h1>
          <p className="text-white/50 text-xs mt-0.5">{guard?.code} · Round in progress</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/10 rounded-lg px-3 py-1.5 text-right">
            <div className="text-white text-sm font-semibold">{totalChecked}/{checkpoints.length}</div>
            <div className="text-white/50 text-xs">{percentage}%</div>
          </div>
          <button onClick={logout} className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 flex-shrink-0">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {vista === 'map' && (
          <MapView checkpoints={checkpoints} onMark={markCheckpoint} />
        )}
        {vista === 'list' && (
          <ListView checkpoints={checkpoints} onMark={markCheckpoint} />
        )}
        {vista === 'anomaly' && (
          <AnomalyView guard={guard} round={round} onClose={() => setVista('list')} />
        )}
      </div>

      {/* Bottom nav */}
      <nav className="border-t border-gray-100 bg-white flex-shrink-0">
        <div className="flex">
          {([
            { id: 'map',     label: 'Map',     icon: MapPin },
            { id: 'list',    label: 'List',    icon: List },
            { id: 'anomaly', label: 'Incident', icon: AlertTriangle },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setVista(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                vista === id ? 'text-[#0d1a3e]' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

// ── MAP VIEW ─────────────────────────────────────────────────
function MapView({ checkpoints, onMark }: { checkpoints: any[], onMark: (id: string) => void }) {
  const [selected, setSelected] = useState<any>(null)

  return (
    <div className="relative w-full h-full bg-[#eef2f7]">
      <svg viewBox="0 0 420 360" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="420" height="360" fill="#dce6f0" />
        <rect x="15" y="15" width="115" height="90" rx="4" fill="#c8d8ea" stroke="#a0b8cc" strokeWidth="0.8"/>
        <text x="72" y="64" textAnchor="middle" fontSize="10" fill="#5a7a9a">Reception</text>
        <rect x="148" y="15" width="124" height="90" rx="4" fill="#c8d8ea" stroke="#a0b8cc" strokeWidth="0.8"/>
        <text x="210" y="64" textAnchor="middle" fontSize="10" fill="#5a7a9a">Main Hall</text>
        <rect x="290" y="15" width="115" height="90" rx="4" fill="#c8d8ea" stroke="#a0b8cc" strokeWidth="0.8"/>
        <text x="347" y="64" textAnchor="middle" fontSize="10" fill="#5a7a9a">Offices</text>
        <rect x="15" y="132" width="95" height="110" rx="4" fill="#c8d8ea" stroke="#a0b8cc" strokeWidth="0.8"/>
        <text x="62" y="192" textAnchor="middle" fontSize="10" fill="#5a7a9a">Warehouse</text>
        <rect x="125" y="132" width="160" height="110" rx="4" fill="#c8d8ea" stroke="#a0b8cc" strokeWidth="0.8"/>
        <text x="205" y="192" textAnchor="middle" fontSize="10" fill="#5a7a9a">Parking</text>
        <rect x="300" y="132" width="105" height="110" rx="4" fill="#c8d8ea" stroke="#a0b8cc" strokeWidth="0.8"/>
        <text x="352" y="192" textAnchor="middle" fontSize="10" fill="#5a7a9a">Tech Room</text>
        <rect x="15" y="252" width="390" height="90" rx="4" fill="#c8d8ea" stroke="#a0b8cc" strokeWidth="0.8"/>
        <text x="210" y="300" textAnchor="middle" fontSize="10" fill="#5a7a9a">South Perimeter</text>

        {checkpoints.map((cp, i) => {
          const defaults = [
            { x: 72, y: 56 }, { x: 210, y: 56 }, { x: 347, y: 56 },
            { x: 62, y: 186 }, { x: 205, y: 186 }, { x: 352, y: 186 },
            { x: 210, y: 296 },
          ]
          const pos = defaults[i] || { x: 50, y: 50 }
          const isNext = !cp.checked && checkpoints.findIndex(c => !c.checked) === i
          const color = cp.checked ? '#16a34a' : isNext ? '#0d1a3e' : '#e07b00'
          const r = isNext ? 13 : 11

          return (
            <g key={cp.id} onClick={() => setSelected(cp)} style={{ cursor: 'pointer' }}>
              <circle cx={pos.x} cy={pos.y} r={r + 4} fill={color} opacity={0.15} />
              <circle cx={pos.x} cy={pos.y} r={r} fill={color} stroke="#fff" strokeWidth="2" />
              {cp.checked
  ? <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="10" fill="#fff">&#10003;</text>
  : <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="600">{i + 1}</text>
}
            </g>
          )
        })}
      </svg>

      {/* Modal */}
      {selected && (
        <div className="absolute inset-0 bg-black/40 flex items-end" onClick={() => setSelected(null)}>
          <div className="bg-white w-full rounded-t-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">{selected.name}</h3>
            {selected.zone && <p className="text-xs text-gray-400 mt-0.5">{selected.zone}</p>}
            <div className="mt-4">
              {selected.checked ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl px-4 py-3">
                  <span className="text-sm font-medium">✓ Already checked</span>
                </div>
              ) : (
                <button
                  onClick={() => { onMark(selected.id); setSelected(null) }}
                  className="w-full h-11 bg-[#0d1a3e] text-white rounded-xl text-sm font-medium"
                >
                  Mark as checked
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── LIST VIEW ────────────────────────────────────────────────
function ListView({ checkpoints, onMark }: { checkpoints: any[], onMark: (id: string) => void }) {
  return (
    <div className="h-full overflow-y-auto">
      {checkpoints.map((cp, i) => {
        const isNext = !cp.checked && checkpoints.findIndex(c => !c.checked) === i
        return (
          <div
            key={cp.id}
            onClick={() => !cp.checked && onMark(cp.id)}
            className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white ${!cp.checked ? 'cursor-pointer active:bg-gray-50' : ''}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              cp.checked ? 'bg-green-100 text-green-600' : isNext ? 'bg-[#0d1a3e] text-white' : 'bg-orange-100 text-orange-600'
            }`}>
              {cp.checked ? '✓' : i + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{cp.name}</p>
              <p className="text-xs text-gray-400">{cp.zone || 'No zone'} · {cp.checked ? `Checked at ${new Date(cp.check?.checked_at).toLocaleTimeString()}` : isNext ? 'Next' : 'Pending'}</p>
            </div>
            {!cp.checked && <span className="text-gray-300">›</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── ANOMALY VIEW ─────────────────────────────────────────────
function AnomalyView({ guard, round, onClose }: { guard: any, round: any, onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('low')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [title2, setTitle2] = useState('')
  const [desc2, setDesc2] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    let latitude = null, longitude = null
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      )
      latitude = pos.coords.latitude
      longitude = pos.coords.longitude
    } catch {}

    await supabase.from('anomalies').insert({
      round_id: round?.id,
      guard_id: guard.id,
      anonymous_code: guard.anonymous_code,
      company_id: guard.company_id,
      title,
      description,
      severity,
      latitude,
      longitude,
    })

    setDone(true)
    setLoading(false)
    setTimeout(() => { setDone(false); setTitle(''); setDescription(''); setSeverity('low') }, 2000)
  }

  return (
    <div className="h-full overflow-y-auto bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Report Incident</h2>

      {done && (
        <div className="mb-4 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl">
          ✓ Incident reported successfully
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            placeholder="e.g. Broken lock on door 3"
            className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0d1a3e]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe what you observed..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0d1a3e] resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
          <div className="grid grid-cols-4 gap-2">
            {(['low', 'medium', 'high', 'critical'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`py-2 rounded-xl text-xs font-medium capitalize border transition-colors ${
                  severity === s
                    ? s === 'low' ? 'bg-blue-500 text-white border-blue-500'
                    : s === 'medium' ? 'bg-yellow-500 text-white border-yellow-500'
                    : s === 'high' ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !title}
          className="h-11 bg-[#0d1a3e] text-white rounded-xl text-sm font-medium disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit Incident'}
        </button>
      </form>
    </div>
  )
}

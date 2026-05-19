'use client'

import { useState } from 'react'
import { Shield } from 'lucide-react'
import { login, getSession } from '@/lib/db'
import { createClient } from '@/lib/supabase'

type Tab = 'guard' | 'staff'

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('guard')
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGuardLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('guards')
        .select('id, name, code, anonymous_code, company_id')
        .eq('code', code.toUpperCase())
        .maybeSingle()
  
      console.log('data:', data, 'error:', error)
  
      if (!data) throw new Error('Guard code not found')
      localStorage.setItem('sr_guard', JSON.stringify(data))
      window.location.href = '/round'
    } catch (err: any) {
      setError('Guard code not found')
      setLoading(false)
    }
  }

  async function handleStaffLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const session = await login(username.toUpperCase(), password)
      if (session.role === 'engineer') window.location.href = '/engineer'
      else window.location.href = '/admin'
    } catch {
      setError('Invalid username or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#0d1a3e] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Security Route</h1>
          <p className="text-sm text-gray-500 mt-1">Guard Management System</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(['guard', 'staff'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-[#0d1a3e] border-b-2 border-[#0d1a3e]'
                    : 'text-gray-400'
                }`}
              >
                {t === 'guard' ? 'Guard' : 'Admin / Engineer'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Guard tab */}
            {tab === 'guard' && (
              <form onSubmit={handleGuardLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Guard Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    placeholder="G-0001"
                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-[#0d1a3e] focus:ring-1 focus:ring-[#0d1a3e]"
                  />
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 bg-[#0d1a3e] text-white rounded-xl text-sm font-medium disabled:opacity-60 hover:bg-[#1a2e6b] transition-colors"
                >
                  {loading ? 'Loading...' : 'Start Round'}
                </button>
                <p className="text-xs text-gray-400 text-center">No password required</p>
              </form>
            )}

            {/* Staff tab */}
            {tab === 'staff' && (
              <form onSubmit={handleStaffLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    placeholder="A-0001 or E-0001"
                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-[#0d1a3e] focus:ring-1 focus:ring-[#0d1a3e]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0d1a3e] focus:ring-1 focus:ring-[#0d1a3e]"
                  />
                </div>
                {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 bg-[#0d1a3e] text-white rounded-xl text-sm font-medium disabled:opacity-60 hover:bg-[#1a2e6b] transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Security Route · v2.0
        </p>
      </div>
    </div>
  )
}

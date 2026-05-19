'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, logout } from '@/lib/db'

export default function EngineerPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.push('/login'); return }
    if (s.role !== 'engineer') { router.push('/admin'); return }
    setSession(s)
  }, [router])

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Engineer Dashboard</h1>
            <p className="text-sm text-gray-500">{session.name} · {session.username}</p>
          </div>
          <button
            onClick={() => { logout(); router.push('/login') }}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          Engineer dashboard coming soon
        </div>
      </div>
    </div>
  )
}

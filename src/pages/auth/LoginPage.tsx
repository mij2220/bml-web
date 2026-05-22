import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { Eye, EyeOff, BookOpen } from 'lucide-react'

const DEMO_USERS = [
  { label: 'HR Admin',  email: 'admin@bookmyleave.com',        password: 'Admin@1234',    role: 'HR Admin',  color: 'bg-emerald-500' },
  { label: 'Manager',   email: 'sarah.khan@bookmyleave.com',   password: 'Manager@1234',  role: 'Manager',   color: 'bg-purple-500' },
  { label: 'Employee',  email: 'ali.raza@bookmyleave.com',     password: 'Employee@1234', role: 'Employee',  color: 'bg-blue-500' },
  { label: 'Employee',  email: 'fatima.malik@bookmyleave.com', password: 'Employee@1234', role: 'Employee',  color: 'bg-pink-500' },
  { label: 'Employee',  email: 'usman.ahmed@bookmyleave.com',  password: 'Employee@1234', role: 'Employee',  color: 'bg-amber-500' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await login(email, password)
      setAuth(data.user, data.access, data.refresh)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoUser = (u: typeof DEMO_USERS[0]) => {
    setEmail(u.email)
    setPassword(u.password)
    setError('')
  }

  const initials = (label: string, email: string) => email.split('@')[0].slice(0,2).toUpperCase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-6">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3">
            <BookOpen size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Book<span className="text-emerald-400">My</span>Leave
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Leave Management System</p>
        </div>

        {/* Demo user switcher */}
        <div className="w-full max-w-sm mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
            🧪 Demo — click to load credentials
          </p>
          <div className="grid grid-cols-5 gap-2">
            {DEMO_USERS.map((u, i) => (
              <button
                key={i}
                onClick={() => handleDemoUser(u)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                  email === u.email
                    ? 'border-emerald-400 bg-white/10'
                    : 'border-white/10 hover:border-white/30 bg-white/5'
                }`}
                title={`${u.role}: ${u.email}`}
              >
                <div className={`w-8 h-8 ${u.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                  {initials(u.label, u.email)}
                </div>
                <span className="text-white text-xs font-medium leading-tight text-center">
                  {u.email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + u.email.split('@')[0].split('.')[0].slice(1)}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  u.label === 'HR Admin' ? 'bg-emerald-500/30 text-emerald-300' :
                  u.label === 'Manager'  ? 'bg-purple-500/30 text-purple-300' :
                                           'bg-blue-500/30 text-blue-300'
                }`}>
                  {u.label === 'HR Admin' ? 'Admin' : u.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-0.5">Sign in</h2>
          <p className="text-slate-500 text-sm mb-5">
            {email ? <span className="text-emerald-600 font-medium">✓ Credentials loaded — click Sign in</span> : 'Select a demo user above or enter manually'}
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="you@company.com"
                required
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm shadow-lg shadow-emerald-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 pb-4">
        BookMyLeave © 2026 — Demo mode
      </p>
    </div>
  )
}

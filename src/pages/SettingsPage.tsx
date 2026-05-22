import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import client from '../api/client'
import { User, Lock, Bell, CheckCircle, Eye, EyeOff, Users, AlertCircle } from 'lucide-react'

type Tab = 'profile' | 'password' | 'notifications' | 'delegation'

const NOTIF_PREFS = [
  { key: 'leave_applied',  label: 'Leave application submitted',  sub: 'Email + In-app', on: true  },
  { key: 'leave_approved', label: 'Leave approved / rejected',    sub: 'Email + In-app', on: true  },
  { key: 'reminder',       label: 'Pending approval reminder',    sub: 'In-app only',    on: true  },
  { key: 'replacement',    label: 'Replacement assigned to me',   sub: 'Email + In-app', on: true  },
  { key: 'timesheet',      label: 'Timesheet approval',           sub: 'In-app only',    on: false },
  { key: 'balance_expiry', label: 'Leave balance expiry warning', sub: 'Email + In-app', on: true  },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')

  // ── Profile ──
  const [photoUrl, setPhotoUrl]       = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [fullName, setFullName]       = useState(user?.full_name ?? '')
  const [phone, setPhone]             = useState('')
  const [dob, setDob]                 = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg]   = useState('')
  const [profileErr, setProfileErr]   = useState('')

  // ── Password ──
  const [oldPw, setOldPw]       = useState('')
  const [newPw, setNewPw]       = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld, setShowOld]   = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg]       = useState('')
  const [pwErr, setPwErr]       = useState('')

  // ── Notifications ──
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_PREFS.map(n => [n.key, n.on]))
  )
  const [notifMsg, setNotifMsg] = useState('')

  // ── Delegation ──
  const [colleagues, setColleagues]     = useState<{ id: string; full_name: string; role: string }[]>([])
  const [delegate, setDelegate]         = useState('')
  const [delegateFrom, setDelegateFrom] = useState('')
  const [delegateTo, setDelegateTo]     = useState('')
  const [delegateType, setDelegateType] = useState('leave')
  const [delegateMsg, setDelegateMsg]   = useState('')

  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Settings'
  }, [])

  // Load current employee profile into Profile tab
  useEffect(() => {
    client.get('/employees/me/').then(res => {
      const d = res.data?.data ?? res.data
      if (d?.phone)         setPhone(d.phone)
      if (d?.date_of_birth) setDob(d.date_of_birth)
      if (d?.full_name)     setFullName(d.full_name)
      if (d?.profile_picture_url) setPhotoUrl(d.profile_picture_url)
    }).catch(() => {})
  }, [])

  // Load colleagues for delegation dropdown
  useEffect(() => {
    client.get('/employees/').then(res => {
      const list = res.data?.data ?? res.data ?? []
      setColleagues(
        list.filter((e: any) => e.employee_id !== (user as any)?.employee_id)
      )
    }).catch(() => {})
  }, [])

  const flash = (set: (v: string) => void, msg: string) => {
    set(msg)
    setTimeout(() => set(''), 3000)
  }

  const handleUploadPhoto = async (file: File) => {
    setUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('profile_picture', file)
      const res = await client.patch('/employees/me/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const d = res.data?.data ?? res.data
      if (d?.profile_picture_url) setPhotoUrl(d.profile_picture_url)
      flash(setProfileMsg, 'Photo updated!')
    } catch {
      flash(setProfileErr, 'Photo upload failed.')
    }
    setUploadingPhoto(false)
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileErr('')
    try {
      await client.patch('/employees/me/', {
        full_name: fullName,
        phone: phone || undefined,
        date_of_birth: dob || undefined,
      })
      flash(setProfileMsg, 'Profile saved!')
    } catch (e: any) {
      setProfileErr(e.response?.data?.message ?? e.response?.data?.detail ?? 'Save failed.')
    }
    setSavingProfile(false)
  }

  const handleChangePassword = async () => {
    setPwErr(''); setPwMsg('')
    if (newPw !== confirmPw) return setPwErr('Passwords do not match.')
    if (newPw.length < 8)    return setPwErr('At least 8 characters required.')
    setSavingPw(true)
    try {
      await client.post('/auth/change-password/', {
        old_password: oldPw,
        new_password: newPw,
        confirm_password: confirmPw,
      })
      setOldPw(''); setNewPw(''); setConfirmPw('')
      flash(setPwMsg, 'Password changed successfully!')
    } catch (e: any) {
      setPwErr(e.response?.data?.message ?? e.response?.data?.detail ?? 'Failed to change password.')
    }
    setSavingPw(false)
  }

  const inp = (cls = '') =>
    `w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${cls}`
  const lbl = 'block text-sm font-medium text-slate-700 mb-1.5'

  const TABS: { key: Tab; label: string; Icon: any }[] = [
    { key: 'profile',       label: 'Profile',         Icon: User  },
    { key: 'password',      label: 'Change Password', Icon: Lock  },
    { key: 'notifications', label: 'Notifications',   Icon: Bell  },
    { key: 'delegation',    label: 'Delegation',      Icon: Users },
  ]

  const delegateName = colleagues.find(c => c.id === delegate)?.full_name ?? ''

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* ── Tab Bar ── */}
      <div className="flex bg-white border border-slate-200 rounded-2xl p-1 gap-1">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
              ${tab === key
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <Icon size={15} /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── PROFILE ── */}
      {tab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="relative w-16 h-16 flex-shrink-0">
              {photoUrl
                ? <img src={photoUrl} alt="avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200" />
                : <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-2xl">
                    {fullName?.[0]?.toUpperCase() ?? 'U'}
                  </div>
              }
            </div>
            <div>
              <p className="font-bold text-slate-900">{fullName}</p>
              <p className="text-sm text-slate-500 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
              <label className="mt-2 inline-block text-xs text-emerald-600 font-semibold border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer">
                {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadPhoto(f) }} />
              </label>
            </div>
          </div>

          {profileErr && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {profileErr}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className={inp()} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input value={user?.email ?? ''} disabled className={inp('bg-slate-50 text-slate-400 cursor-not-allowed')} />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+92 300 0000000" className={inp()} />
            </div>
            <div>
              <label className={lbl}>Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className={inp()} />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSaveProfile} disabled={savingProfile}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
            {profileMsg && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle size={15} />{profileMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── PASSWORD ── */}
      {tab === 'password' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900">Change Password</h3>
            <p className="text-sm text-slate-400 mt-0.5">Minimum 8 characters.</p>
          </div>

          {pwErr && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {pwErr}
            </div>
          )}
          {pwMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle size={14} />{pwMsg}
            </div>
          )}

          <div>
            <label className={lbl}>Current Password</label>
            <div className="relative">
              <input type={showOld ? 'text' : 'password'} value={oldPw}
                onChange={e => setOldPw(e.target.value)}
                className={inp('pr-10')} placeholder="••••••••" />
              <button type="button" onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className={lbl}>New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className={inp('pr-10')} placeholder="Minimum 8 characters" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className={lbl}>Confirm New Password</label>
            <input type="password" value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              className={inp()} placeholder="••••••••" />
          </div>

          <button onClick={handleChangePassword}
            disabled={savingPw || !oldPw || !newPw || !confirmPw}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
            {savingPw ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Notification Preferences</h3>
            <p className="text-sm text-slate-400 mt-0.5">Choose which notifications you receive.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {NOTIF_PREFS.map(n => (
              <div key={n.key} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{n.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{n.sub}</p>
                </div>
                <button
                  onClick={() => setPrefs(p => ({ ...p, [n.key]: !p[n.key] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${prefs[n.key] ? 'bg-emerald-500' : 'bg-slate-200'}`}
                  role="switch" aria-checked={prefs[n.key]}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${prefs[n.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}
          </div>
          <div className="p-5 border-t border-slate-100 flex items-center gap-3">
            <button onClick={() => flash(setNotifMsg, 'Preferences saved!')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
              Save Preferences
            </button>
            {notifMsg && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle size={15} />{notifMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── DELEGATION ── */}
      {tab === 'delegation' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-900">Approval Delegation</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              When you're on leave, approval requests will be automatically forwarded to your delegate.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-800">
            <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            {delegate
              ? <span>Delegation active — approvals will go to <span className="font-semibold">{delegateName}</span>.</span>
              : <span>No delegate configured. Approval requests will auto-escalate to HR after 72 hours if you don't respond.</span>
            }
          </div>

          <div>
            <label className={lbl}>Delegate Approver</label>
            <select value={delegate} onChange={e => setDelegate(e.target.value)} className={inp()}>
              <option value="">Select a colleague to delegate to...</option>
              {colleagues.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.role?.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Delegation Start</label>
              <input type="date" value={delegateFrom}
                onChange={e => setDelegateFrom(e.target.value)} className={inp()} />
            </div>
            <div>
              <label className={lbl}>Delegation End</label>
              <input type="date" value={delegateTo}
                onChange={e => setDelegateTo(e.target.value)} className={inp()} />
            </div>
          </div>

          <div>
            <label className={lbl}>Delegation Type</label>
            <div className="space-y-2 mt-1">
              {[
                { value: 'always', label: 'Always (permanent until removed)' },
                { value: 'leave',  label: 'Only when I am on approved leave' },
                { value: 'dates',  label: 'For specific date range only' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer text-sm text-slate-700">
                  <input type="radio" name="delegateType" value={opt.value}
                    checked={delegateType === opt.value}
                    onChange={() => setDelegateType(opt.value)}
                    className="accent-emerald-500 flex-shrink-0" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button onClick={() => flash(setDelegateMsg, 'Delegation saved!')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
              Save Delegation
            </button>
            {delegate && (
              <button
                onClick={() => { setDelegate(''); setDelegateFrom(''); setDelegateTo('') }}
                className="text-red-500 text-sm font-medium hover:underline">
                Remove Delegate
              </button>
            )}
            {delegateMsg && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle size={15} />{delegateMsg}
              </span>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

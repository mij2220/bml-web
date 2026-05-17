import { useEffect } from 'react'
export default function ReportsPage() {
  useEffect(() => { document.getElementById('page-title')!.textContent = 'Reports' }, [])
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
      <p className="text-4xl mb-4">🚧</p>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Reports</h2>
      <p className="text-slate-500 text-sm">This page is coming in the next sprint.</p>
    </div>
  )
}

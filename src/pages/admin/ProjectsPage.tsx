import { useEffect } from 'react'

export default function ProjectsPage() {
  useEffect(() => {
    document.getElementById('page-title')!.textContent = 'Projects'
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
        <p className="text-5xl mb-4">📁</p>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Projects</h2>
        <p className="text-slate-400 text-sm">Manage projects for replacement assignments.</p>
        <div className="mt-6 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-2 rounded-full">
          🚧 Coming in next sprint
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import client from '../../api/client'
import { getDepartments, getDesignations, getEmployees } from '../../api/employees'
import { X } from 'lucide-react'

interface Props { onClose: () => void; onCreated: () => void }

export default function AddEmployeeModal({ onClose, onCreated }: Props) {
  const [depts, setDepts] = useState<any[]>([])
  const [allDesigs, setAllDesigs] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email:'', role:'employee', employee_id:'', full_name:'', gender:'male',
    joining_date: new Date().toISOString().split('T')[0], employment_type:'permanent',
    department_id:'', designation_id:'', reporting_manager_id:'', phone:'', salary_grade:'',
  })

  useEffect(() => {
    Promise.all([getDepartments(), getDesignations(), getEmployees()]).then(([d,des,m]) => {
      setDepts(d.data.data??[])
      setAllDesigs(des.data.data??[])
      setManagers((m.data.data??[]).filter((e:any) => ['manager','hr_admin','super_admin'].includes(e.role)))
    }).catch(()=>{})
  }, [])

  const set = (k:string, v:string) => setForm(f=>({...f,[k]:v}))
  const filteredDesigs = form.department_id ? allDesigs.filter(d=>d.department===form.department_id) : allDesigs

  const handleSubmit = async () => {
    setError('')
    const missing = ['email','full_name','employee_id','department_id','designation_id'].filter(k=>!(form as any)[k])
    if (missing.length) return setError('Please fill all required fields (*)')
    setSaving(true)
    try {
      await client.post('/employees/', { ...form, reporting_manager_id: form.reporting_manager_id||undefined })
      onCreated(); onClose()
    } catch (e:any) {
      const d = e.response?.data
      setError(d?.message ?? d?.detail ?? JSON.stringify(d?.errors ?? 'Failed to create employee.'))
    }
    setSaving(false)
  }

  const inp = (label:string, key:string, extra:any={}) => (
    <div key={key}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input value={(form as any)[key]} onChange={e=>set(key,e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" {...extra}/>
    </div>
  )

  const sel = (label:string, key:string, opts:{v:string;l:string}[]) => (
    <div key={key}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select value={(form as any)[key]} onChange={e=>set(key,e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <option value="">Select...</option>
        {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex-shrink-0 p-5 border-b border-slate-100">
          <div className="flex justify-center mb-3 md:hidden"><div className="w-10 h-1 bg-slate-200 rounded-full"/></div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Add New Employee</h3>
              <p className="text-xs text-slate-400 mt-0.5">Default password: Employee@1234</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><X size={18}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            {inp('Full Name *','full_name',{placeholder:'Sarah Khan'})}
            {inp('Employee ID *','employee_id',{placeholder:'EMP-006'})}
            {inp('Email *','email',{type:'email',placeholder:'sarah@company.com'})}
            {inp('Phone','phone',{placeholder:'+92 300 0000000'})}
            {inp('Joining Date *','joining_date',{type:'date'})}
            {inp('Salary Grade','salary_grade',{placeholder:'Grade 5'})}
            {sel('Gender *','gender',[{v:'male',l:'Male'},{v:'female',l:'Female'},{v:'other',l:'Other'}])}
            {sel('Employment Type *','employment_type',[{v:'permanent',l:'Permanent'},{v:'contractual',l:'Contractual'},{v:'probation',l:'Probation'},{v:'part_time',l:'Part Time'}])}
            {sel('Role *','role',[{v:'employee',l:'Employee'},{v:'manager',l:'Manager'},{v:'hr_admin',l:'HR Admin'}])}
            {sel('Department *','department_id',depts.map(d=>({v:d.id,l:d.name})))}
            {sel('Designation *','designation_id',filteredDesigs.map(d=>({v:d.id,l:d.name})))}
            {sel('Reporting Manager','reporting_manager_id',managers.map(m=>({v:m.id,l:m.full_name})))}
          </div>
        </div>
        <div className="flex-shrink-0 p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving?'Creating...':'Create Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}

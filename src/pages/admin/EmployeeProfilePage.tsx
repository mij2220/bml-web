import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/client";

interface Employee {
  id: string;
  employee_id: string;
  p_number?: string;
  full_name: string;
  email: string;
  role?: string;
  cnic?: string;
  gender?: string;
  date_of_birth?: string | null;
  phone?: string;
  joining_date?: string;
  employment_type?: string;
  salary_grade?: string;
  account_code?: string;
  experience_start_date?: string;
  experience_display?: string;
  experience_years?: number;
  experience_tier?: string;
  status?: string;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  reporting_manager?: { id: string; full_name: string; employee_id: string } | null;
  shift_incharge?: { id: string; full_name: string; employee_id: string } | null;
}

interface LeaveBalance {
  id: string;
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  leave_type_color?: string;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  total_days?: number;
  allocated?: number;
  used?: number;
  available?: number;
}

interface LeaveRecord {
  id: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
}

interface DropdownOption { id: string; name: string; }

interface EditForm {
  full_name: string;
  email: string;
  phone: string;
  cnic: string;
  gender: string;
  date_of_birth: string;
  employment_type: string;
  salary_grade: string;
  account_code: string;
  joining_date: string;
  department_id: string;
  designation_id: string;
  branch_id: string;
  reporting_manager_id: string;
  role: string;
  is_shared_account: string;
}

function unwrap(res: { data: unknown }): unknown {
  const d = res.data as Record<string, unknown>;
  if (d && "success" in d && "data" in d) return d.data;
  return d;
}

function unwrapList(res: { data: unknown }): unknown[] {
  const d = res.data as Record<string, unknown>;
  if (d && "success" in d && "data" in d) {
    const inner = d.data;
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === "object" && "results" in (inner as Record<string, unknown>))
      return (inner as Record<string, unknown>).results as unknown[];
    return [];
  }
  if (Array.isArray(d)) return d;
  if (d && "results" in d) return d.results as unknown[];
  return [];
}

const EMPTY_EDIT: EditForm = {
  full_name: "", email: "", phone: "", cnic: "", gender: "",
  date_of_birth: "", employment_type: "", salary_grade: "",
  account_code: "", joining_date: "", department_id: "",
  designation_id: "", branch_id: "", reporting_manager_id: "", role: "",
  is_shared_account: "false",
};

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isHR, isApprover, user } = useAuth();
  // Supervisors / SICs adjust their team's balances themselves, with a reason (Engro, 15 Oct 2026).
  // Not their own; the server checks the team as well.
  const [adjustError, setAdjustError] = useState("");
  // Worked on a gazetted holiday -> 1 compensatory day (Engro, 15 Oct 2026)
  const [ghRows, setGhRows] = useState<any[]>([]);
  const [ghComp, setGhComp] = useState<any[]>([]);
  const [ghModal, setGhModal] = useState(false);
  const [ghPick, setGhPick] = useState("");
  const [ghNote, setGhNote] = useState("");
  const [ghSaving, setGhSaving] = useState(false);
  const [ghError, setGhError] = useState("");
  const [ghDone, setGhDone] = useState("");

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const isSelf = !!user && !!employee && String(employee.employee_id) === String(user.employee_id);
  const canAdjust = isHR || (isApprover && !isSelf);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "balances" | "history" | "attendance">("profile");

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);
  // Units whose whole staff this SIC sees in the Leave module
  const [sicUnits, setSicUnits] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [departments, setUnits] = useState<DropdownOption[]>([]);
  const [designations, setDesignations] = useState<(DropdownOption & { department?: string })[]>([]);
  const [branches, setBranches] = useState<DropdownOption[]>([]);
  const [managers, setManagers] = useState<(DropdownOption & { employee_id: string; full_name: string })[]>([]);
  const [allManagers, setAllManagers] = useState<(DropdownOption & { employee_id: string; full_name: string })[]>([]);

  // Balance adjust modal
  const [adjustModal, setAdjustModal] = useState<LeaveBalance | null>(null);
  const [adjustDays, setAdjustDays] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  useEffect(() => { fetchEmployee(); }, [id]);
  useEffect(() => {
    if (activeTab === "balances") { fetchBalances(); fetchHolidayComp(); }
    if (activeTab === "history") fetchLeaveHistory();
  }, [activeTab]);

  const fetchHolidayComp = async () => {
    try {
      const y = new Date().getFullYear();
      const [c, a, b] = await Promise.all([
        api.get(`/employees/${id}/holiday-compensation/`),
        api.get(`/gazetted-holidays/?year=${y}`),
        api.get(`/gazetted-holidays/?year=${y - 1}`),
      ]);
      setGhComp(c.data?.data ?? []);
      const today = new Date().toISOString().slice(0, 10);
      setGhRows([...(b.data?.data ?? []), ...(a.data?.data ?? [])].filter((h: any) => h.date <= today).reverse());
    } catch { /* section stays empty */ }
  };

  const handleHolidayComp = async () => {
    if (!ghPick) { setGhError("Choose the gazetted holiday."); return; }
    setGhSaving(true); setGhError("");
    try {
      const r = await api.post(`/employees/${id}/holiday-compensation/`, { holiday_id: ghPick, note: ghNote });
      setGhDone(r.data?.message || "Compensatory day added.");
      setGhModal(false); setGhPick(""); setGhNote("");
      await Promise.all([fetchBalances(), fetchHolidayComp()]);
    } catch (err: any) {
      setGhError(err?.response?.data?.message || "Could not add the compensatory day.");
    } finally { setGhSaving(false); }
  };

  const fetchEmployee = async () => {
    try {
      const res = await api.get(`/employees/${id}/`);
      const emp = unwrap(res) as Employee;
      setEmployee(emp);
    } catch { navigate("/employees"); }
    finally { setLoading(false); }
  };

  const fetchBalances = async () => {
    try {
      const res = await api.get(`/employees/${id}/balances/`);
      const raw = unwrapList(res) as Record<string, unknown>[];
      const mapped: LeaveBalance[] = raw.map(b => ({
        id: b.id as string,
        leave_type_id: b.leave_type_id as string,
        leave_type_name: b.leave_type_name as string,
        leave_type_code: b.leave_type_code as string,
        leave_type_color: b.leave_type_color as string | undefined,
        allocated_days: parseFloat((b.allocated as string) || "0"),
        used_days: parseFloat((b.used as string) || "0"),
        remaining_days: parseFloat((b.available as string) || "0"),
        total_days: parseFloat((b.allocated as string) || "0"),
      }));
      setBalances(mapped);
    } catch { setBalances([]); }
  };

  const fetchLeaveHistory = async () => {
    try {
      const res = await api.get(`/leaves/?employee=${id}`);
      setLeaveHistory(unwrapList(res) as LeaveRecord[]);
    } catch { setLeaveHistory([]); }
  };

  const fetchDropdowns = async () => {
    try {
      const [deptRes, desigRes, branchRes, empRes] = await Promise.all([
        api.get("/departments/"),
        api.get("/designations/"),
        api.get("/branches/"),
        api.get("/employees/?page_size=200"),
      ]);
      setUnits(unwrapList(deptRes) as DropdownOption[]);
      setDesignations(unwrapList(desigRes) as (DropdownOption & { department?: string })[]);
      setBranches(unwrapList(branchRes) as DropdownOption[]);
      const allEmps = unwrapList(empRes) as (DropdownOption & { employee_id: string })[];
      const mgrs = allEmps.filter(e => e.id !== id && ['manager','hr_admin','super_admin'].includes((e as any).role));
      setManagers(mgrs);
      setAllManagers(mgrs);
    } catch { /* silently fail */ }
  };

  const openEditModal = async () => {
    if (!employee) return;
    setEditError("");
    await fetchDropdowns();
    setEditForm({
      full_name: employee.full_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      cnic: employee.cnic || "",
      gender: employee.gender || "",
      date_of_birth: employee.date_of_birth || "",
      employment_type: employee.employment_type || "",
      salary_grade: employee.salary_grade || "",
      account_code: employee.account_code || "",
      joining_date: employee.joining_date || "",
      department_id: employee.department?.id || "",
      designation_id: employee.designation?.id || "",
      branch_id: employee.branch?.id || "",
      reporting_manager_id: employee.reporting_manager?.id || "",
      shift_incharge_id: (employee as any).shift_incharge?.id || "",
      experience_start_date: employee.experience_start_date || "",
      role: employee.role || "",
      is_shared_account: (employee as any).is_shared_account ? "true" : "false",
    });
    setSicUnits(((employee as any).sic_units ?? []).map((u: { id: string }) => u.id));
    setEditModal(true);
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    setEditError("");
    try {
      // Only send non-empty values to avoid validation errors on optional fields
      const payload: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(editForm)) {
        if (v !== "") payload[k] = v;
      }
      if (editForm.role === "manager") payload.sic_unit_ids = sicUnits;
      await api.patch(`/employees/${id}/`, payload);
      await fetchEmployee();
      setEditModal(false);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data && typeof data === "object") {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(", ");
        setEditError(msgs);
      } else {
        setEditError("Failed to save changes. Please try again.");
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!employee) return;
    const isActive = employee.status === "active";
    if (!confirm(`${isActive ? "Deactivate" : "Reactivate"} ${employee.full_name}?`)) return;
    try {
      await api.patch(`/employees/${id}/`, { status: isActive ? "inactive" : "active" });
      await fetchEmployee();
    } catch { alert("Failed to update status."); }
  };

  const handleAdjust = async () => {
    if (!adjustModal || !adjustDays) return;
    if (!isHR && !adjustNote.trim()) { setAdjustError("Please give the reason for this adjustment."); return; }
    setAdjustSaving(true); setAdjustError("");
    try {
      await api.post(`/employees/${id}/balances/`, {
        leave_type_id: adjustModal.leave_type_id || adjustModal.id,
        adjustment: parseFloat(adjustDays),
        note: adjustNote,
      });
      await fetchBalances();
      setAdjustModal(null); setAdjustDays(""); setAdjustNote(""); setAdjustError("");
    } catch (err: any) {
      setAdjustError(err?.response?.data?.message || "Failed to adjust balance.");
    }
    finally { setAdjustSaving(false); }
  };

  const set = (field: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditForm(f => ({ ...f, [field]: e.target.value }));

  const fmt = (v?: string | null) => v || "—";
  const cap = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
  const fmtRole = (r?: string) => r?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—";
  const statusBadge = (s?: string) => s === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600";
  const leaveBadge = (s: string) => ({
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-600",
    cancelled: "bg-gray-100 text-gray-500",
  }[s] || "bg-gray-100 text-gray-500");

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const labelCls = "block text-xs text-gray-500 mb-1";

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
  if (!employee) return null;

  const isActive = employee.status === "active";
  const initials = employee.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "??";

  const tabs = [
    { key: "profile",    label: "Profile" },
    { key: "balances",   label: "Leave Balances" },
    { key: "history",    label: "Leave History" },
    { key: "attendance", label: "Attendance" },
  ] as const;

  const selectedDeptName = departments.find(u => u.id === editForm.department_id)?.name || '';
  const filteredManagers = editForm.department_id
    ? allManagers.filter(m => (m as any).department_name === selectedDeptName || ['hr_admin','super_admin'].includes((m as any).role))
    : allManagers;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate("/employees")}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Employees
      </button>

      <div className="flex gap-5 flex-col lg:flex-row">

        {/* Left card */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-2xl font-semibold text-white mx-auto mb-3">
              {initials}
            </div>
            <h2 className="text-base font-semibold text-gray-900">{employee.full_name}</h2>
            <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${statusBadge(employee.status)}`}>
              {isActive ? "Active" : "Inactive"}
            </span>
            <p className="text-xs text-gray-400 mt-1 font-mono">{employee.p_number || employee.employee_id}</p>
            <div className="mt-4 space-y-2">
              {isHR && (
              <button onClick={openEditModal}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
              )}
              {isHR && (
                <button onClick={handleDeactivate}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium ${isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {isActive ? "Deactivate" : "Reactivate"}
                </button>
              )}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-50 text-left space-y-2.5">
              {[
                { label: "Unit", value: employee.department?.name },
                { label: "Supervisor (L1)", value: employee.reporting_manager?.full_name || "None" },
                { label: "Incharge (L2)",  value: (employee as any).shift_incharge?.full_name || "None" },
                { label: "Type",       value: employee.employment_type },
                { label: "Joined",     value: employee.joining_date },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-gray-700 font-medium text-right capitalize">{value || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeTab === tab.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "profile" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: "Full Name",     value: fmt(employee.full_name) },
                    { label: "Employee ID",   value: fmt(employee.employee_id) },
                    { label: "Email",         value: fmt(employee.email) },
                    { label: "Gender",        value: cap(employee.gender) },
                    { label: "Date of Birth", value: fmt(employee.date_of_birth) },
                    { label: "Phone",         value: fmt(employee.phone) },
                    { label: "CNIC",          value: fmt(employee.cnic) },
                    { label: "Designation",          value: fmtRole(employee.role) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm text-gray-800 font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-50"></div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Employment Details</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: "Unit",      value: fmt(employee.department?.name) },
                    { label: "Designation",     value: fmt(employee.designation?.name) },
                    { label: "Employment Type", value: employee.employment_type?.replace(/_/g, " ") || "—" },
                    { label: "Salary Grade",    value: fmt(employee.salary_grade) },
                    { label: "Branch",          value: fmt(employee.branch?.name) },
                    { label: "L1 Supervisor",     value: fmt(employee.reporting_manager?.full_name) },
                    { label: "L2 Shift Incharge", value: fmt((employee as any).shift_incharge?.full_name) },
                    { label: "Joining Date",    value: fmt(employee.joining_date) },
                    { label: "Exp. Start Date", value: fmt(employee.experience_start_date) },
                    { label: "Status",          value: cap(employee.status) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                      <p className="text-sm text-gray-800 font-medium">{value}</p>
                    </div>
                  ))}
                  <div className="col-span-2 pt-2 border-t border-gray-50">
                    <p className="text-xs text-gray-400 mb-1">Payroll / Account Code</p>
                    <p className="text-sm text-gray-800 font-medium">
                      {employee.account_code
                        ? <span className="font-mono bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">{employee.account_code}</span>
                        : <span className="text-gray-400 font-normal font-sans">Not set</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "balances" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-800">Leave Balances</h3>
                {canAdjust && (
                  <button onClick={() => { setGhModal(true); setGhError(""); setGhDone(""); }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    Worked on a gazetted holiday
                  </button>
                )}
              </div>
              {ghDone && <p className="text-sm text-emerald-700 mb-3">{ghDone}</p>}
              {balances.length === 0
                ? <p className="text-gray-400 text-sm text-center py-10">No leave balances found.</p>
                : <div className="space-y-3">{balances.map(b => {
                    const total = b.total_days ?? b.allocated_days ?? 0;
                    const pct = total > 0 ? Math.min(100, Math.round((b.used_days / total) * 100)) : 0;
                    return (
                      <div key={b.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: (b.leave_type_color || "#6b7280") + "22", color: b.leave_type_color || "#6b7280" }}>
                          {b.leave_type_code}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1.5">
                            <p className="text-sm font-medium text-gray-800">{b.leave_type_name}</p>
                            <p className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">
                              {b.remaining_days}<span className="text-gray-400 font-normal text-xs"> / {total}</span>
                            </p>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.leave_type_color || "#3b82f6" }}></div>
                          </div>
                        </div>
                        {canAdjust && <button onClick={() => { setAdjustModal(b); setAdjustError(""); }} className="text-xs text-blue-600 hover:underline flex-shrink-0">Adjust</button>}
                      </div>
                    );
                  })}</div>
              }
              {ghComp.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Compensatory days for gazetted holidays</h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                    {ghComp.map(c => (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="w-28 font-medium">{new Date(c.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span className="flex-1">{c.holiday}{c.note ? <span className="text-gray-400"> · {c.note}</span> : null}</span>
                        <span className="text-xs text-gray-500">+{Number(c.days)} CD{c.granted_by ? ` · by ${c.granted_by}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Leave History</h3>
              {leaveHistory.length === 0
                ? <p className="text-gray-400 text-sm text-center py-10">No leave history found.</p>
                : <div className="space-y-2">{leaveHistory.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{l.leave_type_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${leaveBadge(l.status)}`}>{l.status}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{l.start_date} → {l.end_date} · {l.total_days}d</p>
                      </div>
                    </div>
                  ))}</div>
              }
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Attendance</h3>
              <p className="text-gray-400 text-sm">Attendance records coming soon.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Full Edit Modal ─────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit Employee Profile</h3>
              <button onClick={() => setEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Personal */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Personal Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input type="text" value={editForm.full_name} onChange={set("full_name")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={editForm.email} onChange={set("email")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input type="tel" value={editForm.phone} onChange={set("phone")} placeholder="0300-1234567" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>CNIC</label>
                    <input type="text" value={editForm.cnic} onChange={set("cnic")} placeholder="12345-1234567-1" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select value={editForm.gender} onChange={set("gender")} className={inputCls}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth</label>
                    <input type="date" value={editForm.date_of_birth} onChange={set("date_of_birth")} className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-50"></div>

              {/* Employment */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Employment Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Unit</label>
                    <select value={editForm.department_id} onChange={set("department_id")} className={inputCls}>
                      <option value="">Select department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Designation</label>
                    <select value={editForm.designation_id} onChange={set("designation_id")} className={inputCls}>
                      <option value="">Select designation</option>
                      {designations.filter(d => !editForm.department_id || d.department === editForm.department_id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Employment Type</label>
                    <select value={editForm.employment_type} onChange={set("employment_type")} className={inputCls}>
                      <option value="">Select type</option>
                      <option value="permanent">Permanent</option>
                      <option value="contract">Contract</option>
                      <option value="probation">Probation</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Role</label>
                    <select value={editForm.role} onChange={set("role")} className={inputCls}>
                      <option value="">Select role</option>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager (Supervisor / SIC)</option>
                      <option value="rota_manager">Rota Manager (view only)</option>
                      <option value="hr_admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Login used by</label>
                    <select value={editForm.is_shared_account} onChange={set("is_shared_account")} className={inputCls}>
                      <option value="false">One person</option>
                      <option value="true">Several people (shared login)</option>
                    </select>
                    <p className="text-[11px] text-gray-400 mt-1">Shared login: each approval asks for the person's own name and P.No.</p>
                  </div>
                  <div>
                    <label className={labelCls}>L1 Supervisor</label>
                    <select value={editForm.reporting_manager_id} onChange={set("reporting_manager_id")} className={inputCls}>
                      <option value="">No manager</option>
                      {filteredManagers.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.employee_id})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>L2 Shift Incharge</label>
                    <select value={editForm.shift_incharge_id} onChange={set("shift_incharge_id")} className={inputCls}>
                      <option value="">No incharge</option>
                      {filteredManagers.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.employee_id})</option>)}
                    </select>
                  </div>
                  {editForm.role === "manager" && (
                    <div className="col-span-2">
                      <label className={labelCls}>As SIC, also sees all staff of these units</label>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {departments.map(d => (
                          <label key={d.id} className="flex items-center gap-1.5 text-sm">
                            <input type="checkbox" checked={sicUnits.includes(d.id)}
                              onChange={e => setSicUnits(s => e.target.checked ? [...s, d.id] : s.filter(x => x !== d.id))} />
                            {d.name}
                          </label>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">For SICs covering more than one unit (e.g. Plant-2: AMM-3 and URUT-3). They see these units' staff and leave; approvals still follow each person's own Supervisor and SIC.</p>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Branch</label>
                    <select value={editForm.branch_id} onChange={set("branch_id")} className={inputCls}>
                      <option value="">No branch</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Joining Date</label>
                    <input type="date" value={editForm.joining_date} onChange={set("joining_date")} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Experience Start Date</label>
                    <input type="date" value={editForm.experience_start_date} onChange={set("experience_start_date")} className={inputCls} />
                    <p className="text-xs text-gray-400 mt-1">Career start date — may predate joining this company</p>
                  </div>
                  <div>
                    <label className={labelCls}>Salary Grade</label>
                    <input type="text" value={editForm.salary_grade} onChange={set("salary_grade")} placeholder="e.g. Grade-5" className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Payroll / Account Code</label>
                    <input type="text" value={editForm.account_code} onChange={set("account_code")} placeholder="e.g. EMP-A/C-273" className={inputCls + " font-mono"} />
                  </div>
                </div>
              </div>

              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{editError}</div>
              )}
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {editSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Worked on a gazetted holiday ───────────────── */}
      {ghModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Worked on a gazetted holiday</h3>
            <p className="text-sm text-gray-500 mb-4">Adds 1 compensatory day (CD) to {employee?.full_name}'s balance.</p>
            <label className={labelCls}>Gazetted holiday</label>
            <select value={ghPick} onChange={e => setGhPick(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Choose —</option>
              {ghRows.filter(h => !ghComp.some(c => c.holiday_id === h.id)).map(h => (
                <option key={h.id} value={h.id}>{h.name} · {new Date(h.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</option>
              ))}
            </select>
            {ghRows.length === 0 && <p className="text-xs text-gray-500 mb-3">No gazetted holidays have been set yet. Admin adds them under Gazetted Holidays.</p>}
            <label className={labelCls}>Note (optional)</label>
            <input type="text" value={ghNote} onChange={e => setGhNote(e.target.value)} placeholder="e.g. Worked morning shift"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {ghError && <p className="text-sm text-red-600 mb-3">{ghError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setGhModal(false); setGhPick(""); setGhNote(""); setGhError(""); }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleHolidayComp} disabled={ghSaving || !ghPick}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {ghSaving ? "Saving..." : "Add 1 CD"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Adjust Balance Modal ───────────────────────── */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Adjust balance</h3>
            <p className="text-sm text-gray-500 mb-4">{adjustModal.leave_type_name} · {adjustModal.remaining_days} days remaining</p>
            <label className={labelCls}>Days to add or deduct</label>
            <input type="number" value={adjustDays} onChange={e => setAdjustDays(e.target.value)}
              placeholder="e.g. 3 or -1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <label className={labelCls}>{isHR ? "Note (optional)" : "Reason (required)"}</label>
            <input type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
              placeholder="Reason for adjustment"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {adjustError && <p className="text-sm text-red-600 mb-3">{adjustError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setAdjustModal(null); setAdjustDays(""); setAdjustNote(""); setAdjustError(""); }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdjust} disabled={adjustSaving || !adjustDays}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {adjustSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

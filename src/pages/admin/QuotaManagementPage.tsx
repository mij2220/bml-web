import { useEffect, useState } from "react";
import api from "../../api/client";
import { RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from "lucide-react";

interface EmployeeQuota {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
  experience_start_date: string | null;
  joining_date: string;
  experience_years: number;
  experience_tier: "junior" | "senior";
  experience_display: string;
  al_allocated: number;
  al_used: number;
  al_available: number;
  al_splits_used: number;
  al_splits_allowed: number;
  sl_splits_used: number;
  sl_splits_allowed: number;
}

type Action = "recalculate_experience" | "recalculate_splits" | "replenish_cd" | "all";

interface ActionResult {
  employee_id: string;
  status: "ok" | "error";
  message?: string;
}

export default function QuotaManagementPage() {
  const [employees, setEmployees] = useState<EmployeeQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<ActionResult[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/quota-management/");
      setEmployees(res.data?.data ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    document.getElementById("page-title")!.textContent = "Quota Management";
    load();
  }, []);

  const runAction = async (action: Action, employeeId?: string) => {
    const key = employeeId ? `${action}-${employeeId}` : action;
    setRunning(key);
    setResults(null);
    try {
      const body: Record<string, string> = { action };
      if (employeeId) body.employee_id = employeeId;
      const res = await api.post("/quota-management/", body);
      setResults(res.data?.data?.results ?? []);
      await load();
    } catch (e: any) {
      setResults([{ employee_id: "all", status: "error", message: e.response?.data?.message ?? "Request failed" }]);
    }
    setRunning(null);
  };

  const tierBadge = (tier: string) =>
    tier === "senior"
      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
      : "bg-blue-50 text-blue-800 border border-blue-200";

  const splitBar = (used: number, allowed: number) => {
    if (allowed === 0) return null;
    const pct = Math.min((used / allowed) * 100, 100);
    const color = used >= allowed ? "bg-red-400" : used >= allowed * 0.8 ? "bg-amber-400" : "bg-emerald-400";
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-500 min-w-[36px] text-right">{used}/{allowed}</span>
      </div>
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-sm font-semibold text-slate-700 mb-3">Run for all employees</p>
        <div className="flex flex-wrap gap-2">
          {[
            { action: "recalculate_experience" as Action, label: "Recalculate experience & AL quota", color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" },
            { action: "recalculate_splits" as Action, label: "Recalculate splits from approvals", color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" },
            { action: "replenish_cd" as Action, label: "Replenish CD (+2 days)", color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" },
            { action: "all" as Action, label: "Run all recalculations", color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" },
          ].map(({ action, label, color }) => (
            <button
              key={action}
              onClick={() => runAction(action)}
              disabled={!!running}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors disabled:opacity-50 ${color}`}
            >
              <RefreshCw size={13} className={running === action ? "animate-spin" : ""} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results banner */}
      {results && (
        <div className={`rounded-xl border p-3 flex items-start gap-2 text-sm ${
          results.some(r => r.status === "error")
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          {results.some(r => r.status === "error")
            ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            : <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold">
              {results.filter(r => r.status === "ok").length} succeeded,{" "}
              {results.filter(r => r.status === "error").length} failed
            </p>
            {results.filter(r => r.status === "error").map(r => (
              <p key={r.employee_id} className="text-xs mt-0.5">{r.employee_id}: {r.message}</p>
            ))}
          </div>
        </div>
      )}

      {/* Employee table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{employees.length} employees</p>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {employees.map(emp => {
          const isExpanded = expanded === emp.id;
          return (
            <div key={emp.id} className="border-b border-slate-100 last:border-0">
              <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                  {emp.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{emp.full_name}</p>
                    <span className="text-xs text-slate-400">{emp.employee_id}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${tierBadge(emp.experience_tier)}`}>
                      {emp.experience_tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{emp.department} · {emp.experience_display}</p>
                </div>

                {/* AL splits bar */}
                <div className="w-40">
                  <p className="text-xs text-slate-400 mb-1">AL splits</p>
                  {splitBar(emp.al_splits_used, emp.al_splits_allowed)}
                </div>

                {/* SL splits bar */}
                <div className="w-40">
                  <p className="text-xs text-slate-400 mb-1">SL splits</p>
                  {splitBar(emp.sl_splits_used, emp.sl_splits_allowed)}
                </div>

                {/* AL balance */}
                <div className="text-right">
                  <p className="text-xs text-slate-400">AL balance</p>
                  <p className="text-sm font-semibold text-slate-900">{emp.al_available}/{emp.al_allocated}d</p>
                </div>

                {/* Per-employee actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => runAction("recalculate_experience", emp.id)}
                    disabled={!!running}
                    title="Recalculate experience & quota"
                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={running === `recalculate_experience-${emp.id}` ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : emp.id)}
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200"
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {[
                      ["Experience start", emp.experience_start_date ?? "Not set (uses joining date)"],
                      ["Joining date", emp.joining_date],
                      ["Experience", `${emp.experience_years} yrs`],
                      ["AL allocated", `${emp.al_allocated} days`],
                      ["AL used", `${emp.al_used} days`],
                      ["AL splits", `${emp.al_splits_used}/${emp.al_splits_allowed}`],
                      ["SL splits", `${emp.sl_splits_used}/${emp.sl_splits_allowed}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[
                      { action: "recalculate_experience" as Action, label: "Recalc experience" },
                      { action: "recalculate_splits" as Action, label: "Recalc splits" },
                      { action: "replenish_cd" as Action, label: "Replenish CD" },
                      { action: "all" as Action, label: "Run all" },
                    ].map(({ action, label }) => (
                      <button
                        key={action}
                        onClick={() => runAction(action, emp.id)}
                        disabled={!!running}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <RefreshCw size={11} className={running === `${action}-${emp.id}` ? "animate-spin" : ""} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

interface LeaveType {
  id: string; name: string; code: string;
  is_paid: boolean; allow_half_day: boolean;
  color: string; is_active: boolean;
}
interface LeaveBalance {
  leave_type: string; leave_type_name: string; leave_type_code: string;
  leave_type_color?: string; remaining_days: number; allocated_days: number;
  splits_used?: number; splits_allowed?: number; leave_type_code?: string;
}

function unwrapList(res: { data: unknown }): unknown[] {
  const d = res.data as Record<string, unknown>;
  if (d && "success" in d && "data" in d) {
    const inner = d.data;
    if (Array.isArray(inner)) return inner;
    if (inner && typeof inner === "object" && "results" in (inner as Record<string,unknown>))
      return (inner as Record<string,unknown>).results as unknown[];
    return [];
  }
  if (Array.isArray(d)) return d;
  if (d && "results" in d) return d.results as unknown[];
  return [];
}

export default function ApplyLeavePage() {
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState("AM");
  const [sickSubtype, setSickSubtype] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [dutyDate, setDutyDate] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [workingDays, setWorkingDays] = useState<number | null>(null);

  const selectedType = leaveTypes.find(t => t.id === selectedTypeId) || null;
  const selectedBalance = balances.find(b => b.leave_type === selectedTypeId) || null;

  useEffect(() => {
    api.get("/leave-types/").then(res => {
      const data = unwrapList(res) as LeaveType[];
      setLeaveTypes(data.filter(t => t.is_active !== false));
    }).catch(() => {});

    api.get("/employees/me/balances/").then(res => {
      setBalances(unwrapList(res) as LeaveBalance[]);
    }).catch(() => {});

    api.get("/employees/me/").then(res => {
      const emp = ((res.data as Record<string,unknown>)?.data ?? res.data) as Record<string,unknown>;
      if (emp?.phone) setContact(String(emp.phone));
    }).catch(() => {});
  }, []);

  const calcDays = (s: string, e: string) => {
    if (!s || !e) return;
    const start = new Date(s), end = new Date(e);
    if (end < start) return;
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) { if (cur.getDay() !== 0 && cur.getDay() !== 6) days++; cur.setDate(cur.getDate()+1); }
    setWorkingDays(days);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedTypeId) e.leave_type = "Please select a leave type";
    // Split limit check for AL and SL
    if (selectedBalance && selectedBalance.splits_allowed > 0 &&
        selectedBalance.splits_used >= selectedBalance.splits_allowed) {
      e.leave_type = "You have used all " + selectedBalance.splits_allowed + " " + (selectedType?.code || "") + " splits for this year.";
    }
    // SL max 2 days per split — calculate directly from dates
    if (selectedType?.code === "SL" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 2) {
        e.end_date = "Sick leave split cannot exceed 2 days. Please apply separately for each 2-day period.";
      }
    }
    if (!startDate) e.start_date = "Start date is required";
    if (!endDate) e.end_date = "End date is required";
    if (startDate && endDate && endDate < startDate) e.end_date = "End date must be after start date";
    if (reason.trim().length < 5) e.reason = "Reason must be at least 5 characters";
    if (selectedBalance && workingDays && workingDays > selectedBalance.remaining_days)
      e.balance = `Only ${selectedBalance.remaining_days} days remaining`;
    if (selectedType?.code === "CD" && !dutyDate) e.duty_date = "Required for CD leave";
    if (selectedType?.code === "SL" && !sickSubtype) e.sick_subtype = "Please select sick leave sub-type";
    if (selectedType?.code === "SL" && sickSubtype === "with_mc" && !attachment) e.attachment = "Medical certificate required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        leave_type_id: selectedTypeId,
        start_date: startDate,
        end_date: endDate,
        reason,
        is_half_day: isHalfDay,
      };
      if (isHalfDay) payload.half_day_period = halfDayPeriod === "AM" ? "morning" : "afternoon";
      if (contact) payload.contact_during_leave = contact;
      if (address) payload.address_during_leave = address;
      if (dutyDate) payload.duty_date_for_cd = dutyDate;
      if (sickSubtype) payload.sick_subtype = sickSubtype;

      const res = await api.post("/leaves/", payload);
      const created = ((res.data as Record<string,unknown>)?.data ?? res.data) as Record<string,unknown>;

      if (attachment && created?.id) {
        const fd = new FormData();
        fd.append("attachment", attachment);
        await api.post(`/leaves/${created.id}/attachment/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setSubmitted(true);
    } catch (err: unknown) {
      const data = (err as {response?: {data?: Record<string,unknown>}})?.response?.data;
      const msg = data?.message as string || data?.errors as string || "Failed to submit. Please try again.";
      setErrors({ general: typeof msg === "string" ? msg : JSON.stringify(msg) });
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  if (submitted) return (
    <div className="max-w-lg mx-auto text-center py-16 px-4">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Leave application submitted</h2>
      <p className="text-gray-500 text-sm mb-6">Sent for approval. You will be notified once reviewed.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate("/my-leaves")} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">View my leaves</button>
        <button onClick={() => { setSelectedTypeId(""); setStartDate(""); setEndDate(""); setReason(""); setIsHalfDay(false); setSickSubtype(""); setContact(""); setAddress(""); setDutyDate(""); setAttachment(null); setWorkingDays(null); setErrors({}); setSubmitted(false); }}
          className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50">Apply another</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Apply for leave</h1>
        <p className="text-sm text-gray-500 mt-1">Complete the form below and submit for approval.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">

        {/* Leave type */}
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">Leave type <span className="text-red-500">*</span></label>
          <select
            value={selectedTypeId}
            onChange={e => {
              const id = e.target.value;
              const lt = leaveTypes.find(t => t.id === id);
              setSelectedTypeId(id);
              setErrors(er => ({...er, leave_type: ""}));
              if (lt?.code !== "SL") setSickSubtype("");
            }}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${errors.leave_type ? "border-red-300" : "border-gray-200"}`}
          >
            <option value="">— Select leave type —</option>
            {leaveTypes.map(lt => {
              const bal = balances.find(b => b.leave_type === lt.id);
              const label = bal
                ? `${lt.name} (${bal.remaining_days}/${bal.allocated_days} days remaining)`
                : `${lt.name} (${lt.is_paid ? "Paid" : "Unpaid"})`;
              return <option key={lt.id} value={lt.id}>{label}</option>;
            })}
          </select>
          {selectedTypeId && (() => {
            const lt = leaveTypes.find(t => t.id === selectedTypeId);
            const bal = balances.find(b => b.leave_type === selectedTypeId);
            if (!lt) return null;
            return (
              <div className="mt-2 flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: lt.color || "#6b7280" }}></span>
                <span className="text-xs font-medium text-gray-700">{lt.name}</span>
                {bal && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gray-500">{bal.remaining_days} of {bal.allocated_days} days</span>
                    {(bal.splits_allowed ?? 0) > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        (bal.splits_used ?? 0) >= (bal.splits_allowed ?? 0)
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {bal.splits_used ?? 0}/{bal.splits_allowed} splits
                      </span>
                    )}
                  </div>
                )}
                {!bal && <span className="ml-auto text-xs text-gray-400">{lt.is_paid ? "Paid leave" : "Unpaid leave"}</span>}
              </div>
            );
          })()}
          {errors.leave_type && <p className="text-red-500 text-xs mt-2">{errors.leave_type}</p>}
          {errors.balance && <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{errors.balance}</div>}
        </div>

        {/* Sick sub-type */}
        {selectedType?.code === "SL" && (
          <div className="p-5" style={{background:"#eff6ff", borderLeft:"4px solid #3b82f6"}}>
            <label className="block text-sm font-medium mb-2" style={{color:"#1e3a5f"}}>Sick leave type <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {[{value:"with_mc",label:"With Medical Certificate",desc:"MC required"},{value:"without_mc",label:"Without MC",desc:"No certificate needed"}].map(o => (
                <button key={o.value} type="button" onClick={() => { setSickSubtype(o.value); setErrors(e => ({...e, sick_subtype:""})); }}
                  className={`flex-1 p-3 rounded-xl border text-left bg-white transition-all ${sickSubtype===o.value ? "border-blue-500 ring-1 ring-blue-500" : "border-blue-200 hover:border-blue-400"}`}>
                  <p className={`text-sm font-medium ${sickSubtype===o.value ? "text-blue-900" : "text-gray-700"}`}>{o.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
                </button>
              ))}
            </div>
            {errors.sick_subtype && <p className="text-red-500 text-xs mt-1">{errors.sick_subtype}</p>}
          </div>
        )}

        {/* Dates */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From <span className="text-red-500">*</span></label>
              <input type="date" value={startDate} min={today}
                onChange={e => { setStartDate(e.target.value); setErrors(er => ({...er, start_date:""})); calcDays(e.target.value, endDate); }}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.start_date ? "border-red-300" : "border-gray-200"}`} />
              {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To <span className="text-red-500">*</span></label>
              <input type="date" value={endDate} min={startDate || today}
                onChange={e => { setEndDate(e.target.value); setErrors(er => ({...er, end_date:""})); calcDays(startDate, e.target.value); }}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.end_date ? "border-red-300" : "border-gray-200"}`} />
              {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
            </div>
          </div>
          {workingDays !== null && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-blue-700 font-medium">
                {workingDays} working {workingDays === 1 ? "day" : "days"}
                {selectedBalance && <span className="text-blue-500 font-normal"> · {selectedBalance.remaining_days}/{selectedBalance.allocated_days} available</span>}
              </p>
            </div>
          )}
        </div>

        {/* Half day */}
        {selectedType?.allow_half_day && (
          <div className="p-5">
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <button type="button" onClick={() => setIsHalfDay(v => !v)}
                className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${isHalfDay ? "bg-blue-600" : "bg-gray-200"}`}>
                <span className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isHalfDay ? "translate-x-4" : ""}`}></span>
              </button>
              <span className="text-sm font-medium text-gray-700">Half day</span>
            </label>
            {isHalfDay && (
              <div className="mt-3 flex gap-2">
                {["AM","PM"].map(p => (
                  <button key={p} type="button" onClick={() => setHalfDayPeriod(p)}
                    className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all ${halfDayPeriod===p ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    {p === "AM" ? "Morning" : "Afternoon"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CD duty date */}
        {selectedType?.code === "CD" && (
          <div className="p-5" style={{background:"#fffbeb", borderLeft:"4px solid #f59e0b"}}>
            <label className="block text-sm font-medium mb-1" style={{color:"#78350f"}}>Date of duty on second rest <span className="text-red-500">*</span></label>
            <p className="text-xs mb-2" style={{color:"#92400e"}}>Enter the date you worked on your rest day.</p>
            <input type="date" value={dutyDate} onChange={e => { setDutyDate(e.target.value); setErrors(er => ({...er, duty_date:""})); }}
              className={`border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none ${errors.duty_date ? "border-red-300" : "border-amber-200"}`} />
            {errors.duty_date && <p className="text-red-500 text-xs mt-1">{errors.duty_date}</p>}
          </div>
        )}

        {/* Reason */}
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
          <textarea value={reason} onChange={e => { setReason(e.target.value); setErrors(er => ({...er, reason:""})); }}
            rows={3} placeholder="Brief reason for your leave..."
            className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.reason ? "border-red-300" : "border-gray-200"}`} />
          {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
        </div>

        {/* Attachment — only for SL with MC */}
        {selectedType?.code === "SL" && sickSubtype === "with_mc" && (
        <div className="p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Medical Certificate <span className="text-red-500">*</span>
          </h3>
          <label className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${attachment ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}>
            <svg className={`w-5 h-5 flex-shrink-0 ${attachment ? "text-emerald-600" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <div className="flex-1 min-w-0">
              {attachment
                ? <p className="text-sm font-medium text-emerald-700 truncate">{attachment.name}</p>
                : <p className="text-sm text-gray-500">Click to attach (PDF, JPG, PNG — max 5MB)</p>}
            </div>
            {attachment && (
              <button type="button" onClick={e => { e.preventDefault(); setAttachment(null); }} className="text-xs text-red-500 hover:underline flex-shrink-0">Remove</button>
            )}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setAttachment(e.target.files?.[0] ?? null)} />
          </label>
          {errors.attachment && <p className="text-red-500 text-xs mt-1">{errors.attachment}</p>}
        </div>
        )}

        {/* Contact */}
        <div className="p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Contact during leave</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone number</label>
              <input type="tel" value={contact} onChange={e => setContact(e.target.value)} placeholder="0300-1234567"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Address during leave</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Home city or address"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {errors.general && <div className="mx-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{errors.general}</div>}

        <div className="p-5 flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {submitting ? "Submitting..." : "Submit leave application"}
          </button>
        </div>
      </div>
    </div>
  );
}

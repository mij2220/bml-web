// Leave Pass PDF generator — pure browser, no dependencies
// Styled to match Engro Fertilizer's paper form layout

export interface LeaveForPdf {
  reference_number: string;
  employee_name: string;
  employee_id_code?: string;
  department?: string;
  leave_type_name: string;
  leave_type_code: string;
  start_date: string;
  end_date: string;
  total_days: number | string;
  reason: string;
  contact_during_leave?: string;
  address_during_leave?: string;
  duty_date_for_cd?: string;
  status: string;
  applied_at: string;
  approvals?: Array<{
    level: number;
    action: string;
    comment?: string;
    approver_name?: string;
    actioned_at?: string;
  }>;
}

export function generateLeavePdf(leave: LeaveForPdf): void {
  const approver1 = leave.approvals?.find(a => a.level === 1);
  const approver2 = leave.approvals?.find(a => a.level === 2);

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const statusColor = leave.status === "approved"
    ? "#059669" : leave.status === "rejected" ? "#dc2626" : "#d97706";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Leave Pass — ${leave.reference_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px; }
    .page { max-width: 740px; margin: 0 auto; }

    /* Header */
    .header { text-align: center; border: 2px solid #111; padding: 10px; margin-bottom: 0; }
    .header h1 { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
    .header h2 { font-size: 13px; font-weight: bold; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px; }
    .ref { text-align: right; font-size: 10px; color: #555; margin-bottom: 4px; }

    /* Status badge */
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; color: white; background: ${statusColor}; margin-bottom: 8px; }

    /* Table grid */
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #333; padding: 5px 8px; vertical-align: top; }
    th { background: #f0f0f0; font-weight: bold; font-size: 10px; text-transform: uppercase; width: 28%; }
    .section-header { background: #222; color: white; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; text-align: center; padding: 5px; }

    /* Leave type chips */
    .lt-chip { display: inline-block; background: #1d4ed8; color: white; padding: 1px 8px; border-radius: 3px; font-weight: bold; font-size: 10px; margin-right: 4px; }

    /* Approval section */
    .approval-row td { padding: 8px; }
    .approval-box { border: 1px solid #ccc; padding: 6px; border-radius: 4px; min-height: 50px; }
    .approval-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .approval-name { font-weight: bold; font-size: 11px; margin-top: 2px; }
    .approval-action { font-size: 10px; margin-top: 2px; }
    .approved-tick { color: #059669; font-weight: bold; }
    .rejected-x { color: #dc2626; font-weight: bold; }
    .pending-dash { color: #d97706; }

    /* Leave pass divider */
    .divider { border-top: 2px dashed #666; margin: 16px 0 12px; text-align: center; }
    .divider span { background: white; padding: 0 8px; font-size: 10px; color: #666; position: relative; top: -8px; }

    /* Leave pass (detachable bottom) */
    .leave-pass-header { background: #111; color: white; text-align: center; padding: 6px; font-weight: bold; font-size: 12px; letter-spacing: 2px; }
    .lp-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; }
    .lp-cell { border: 1px solid #333; padding: 5px 8px; }
    .lp-label { font-size: 9px; color: #555; text-transform: uppercase; }
    .lp-value { font-weight: bold; font-size: 11px; margin-top: 2px; }

    /* Signature lines */
    .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 16px; }
    .sig-box { border-top: 1px solid #333; padding-top: 4px; text-align: center; font-size: 9px; color: #555; }

    @media print {
      body { padding: 10px; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="ref">Ref: ${leave.reference_number} &nbsp;|&nbsp; Generated: ${formatDate(new Date().toISOString())}</div>

  <div class="header">
    <h1>BookMyLeave</h1>
    <h2>Application for Leave</h2>
  </div>

  <div style="margin-top: 10px; margin-bottom: 8px;">
    <span class="status-badge">${leave.status.toUpperCase()}</span>
  </div>

  <!-- Employee Info -->
  <table style="margin-bottom: 0;">
    <tr>
      <th>Employee Name</th>
      <td><strong>${leave.employee_name}</strong></td>
      <th>Employee ID</th>
      <td>${leave.employee_id_code || "—"}</td>
    </tr>
    <tr>
      <th>Department</th>
      <td>${leave.department || "—"}</td>
      <th>Date of Application</th>
      <td>${formatDate(leave.applied_at)}</td>
    </tr>
  </table>

  <!-- Leave Details -->
  <table style="margin-top: -1px; margin-bottom: 0;">
    <tr>
      <td colspan="4" class="section-header">Leave Details</td>
    </tr>
    <tr>
      <th>Leave Type</th>
      <td>
        <span class="lt-chip">${leave.leave_type_code}</span>
        ${leave.leave_type_name}
      </td>
      <th>Total Days</th>
      <td><strong>${leave.total_days}</strong></td>
    </tr>
    <tr>
      <th>From</th>
      <td>${formatDate(leave.start_date)}</td>
      <th>To</th>
      <td>${formatDate(leave.end_date)}</td>
    </tr>
    <tr>
      <th>Reason</th>
      <td colspan="3">${leave.reason || "—"}</td>
    </tr>
    <tr>
      <th>Contact During Leave</th>
      <td>${leave.contact_during_leave || "—"}</td>
      <th>Address During Leave</th>
      <td>${leave.address_during_leave || "—"}</td>
    </tr>
    ${leave.duty_date_for_cd ? `
    <tr>
      <th>Duty Date (CD)</th>
      <td colspan="3">${formatDate(leave.duty_date_for_cd)}</td>
    </tr>` : ""}
  </table>

  <!-- Approval Section -->
  <table style="margin-top: -1px; margin-bottom: 0;">
    <tr>
      <td colspan="4" class="section-header">Approval</td>
    </tr>
    <tr class="approval-row">
      <td width="50%">
        <div class="approval-box">
          <div class="approval-label">Supervisor (Approval 1)</div>
          <div class="approval-name">${approver1?.approver_name || "—"}</div>
          <div class="approval-action">
            ${approver1?.action === "approved"
              ? `<span class="approved-tick">✓ Approved</span>`
              : approver1?.action === "rejected"
              ? `<span class="rejected-x">✗ Rejected</span>`
              : `<span class="pending-dash">⏳ Pending</span>`
            }
            ${approver1?.actioned_at ? ` &nbsp; ${formatDate(approver1.actioned_at)}` : ""}
          </div>
          ${approver1?.comment ? `<div style="font-size:9px;color:#555;margin-top:4px;">Note: ${approver1.comment}</div>` : ""}
        </div>
      </td>
      <td width="50%">
        <div class="approval-box">
          <div class="approval-label">Shift Incharge (Approval 2)</div>
          <div class="approval-name">${approver2?.approver_name || "—"}</div>
          <div class="approval-action">
            ${approver2?.action === "approved"
              ? `<span class="approved-tick">✓ Approved</span>`
              : approver2?.action === "rejected"
              ? `<span class="rejected-x">✗ Rejected</span>`
              : `<span class="pending-dash">⏳ Pending</span>`
            }
            ${approver2?.actioned_at ? ` &nbsp; ${formatDate(approver2.actioned_at)}` : ""}
          </div>
          ${approver2?.comment ? `<div style="font-size:9px;color:#555;margin-top:4px;">Note: ${approver2.comment}</div>` : ""}
        </div>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="text-align:right; border-top: 1px solid #ccc; padding: 8px 10px;">
        <div style="display:inline-block; border-top: 1px solid #333; padding-top: 4px; min-width: 160px; text-align:center; font-size: 9px; color: #555;">
          Employee Signature
        </div>
      </td>
    </tr>
  </table>

  <!-- Detachable Leave Pass -->
  <div class="divider"><span>✂ &nbsp; LEAVE PASS (Detach and carry) &nbsp; ✂</span></div>

  <div class="leave-pass-header">LEAVE PASS</div>
  <div class="lp-grid">
    <div class="lp-cell"><div class="lp-label">Employee</div><div class="lp-value">${leave.employee_name}</div></div>
    <div class="lp-cell"><div class="lp-label">Employee ID</div><div class="lp-value">${leave.employee_id_code || "—"}</div></div>
    <div class="lp-cell"><div class="lp-label">Reference</div><div class="lp-value">${leave.reference_number}</div></div>
    <div class="lp-cell"><div class="lp-label">Leave Type</div><div class="lp-value">${leave.leave_type_code || ""} — ${leave.leave_type_name}</div></div>
    <div class="lp-cell"><div class="lp-label">From</div><div class="lp-value">${formatDate(leave.start_date)}</div></div>
    <div class="lp-cell"><div class="lp-label">To (${leave.total_days} days)</div><div class="lp-value">${formatDate(leave.end_date)}</div></div>
    <div class="lp-cell" style="grid-column: 1/4;"><div class="lp-label">Status</div><div class="lp-value" style="color:${statusColor}">${leave.status.toUpperCase()}</div></div>
  </div>

  <div class="sig-row">
    <div class="sig-box">Supervisor</div>
    <div class="sig-box">Shift Incharge</div>
    <div class="sig-box">HR / ERD</div>
  </div>

</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

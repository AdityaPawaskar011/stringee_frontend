import React, { lazy, Suspense, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { useDispatch, useSelector } from "react-redux";
import { Mail, MessageCircle, MessageSquare } from "lucide-react";
import { useSubmitStatusMutation, useSendMessageMutation, useGetDispositionsQuery } from "@/services";
import { CALL_STATE, selectCallRouteParams, setCallState, clearCurrentCall } from "@/features/calls/slices/callSlice";
import { clearCurrentLead, selectCurrentLead } from "@/features/calls/slices/dialSlice";
import { selectIntegrations, selectMaskPii } from "@/features/auth/slices/authSlice";
import { maskEmail } from "@/shared/lib/mask";
import { useToast } from "@/shared/hooks/useToast";
import { dialErrorMessage, hasCallId } from "@/features/calls/lib/dialError";
import { TONE } from "@/features/calls/lib/dispositionTone";
import SendSmsButton from "@/features/sms/SendSmsButton";

const AgentMailModal = lazy(() => import("@/features/agent-mail/AgentMailModal"));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// The company's own list (Settings → Dispositions, api/routers/dispositions.py):
// { value: status code, label, color, is_callback }. Selected-state colours per tone.

// The callback time as ISO-8601 in the agent's own clock, WITH its UTC offset
// (e.g. 2026-11-02T15:30:00+05:30), so the server stores the moment the agent picked.
const formatCallbackDateTime = (date) => {
  if (!date) return null;
  const pad = (n) => String(n).padStart(2, "0");
  const off = -date.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const tz = `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${tz}`;
};

export default function CallDispositionPopup({ closeDispo, leadName = "Customer" }) {
  const dispatch = useDispatch();
  const { success, error } = useToast();
  // { call_id } or { ref_id } of the call being dispositioned.
  const callRouteParams = useSelector(selectCallRouteParams);
  const [submitStatus, { isLoading: submitting }] = useSubmitStatusMutation();
const [sendMessage] = useSendMessageMutation();
// SMS / email buttons only when the company has its own account set up.
const integrations = useSelector(selectIntegrations);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const { data: dispoRows = [], isLoading: dispoLoading } = useGetDispositionsQuery();
  const DISPOSITIONS = useMemo(
    () => dispoRows.map((d) => ({ value: d.status, label: d.label, color: d.color, is_callback: d.is_callback })),
    [dispoRows],
  );

  const [callbackDateTime, setCallbackDateTime] = useState(null);
  const [callbackComments, setCallbackComments] = useState("");
  const [sendReminderEmail, setSendReminderEmail] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);

  // A disposition flagged "callback" needs a date/time (was: the CBR code).
  const isCallback = !!selectedStatus?.is_callback;
  const lead = useSelector(selectCurrentLead);

  const phoneNumber = lead?.phone_number
    ? lead.phone_number.replace(/\D/g, "") // remove +, spaces, etc.
    : null;

  const maskPii = useSelector(selectMaskPii);
  const leadEmail = (lead?.email ?? "").trim();
  const hasValidEmail = EMAIL_RE.test(leadEmail);
  const displayEmail = maskPii ? maskEmail(leadEmail) : leadEmail;
  const leadFullName = [lead?.first_name, lead?.last_name].filter(Boolean).join(" ").trim();

  const mailPrefill = useMemo(() => ({
    leadId: lead?.lead_id ?? null,
    toEmails: hasValidEmail ? [leadEmail] : [],
    recipientName: leadFullName,
    phone: lead?.phone_number || "",
    placeholders: {
      ...(leadFullName ? { client_name: leadFullName } : {}),
      ...(lead?.first_name ? { first_name: lead.first_name } : {}),
    },
  }), [lead, leadEmail, hasValidEmail, leadFullName]);

  const handleOpenMail = () => {
    if (!hasValidEmail) {
      error(leadEmail ? `Invalid email on lead: ${displayEmail}` : "No email on this lead.");
      return;
    }
    setMailOpen(true);
  };

  const handleWhatsApp = () => {
    if (!phoneNumber) return;
    const url = `https://wa.me/${phoneNumber}`;
    window.open(url, "_blank");
  };
  const handleSendSMS = async () => {
    try {
      if (!phoneNumber) {
        error("No valid phone number to send SMS.");
        return};
      await sendMessage(phoneNumber).unwrap();
      success("SMS sent successfully");
    } catch {
      error("Failed to send SMS");
    }
  };
  const canSubmit = useMemo(() => {
    if (!selectedStatus) return false;
    if (!callbackComments?.trim()) return false;
    if (!isCallback) return true;
    return !!callbackDateTime; // require datetime for callback
  }, [selectedStatus, isCallback, callbackDateTime, callbackComments]);

  const buildPayload = () => {
    const payload = {
      status: selectedStatus.value,
      callback_comments: callbackComments.trim(),
      ...callRouteParams,
    };

    if (selectedStatus.is_callback) {
      payload.callback_datetime = callbackDateTime
        ? formatCallbackDateTime(callbackDateTime)
        : null;
      payload.send_reminder_email = !!sendReminderEmail;
    }

    return payload;
  };

  const submitOnly = async () => {
    if (!canSubmit) return false;
    // /submit_status needs the call's id (422 without one).
    if (!hasCallId(callRouteParams)) {
      throw { status: 422, data: { detail: "This call has no id yet - wait a moment and try again." } };
    }

    await submitStatus(buildPayload()).unwrap();

    // reset local
    setSelectedStatus(null);
    setCallbackDateTime(null);
    setCallbackComments("");
    setSendReminderEmail(false);
    dispatch(clearCurrentLead())
    // The call is dispositioned - forget it. Left in place, a later dial that did
    // not overwrite it inherited this finished Stringee call, and CallPage opened
    // the disposition box again at once without the new number being dialled.
    dispatch(clearCurrentCall());
    return true;
  };

  const handleSubmitAndClose = async () => {
    try {
      const ok = await submitOnly();
      if (!ok) return;
      dispatch(setCallState(CALL_STATE.IDLE));
      closeDispo?.();
    } catch (e) {
      console.error(e);
      alert(dialErrorMessage(e, "Failed to submit disposition."));
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="w-full max-w-[860px] max-h-[700px] rounded-2xl border border-white/10 overflow-y-scroll
                   bg-gradient-to-b from-slate-900/70 to-slate-950/80 shadow-[0_30px_120px_rgba(0,0,0,0.65)] animate-pop-in"
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-white/10">
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(600px_circle_at_20%_0%,rgba(56,189,248,0.18),transparent_50%),radial-gradient(700px_circle_at_90%_20%,rgba(168,85,247,0.15),transparent_55%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-slate-100 tracking-wide">
                Call Disposition Options
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                Call with <span className="font-semibold text-slate-100">{leadName}</span> has been ended.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Notes */}
          <div className="mt-2">
            <div className="text-sm text-slate-300 mb-2">
              Follow-up Notes <span className="text-red-400">*</span>
            </div>
            <textarea
              value={callbackComments}
              onChange={(e) => setCallbackComments(e.target.value)}
              rows={3}
              placeholder="Add notes..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/25 px-4 py-3
                         text-slate-100 placeholder:text-slate-500 focus:outline-none
                         focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          {/* Callback date row + toggle row (only when CBR) */}
          {isCallback && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3
                              rounded-xl border border-white/10 bg-slate-950/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg border border-white/10 bg-slate-950/25 grid place-items-center">
                    📅
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      Callback Date &amp; Time <span className="text-red-400">*</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Select one date and time for callback
                    </div>
                  </div>
                </div>

                <DatePicker
                  selected={callbackDateTime}
                  onChange={(d) => setCallbackDateTime(d)}
                  showTimeSelect
                  timeIntervals={15}
                  timeCaption="Time"
                  dateFormat="EEE, MMM d, yyyy · h:mm aa"
                  minDate={new Date()}
                  placeholderText="Select date & time…"
                  className={[
                    "w-full md:w-[340px] rounded-lg px-3 py-2 text-sm text-slate-100",
                    "focus:outline-none transition",
                    callbackDateTime
                      ? "border border-sky-400/50 bg-sky-500/10 ring-1 ring-sky-500/30"
                      : "border border-amber-400/60 bg-slate-950/30 ring-1 ring-amber-400/30 placeholder:text-slate-500",
                  ].join(" ")}
                  popperClassName="z-[70]"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg border border-white/10 bg-slate-950/25 grid place-items-center">
                    ✉️
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Send Reminder Email</div>
                    <div className="text-xs text-slate-400">Optional</div>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => setSendReminderEmail((s) => !s)}
                  className={[
                    "relative inline-flex h-7 w-12 items-center rounded-full border transition",
                    sendReminderEmail
                      ? "bg-emerald-500/25 border-emerald-400/30"
                      : "bg-slate-800/50 border-white/10",
                  ].join(" ")}
                  aria-pressed={sendReminderEmail}
                >
                  <span
                    className={[
                      "inline-block h-6 w-6 transform rounded-full bg-white transition",
                      sendReminderEmail ? "translate-x-5" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>

              {!callbackDateTime && (
                <div className="text-xs text-amber-300/90">
                  Please select a callback date &amp; time.
                </div>
              )}
            </div>
          )}

          {/* Summary strip (like screenshot bottom row) */}
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/18 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-slate-500">Selected</span>
                <span className="text-sm font-semibold text-slate-100">
                  {selectedStatus ? selectedStatus.label : "—"}
                </span>
                {selectedStatus?.value && (
                  <span className="text-xs text-slate-400">({selectedStatus.value})</span>
                )}
              </div>

              {isCallback && callbackDateTime ? (
                <div className="text-sm text-slate-200">
                  <span className="text-slate-400 mr-2">Callback:</span>
                  {callbackDateTime.toLocaleString()}
                </div>
              ) : (
                <div className="text-sm text-slate-500"> </div>
              )}
            </div>
          </div>

          {/* Optional: compact grid of all dispositions (still looks clean) */}
          <div className="mt-5">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">All dispositions</div>
            {!dispoLoading && DISPOSITIONS.length === 0 && (
              <div className="text-sm text-amber-300/90">
                No dispositions are set up for your company. Ask an admin to add them in Settings → Dispositions.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {DISPOSITIONS.map((d) => {
                const active = selectedStatus?.value === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setSelectedStatus(d)}
                    className={[
                      "rounded-xl border px-3 py-2 text-left transition",
                      active
                        ? `${TONE[d.color] || TONE.slate} shadow-[0_0_22px_rgba(56,189,248,0.10)]`
                        : "bg-slate-950/20 border-white/10 text-slate-200 hover:bg-slate-950/35",
                    ].join(" ")}
                  >
                    <div className="text-sm font-semibold">{d.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{d.value}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
<div className="px-6 py-5 border-t border-white/10 bg-slate-950/25">
<div className="flex flex-col md:flex-row gap-3">
  {/* Submit */}
  <button
    onClick={handleSubmitAndClose}
    disabled={!canSubmit || submitting}
    className="w-full md:w-1/2 rounded-xl border border-white/10 bg-slate-950/20 px-4 py-3
               text-slate-100 font-semibold hover:bg-slate-950/35 transition disabled:opacity-50"
  >
    {submitting ? "Saving..." : "Submit & Close"}
  </button>

  {/* SMS + WhatsApp + Email */}
  <div className="w-full md:w-1/2 flex gap-3">
    {/* Send SMS: compose through Stringee when it is set up, else the company's Twilio. */}
    {integrations.stringee_sms ? (
      <SendSmsButton
        phone={lead?.phone_number}
        name={leadFullName}
        iconSize={18}
        className="flex-1 rounded-xl px-4 py-3 font-semibold bg-blue-600 text-white hover:bg-blue-700"
      />
    ) : integrations.sms && (
    <button
      onClick={handleSendSMS}
      // disabled={!phoneNumber}
      disabled={true}
      className="flex-1 flex items-center justify-center gap-2
                 rounded-xl px-4 py-3 font-semibold
                 bg-blue-600 text-white
                 hover:bg-blue-700 transition disabled:opacity-40"
    >
      <MessageSquare size={18} strokeWidth={2.2} />
      <span>SMS</span>
    </button>
    )}

    {/* WhatsApp */}
    <button
      onClick={handleWhatsApp}
      // disabled={!phoneNumber}
      disabled={true}
      className="flex-1 flex items-center justify-center gap-2
                 rounded-xl px-4 py-3 font-semibold
                 bg-[#25D366] text-white
                 hover:bg-[#1EBE5D] transition disabled:opacity-40"
    >
      <MessageCircle size={18} strokeWidth={2.2} />
      <span>WhatsApp</span>
    </button>

    {/* Email */}
    {integrations.email && (
    <button
      onClick={handleOpenMail}
      disabled={!hasValidEmail}
      title={hasValidEmail ? `Email ${displayEmail}` : "No email on this lead"}
      className="flex-1 flex items-center justify-center gap-2
                 rounded-xl px-4 py-3 font-semibold
                 bg-primary text-primary-foreground
                 hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Mail size={18} strokeWidth={2.2} />
      <span>Email</span>
    </button>
    )}
  </div>
  </div>

  {/* tiny hint */}
  <div className="mt-3 text-xs text-slate-400">
    {!selectedStatus && "Select a disposition to continue."}
    {selectedStatus && !callbackComments?.trim() && "Follow-up notes are required before submitting."}
    {selectedStatus && callbackComments?.trim() && isCallback && !callbackDateTime && "Please select a callback date & time."}
    {selectedStatus && callbackComments?.trim() && isCallback && callbackDateTime && "Ready to submit — callback scheduled."}
    {selectedStatus && callbackComments?.trim() && !isCallback && "Ready to submit."}
  </div>
</div>

      </div>

      {mailOpen && (
        <Suspense fallback={null}>
          <AgentMailModal
            open={mailOpen}
            onClose={() => setMailOpen(false)}
            leadId={lead?.lead_id ?? null}
            prefill={mailPrefill}
          />
        </Suspense>
      )}
    </div>
  );
}

// Report download for the Reporting page (DownloadReportModal).
//
// buildExportColumns() lists every column the user can pick, grouped like the modal
// shows them. The fixed columns read the row the grid already has; three groups are
// built from the data itself: one score + "why" pair per call-quality criterion
// (row.rating_parts — criteria are configurable per company), one column per Meta
// form question (row.raw_data) and one per admin-defined custom column.

import { maskEmail, maskPhone } from '@/shared/lib/mask';
import { dispositionLabel } from './utils';

// Excel refuses a cell over 32,767 characters (long transcripts).
const EXCEL_CELL_MAX = 32000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;
const PHONE_RE = /^\+?\d[\d\s().-]{5,}$/;

const empty = (v) => v === null || v === undefined || v === '';
const text = (v) => (empty(v) ? '' : Array.isArray(v) ? v.filter((x) => !empty(x)).join(', ') : String(v));
const when = (v) => (v ? String(v).slice(0, 16).replace('T', ' ') : '');
const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : '');
const mmss = (secs) => {
  if (empty(secs)) return '';
  const s = Math.max(0, Math.round(Number(secs) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const bullets = (list) => (Array.isArray(list) && list.length ? list.map((i) => `• ${i}`).join('\n') : '');

// Mask any value that looks like an email or a phone number (form answers can hold either).
const maskLoose = (v) => {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (EMAIL_RE.test(s)) return maskEmail(s);
  if (PHONE_RE.test(s)) return maskPhone(s);
  return v;
};

// "what_is_your_planned_starting_investment?" → "What is your planned starting investment"
const humanizeKey = (k) => {
  const s = String(k).replace(/[_-]+/g, ' ').replace(/[?:]+\s*$/g, '').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const parseRaw = (data) => {
  if (!data) return null;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
};

const agentOf = (r) => r.vici_call_agent || r.agent_name || r.agent_user || '';

export const EXPORT_GROUPS = [
  { id: 'call', label: 'Call' },
  { id: 'lead', label: 'Lead / Meta' },
  { id: 'ai', label: 'AI quality' },
  { id: 'form', label: 'Form answers' },
  { id: 'custom', label: 'Custom columns' },
];

// Ticked the first time the modal opens (before the user's own choice is remembered).
export const DEFAULT_EXPORT_KEYS = [
  'call_date', 'agent', 'disposition', 'call_response',
  'lead_id', 'lead_created', 'customer_name', 'phone', 'email',
  'meta_campaign', 'ad_set', 'ad', 'form',
  'call_rating', 'call_summary',
];

export function buildExportColumns(rows, formFields = [], { maskPii = false } = {}) {
  const pii = (fn) => (r) => (maskPii ? maskLoose(fn(r)) : fn(r));

  const cols = [
    // ── Call ──
    { key: 'call_date', group: 'call', label: 'Call date and time', get: (r) => when(r.call_date) },
    { key: 'agent', group: 'call', label: 'Agent', get: agentOf },
    { key: 'agent_user', group: 'call', label: 'Agent user ID', get: (r) => text(r.agent_user) },
    { key: 'call_length', group: 'call', label: 'Call length (mm:ss)', get: (r) => mmss(r.length_in_sec) },
    { key: 'disposition', group: 'call', label: 'Call disposition', get: (r) => text(dispositionLabel(r.vici_call_status)) },
    { key: 'disposition_code', group: 'call', label: 'Disposition code', get: (r) => text(r.vici_call_status) },
    { key: 'call_response', group: 'call', label: 'Call response (agent notes)', get: (r) => text(r.vici_call_comments) },
    {
      key: 'recording', group: 'call', label: 'Recording link (valid 1 hour)',
      get: (r) => (r.recording_link ? new URL(r.recording_link, window.location.origin).href : ''),
    },
    { key: 'call_ref', group: 'call', label: 'Call reference', get: (r) => text(r.uniqueid) },

    // ── Lead / Meta ──
    { key: 'lead_id', group: 'lead', label: 'Lead ID', get: (r) => (empty(r.lead_id) ? '' : r.lead_id) },
    { key: 'dialer_lead_id', group: 'lead', label: 'Dialer lead ID', get: (r) => text(r.vici_lead_id) },
    { key: 'lead_created', group: 'lead', label: 'Lead created', get: (r) => when(r.inserted_date) },
    {
      key: 'customer_name', group: 'lead', label: 'Customer name',
      get: (r) => r.name || [r.vici_call_first_name, r.vici_call_last_name].filter(Boolean).join(' '),
    },
    { key: 'phone', group: 'lead', label: 'Phone', get: pii((r) => text(r.phone)) },
    { key: 'email', group: 'lead', label: 'Email', get: pii((r) => text(r.email || r.vici_call_email)) },
    { key: 'meta_campaign', group: 'lead', label: 'Meta campaign', get: (r) => text(r.campaign_name) },
    { key: 'ad_set', group: 'lead', label: 'Ad set', get: (r) => text(r.ad_set_name) },
    { key: 'ad', group: 'lead', label: 'Ad', get: (r) => text(r.ad_name) },
    { key: 'form', group: 'lead', label: 'Form', get: (r) => text(r.form_name) },
    { key: 'dialer_campaign', group: 'lead', label: 'Dialer campaign', get: (r) => text(r.vici_campaigns) },
    { key: 'lead_status', group: 'lead', label: 'Lead status', get: (r) => text(r.vici_lead_status) },
    { key: 'followup_via', group: 'lead', label: 'Follow-up via', get: (r) => text(r.how_contacted) },
    { key: 'followup_response', group: 'lead', label: 'Follow-up response', get: (r) => text(r.response) },
    { key: 'registered', group: 'lead', label: 'Registered', get: (r) => yesNo(r.client_registered) },
    { key: 'deposited', group: 'lead', label: 'Deposited', get: (r) => yesNo(r.client_deposited) },
    { key: 'first_status', group: 'lead', label: 'First status change', get: (r) => when(r.first_status_change) },
    { key: 'latest_status', group: 'lead', label: 'Latest status change', get: (r) => when(r.last_status_change) },

    // ── AI quality (fixed part) ──
    { key: 'call_rating', group: 'ai', label: 'Call rating (out of 5)', get: (r) => (empty(r.call_rating) ? '' : Number(r.call_rating)) },
    { key: 'stars', group: 'ai', label: 'Stars', get: (r) => (empty(r.call_stars) ? '' : Number(r.call_stars)) },
    { key: 'call_outcome', group: 'ai', label: 'AI call outcome', get: (r) => text(r.call_outcome) },
    { key: 'agent_sentiment', group: 'ai', label: 'Agent sentiment', get: (r) => text(r.agent_sentiment) },
    { key: 'client_sentiment', group: 'ai', label: 'Client sentiment', get: (r) => text(r.client_sentiment) },
    { key: 'call_summary', group: 'ai', label: 'Call summary', get: (r) => text(r.call_summary) },
    { key: 'rating_breakdown', group: 'ai', label: 'Rating breakdown (full)', get: (r) => text(r.rating_breakdown) },
    { key: 'strengths', group: 'ai', label: 'Strengths', get: (r) => bullets(r.strengths) },
    { key: 'improvements', group: 'ai', label: 'Improvements', get: (r) => bullets(r.improvements) },
  ];

  // One score + "why" column per criterion, in the order the calls were scored with.
  const criteria = [];
  const seenCriteria = new Set();
  const formKeys = [];
  const seenForm = new Set();
  rows.forEach((r) => {
    (r.rating_parts || []).forEach((p) => {
      if (p?.label && !seenCriteria.has(p.label)) {
        seenCriteria.add(p.label);
        criteria.push(p.label);
      }
    });
    const raw = parseRaw(r.raw_data);
    if (raw) {
      Object.keys(raw).forEach((k) => {
        if (!seenForm.has(k)) {
          seenForm.add(k);
          formKeys.push(k);
        }
      });
    }
  });

  const part = (r, label) => (r.rating_parts || []).find((p) => p?.label === label);
  criteria.forEach((label) => {
    cols.push(
      {
        key: `score__${label}`, group: 'ai', label: `${label} score`,
        get: (r) => { const s = part(r, label)?.score; return empty(s) ? '' : Number(s); },
      },
      { key: `why__${label}`, group: 'ai', label: `${label} — why`, get: (r) => text(part(r, label)?.comment) },
    );
  });
  // The transcript is the longest column: keep it last in its group.
  cols.push({ key: 'transcript', group: 'ai', label: 'Transcript', get: (r) => text(r.transcript_text) });

  formKeys
    .sort((a, b) => humanizeKey(a).localeCompare(humanizeKey(b)))
    .forEach((k) => {
      cols.push({
        key: `form__${k}`, group: 'form', label: humanizeKey(k),
        get: pii((r) => text(parseRaw(r.raw_data)?.[k])),
      });
    });

  (formFields || []).forEach((f) => {
    if (!f?.name) return;
    cols.push({
      key: `custom__${f.name}`, group: 'custom', label: f.name,
      get: pii((r) => text(r.custom_fields?.[f.name])),
    });
  });

  return cols;
}

const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Writes the rows with the chosen columns (in catalogue order) and starts the download.
export async function downloadReport({ rows, columns, format, from, to }) {
  const headers = columns.map((c) => c.label);
  const body = rows.map((r) =>
    columns.map((c) => {
      const v = c.get(r);
      return typeof v === 'string' && v.length > EXCEL_CELL_MAX ? `${v.slice(0, EXCEL_CELL_MAX)}…[truncated]` : v;
    }),
  );

  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  const range = from && to ? (from === to ? from : `${from}_to_${to}`) : stamp();
  const base = `hot-leads-report_${range}`;

  if (format === 'csv') {
    // BOM so Excel opens the UTF-8 CSV with names / Hindi text intact.
    const blob = new Blob(['﻿', XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  // Column widths from the content, capped so long text columns stay usable.
  ws['!cols'] = columns.map((c, i) => {
    const longest = body.reduce((m, row) => Math.max(m, String(row[i] ?? '').split('\n')[0].length), c.label.length);
    return { wch: Math.min(Math.max(longest, 10), 60) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hot Leads');
  XLSX.writeFile(wb, `${base}.xlsx`);
}

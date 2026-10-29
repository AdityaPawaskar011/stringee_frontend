// Statuses whose detail the server writes for the agent: not linked to a StringeeX
// agent (400), outside your campaigns / on the do-not-call list (403), no callable
// leads (404), lead held by another agent (409), Dial Next without a campaign (422),
// Stringee refused the call (502), Stringee down / calling not set up (503).
const AGENT_FACING = new Set([400, 403, 404, 409, 422, 502, 503]);

/** The message to show when a call action fails: the server's own text when it
 * wrote one for the agent, else the caller's generic text. */
export const dialErrorMessage = (e, fallback) =>
  (AGENT_FACING.has(e?.status) && typeof e?.data?.detail === "string" && e.data.detail) || fallback;

/** True when the call on screen can be addressed by /hangup and /submit_status. */
export const hasCallId = (params) => !!(params?.call_id || params?.ref_id);

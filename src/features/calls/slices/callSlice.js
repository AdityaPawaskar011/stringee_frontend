import { createSlice } from "@reduxjs/toolkit";

export const CALL_STATE = {
  IDLE: "IDLE",
  DIALING: "DIALING",
  INCALL: "INCALL",
  ENDING: "ENDING",
  DISPO: "DISPO",
};

export const PROVIDER = {
  STRINGEE: "stringee",
};

/**
 * The call on screen. { provider, id, refId } — id is Stringee's callId (null
 * until its first webhook event lands), refId is our own correlation id.
 * provider is null when there is no call.
 *
 * Dial, hangup and disposition all read this.
 */
const noCall = { provider: null, id: null, refId: null, mode: null, fromNumber: null, toNumber: null };

const callSlice = createSlice({
  name: "call",
  initialState: {
    state: CALL_STATE.IDLE,
    showDispo: false,
    isCallbackDial : false,
    currentCall: noCall,
    // Stringee reachability as this tab sees it (lib/stringeePhone health), and
    // whether a dialled call is parked waiting for it to come back.
    stringee: { status: "unknown", reason: "", waiting: false },
  },
  reducers: {
    setCallState(state, action) {
      state.state = action.payload;
    },
    /** Take the provider straight off a /call response. */
    setCurrentCallFromDial(state, action) {
      const res = action.payload || {};
      state.currentCall = {
        // Stringee carries every call.
        provider: PROVIDER.STRINGEE,
        id:       res.call_id ?? null,
        refId:    res.ref_id ?? null,
        // "browser" = the dashboard itself dials (useStringeeBrowserCall).
        mode:       res.mode ?? null,
        fromNumber: res.from_number ?? null,
        toNumber:   res.dialed_phone ?? null,
      };
    },
    /** Fill in the callId once /call_status has learned it. */
    setCurrentCallId(state, action) {
      if (state.currentCall) state.currentCall.id = action.payload ?? null;
    },
    clearCurrentCall(state) {
      state.currentCall = noCall;
    },
    openDispo(state) {
      state.showDispo = true;
      state.state = CALL_STATE.DISPO;
    },
    closeDispo(state) {
      state.showDispo = false;
    //   state.state = CALL_STATE.IDLE;
    },
    resetCall(state) {
      state.state = CALL_STATE.IDLE;
      state.showDispo = false;
      state.currentCall = noCall;
    },
    setIsCallbackDial(state,action){
      state.isCallbackDial = action.payload
    },
    setStringeeHealth(state, action) {
      const { status = "unknown", reason = "" } = action.payload || {};
      state.stringee.status = status;
      state.stringee.reason = reason;
    },
    setStringeeWaiting(state, action) {
      state.stringee.waiting = !!action.payload;
    },
  },
});

export const {
  setCallState, openDispo, closeDispo, resetCall, setIsCallbackDial,
  setCurrentCallFromDial, setCurrentCallId, clearCurrentCall,
  setStringeeHealth, setStringeeWaiting,
} = callSlice.actions;

export default callSlice.reducer;

export const selectCallState = (s) => s.call.state;
export const selectShowDispo = (s) => s.call.showDispo;
export const selectIsCallbackDial = (s) => s.call.isCallbackDial;
export const selectStringeeHealth = (s) => s.call.stringee;
export const selectCurrentCall = (s) => s.call.currentCall ?? noCall;
export const selectIsStringeeCall = (s) =>
  s.call.currentCall?.provider === PROVIDER.STRINGEE;

/** The params hangup / submit_status need to address the call on screen. */
export const selectCallRouteParams = (s) => {
  const c = s.call.currentCall;
  if (c?.provider !== PROVIDER.STRINGEE) return {};
  // A callout returns no call id until the first carrier event, so ref_id is
  // often all we have.
  if (c.id) return { call_id: c.id };
  if (c.refId) return { ref_id: c.refId };
  return {};
};

export const selectIsCallBusy = (s) =>
  s.call.state !== CALL_STATE.IDLE; // disable DIAL NEXT when true


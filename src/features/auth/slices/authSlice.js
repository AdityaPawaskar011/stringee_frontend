import { createSlice } from "@reduxjs/toolkit";

const safeParse = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialState = {
  user: safeParse("user"), // persists refresh
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    clearUser(state) {
      state.user = null;
      localStorage.removeItem("user");
      // sessionStorage.clear();
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;

// optional selectors (recommended)
export const selectUser = (state) => state.auth.user;
export const selectIsAdmin = (state) => !!state.auth.user?.isAdmin;

// PII visibility gate: only this login username may see unmasked phone/email.
const PII_VIEWER_USERNAME = "adminr";
export const selectCanViewPii = (state) =>
  (state.auth.user?.user || "").trim().toLowerCase() === PII_VIEWER_USERNAME;

// WhatsApp admin console gate — same single-user rule (login username === "adminr").
export const selectIsWhatsappAdmin = (state) =>
  (state.auth.user?.user || "").trim().toLowerCase() === PII_VIEWER_USERNAME;
// PII masking is gated by an env flag: VITE_MASK_PII_ENABLED=true restores the adminr-only
// gate; anything else (e.g. false / unset) turns masking off so everyone sees full values.
const MASK_PII_ENABLED = import.meta.env.VITE_MASK_PII_ENABLED === "true";
export const selectMaskPii = (state) => MASK_PII_ENABLED && !selectCanViewPii(state);
// Which integrations the user's company has (from /login and /me). A session from before
// this field existed shows everything; the API refuses what the company does not have.
const ALL_INTEGRATIONS = Object.freeze({
  whatsapp: true, stringee: true, stringee_sms: true, email: true, sms: true, doubletick: true,
});
export const selectIntegrations = (state) => state.auth.user?.integrations || ALL_INTEGRATIONS;
// Platform admin (Postgres platform_admins): company selector + Platform → Companies.
export const selectIsPlatformAdmin = (state) => !!state.auth.user?.isPlatformAdmin;
// The companies the selector offers ([{slug, name, status}], from /me).
const NO_COMPANIES = Object.freeze([]);
export const selectCompanies = (state) => state.auth.user?.companies || NO_COMPANIES;
// May change the company's settings (api/core/guards.is_company_admin; the API re-checks).
export const selectIsCompanyAdmin = (state) => !!state.auth.user?.canManageSettings;
export const selectRoleLabel = (state) => state.auth.user?.isAdmin ? "Admin" : "Agent";
export const selectUserName = (state) => state.auth.user?.user || state.auth.user?.full_name || "User";
export const selectCampaingName = (state) => state.auth.user?.campaign_name || "NO CAMPAIGN";
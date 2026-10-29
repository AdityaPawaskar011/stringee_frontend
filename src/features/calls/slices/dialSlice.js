import { createSlice } from "@reduxjs/toolkit";
import dayjs from "dayjs"

// Seconds between one call's end and the next auto-dial.
export const AUTO_DIAL_SECONDS = 30;

const initialState = {
  currentLead: null, // <-- will store response.details
  isPaused: true,
  isAvailableLeads:false,
  autoDialTime: dayjs().add(AUTO_DIAL_SECONDS, "seconds").valueOf(),
  formNameFilter: "",
};

const dialSlice = createSlice({
  name: "dial",
  initialState,
  reducers: {
    setCurrentLead(state, action) {
      state.currentLead = action.payload; // details object
    },
    clearCurrentLead(state) {
      state.currentLead = null;
    },
    togglePause(state){
      state.isPaused = !state.isPaused
    },
    // Mirrors the server's agent state (GET/PUT /agent/state, useAgentState).
    setPaused(state, action){
      state.isPaused = !!action.payload
    },
    resetAutoDialTime(state){
      state.autoDialTime = dayjs().add(AUTO_DIAL_SECONDS, "seconds").valueOf()
    },
    setIsAvailableLeads(state, action){
      state.isAvailableLeads = action.payload
    },
    setFormNameFilter(state, action) {
  state.formNameFilter = action.payload;
},
  },
});

export const { setCurrentLead, clearCurrentLead, togglePause, setPaused, resetAutoDialTime,setIsAvailableLeads, setFormNameFilter } = dialSlice.actions;
export default dialSlice.reducer;

export const selectCurrentLead = (state) => state.dial.currentLead;
export const selectFormNameFilter = (state) => state.dial.formNameFilter;

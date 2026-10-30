import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { selectIsAdmin } from "@/features/auth/slices/authSlice";
import { setPaused } from "@/features/calls/slices/dialSlice";
import { useGetAgentStateQuery, useSetAgentStateMutation } from "@/services";
import { useToast } from "@/shared/hooks/useToast";

/**
 * The agent's state on the server (GET/PUT /agent/state): available | paused |
 * in_call | wrap_up. Mirrored into dial.isPaused, which the auto-dial countdown,
 * the Dial Next button and the /ping poll already read.
 *
 * Only "paused" pauses dialling; in_call and wrap_up are the call itself (/call,
 * /hangup and /submit_status set them). A fresh login has no state yet and the
 * server reports "paused", so an agent starts paused and presses Resume.
 *
 * Pausing is taking a break: takeBreak(key) pauses with a break type from
 * GET /agent/breaks as the reason, and the server logs it for the admins.
 */
export function useAgentState() {
  const dispatch = useDispatch();
  const { error: toastError } = useToast();
  const isAdmin = useSelector(selectIsAdmin);
  const isPaused = useSelector((s) => s.dial.isPaused);

  const { data, isFetching } = useGetAgentStateQuery(undefined, {
    skip: isAdmin,
    pollingInterval: 30000,
    skipPollingIfUnfocused: true,
  });
  const [putState, { isLoading: isSaving }] = useSetAgentStateMutation();

  const state = data?.state ?? null;
  useEffect(() => {
    if (state) dispatch(setPaused(state === "paused"));
  }, [state, dispatch]);

  const setState = useCallback(
    async (next, reason) => {
      try {
        const res = await putState(reason ? { state: next, reason } : { state: next }).unwrap();
        dispatch(setPaused(res?.state === "paused"));
        return res;
      } catch (e) {
        // 409: a call of this agent is still live.
        toastError(
          typeof e?.data?.detail === "string" ? e.data.detail : "Could not change your status. Please try again.",
        );
        return null;
      }
    },
    [putState, dispatch, toastError],
  );

  const takeBreak = useCallback((breakType) => setState("paused", breakType), [setState]);
  const resume = useCallback(() => setState("available"), [setState]);

  return {
    state,
    isPaused,
    reason: data?.reason ?? null,
    since: data?.since ?? null,
    takeBreak,
    resume,
    setState,
    isBusy: isSaving || isFetching,
  };
}

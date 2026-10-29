import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { clearUser } from "@/features/auth/slices/authSlice";
import { dashboardApi } from "@/services";

/** Clears the session and returns to /login. */
export function useLogout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return useCallback(() => {
    dispatch(clearUser());
    // Drop every cached response, so the next login on this browser (possibly
    // another company's user) never sees this user's data or branding first.
    dispatch(dashboardApi.util.resetApiState());
    navigate("/login", { replace: true });
  }, [dispatch, navigate]);
}

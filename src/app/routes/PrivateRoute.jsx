import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  selectIsAdmin, selectUser, selectIsWhatsappAdmin, selectIsCompanyAdmin, selectIsPlatformAdmin,
} from "@/features/auth/slices/authSlice";

// requireCompanyAdmin: company-wide settings and dialer setup (the API answers 403 to
//   anyone else anyway). requirePlatformAdmin: the companies themselves.
export default function PrivateRoute({
  allowedAdmin, requireAdminr = false, requireCompanyAdmin = false, requirePlatformAdmin = false,
}) {
  const location = useLocation();

  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const isWhatsappAdmin = useSelector(selectIsWhatsappAdmin);
  const isCompanyAdmin = useSelector(selectIsCompanyAdmin);
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedAdmin === true && !isAdmin) {
    return <Navigate to="/unauthorized" replace state={{ requiredRole: "Admin" }} />;
  }

  if (allowedAdmin === false && isAdmin) {
    return <Navigate to="/unauthorized" replace state={{ requiredRole: "Agent" }} />;
  }

  if (requireCompanyAdmin && !isCompanyAdmin) {
    return <Navigate to="/unauthorized" replace state={{ requiredRole: "Company admin" }} />;
  }

  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/unauthorized" replace state={{ requiredRole: "Platform admin" }} />;
  }

  if (requireAdminr && !isWhatsappAdmin) {
    return <Navigate to="/unauthorized" replace state={{ requiredRole: "adminr" }} />;
  }

  return <Outlet />;
}

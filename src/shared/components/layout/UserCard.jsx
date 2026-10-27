import { LogOut } from "lucide-react";
import { useSelector } from "react-redux";

import {
  selectCampaingName,
  selectRoleLabel,
  selectUserName,
} from "@/features/auth/slices/authSlice";
import { useLogout } from "@/features/auth/hooks/useLogout";

// "AdminR" -> "AD", "john smith" -> "JS", "8999" -> "89"
const initials = (name) => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2);
  return letters.toUpperCase();
};

/** Signed-in identity + logout. Lives in the sidebar footer and mobile drawer. */
export default function UserCard({ collapsed = false, onAction }) {
  const userName = useSelector(selectUserName);
  const roleLabel = useSelector(selectRoleLabel);
  const campaignName = useSelector(selectCampaingName);
  const logout = useLogout();

  const avatar = (
    <div className="icon-tile h-8 w-8 shrink-0 text-[11px] font-bold tracking-wide font-display">
      {initials(userName)}
    </div>
  );

  const handleLogout = () => {
    onAction?.();
    logout();
  };

  const logoutButton = (
    <button
      onClick={handleLogout}
      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-destructive transition-smooth active:scale-90"
      title="Logout"
      aria-label="Logout"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div title={`${userName} · ${roleLabel}${campaignName ? ` · ${campaignName}` : ""}`}>
          {avatar}
        </div>
        {logoutButton}
      </div>
    );
  }

  return (
    <div className="surface flex items-center gap-2.5 rounded-lg px-2.5 py-2">
      {avatar}
      <div className="min-w-0 leading-tight">
        <div className="truncate text-xs font-medium text-foreground">{userName}</div>
        <div className="truncate text-[11px] text-muted-foreground">{roleLabel}</div>
        {campaignName && (
          <div className="truncate text-[10px] text-muted-foreground/80">{campaignName}</div>
        )}
      </div>
      <div className="ml-auto">{logoutButton}</div>
    </div>
  );
}

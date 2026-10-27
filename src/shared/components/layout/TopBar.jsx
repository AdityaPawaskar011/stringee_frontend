import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Menu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  selectIsAdmin,
  selectIntegrations,
  selectIsWhatsappAdmin,
  selectIsCompanyAdmin,
  selectIsPlatformAdmin,
  selectUser,
} from "@/features/auth/slices/authSlice";
import { useAutoDial } from "@/features/calls/hooks/useAutoDial";
import { useStringeeBrowserCall } from "@/features/calls/hooks/useStringeeBrowserCall";
import { useStringeeHealth } from "@/features/calls/hooks/useStringeeHealth";
import NotificationBell from "@/features/whatsapp/NotificationBell";
import { CompanySelector } from "@/shared/components/company/CompanyControls";
import BrandMark from "@/shared/components/BrandMark";

import DateRangePicker from "./DateRangePicker";
import DialNextButton from "./DialNextButton";
import MobileDrawer from "./MobileDrawer";
import { DATE_PICKER_HIDDEN_PATHS, findNavItem, getNavGroups } from "./navItems";

/**
 * Slim contextual bar: page title, global date filter, agent dial control,
 * notifications and the clock. Navigation itself lives in the sidebar.
 */
export default function TopBar() {
  const [now, setNow] = useState(new Date());
  const location = useLocation();

  // Tracking the route the drawer was opened on makes any navigation — including
  // an auto-dial jumping to /call — close it, with no syncing effect.
  const [drawerRoute, setDrawerRoute] = useState(null);
  const mobileOpen = drawerRoute === location.pathname;

  const user = useSelector(selectUser);
  const isAdmin = useSelector(selectIsAdmin);
  const isWhatsappAdmin = useSelector(selectIsWhatsappAdmin);
  const isCompanyAdmin = useSelector(selectIsCompanyAdmin);
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin);
  const integrations = useSelector(selectIntegrations);

  // Mounted once for the whole app — owns the auto-dial countdown.
  const dial = useAutoDial();
  // Places Stringee calls in this tab (browser dial mode). Mounted once, here.
  useStringeeBrowserCall();
  // Stringee up/down for the banner, and reconnects while it is down. Once, here.
  useStringeeHealth();

  const groups = useMemo(
    () => getNavGroups({ isAdmin, isWhatsappAdmin, isCompanyAdmin, isPlatformAdmin, integrations }),
    [isAdmin, isWhatsappAdmin, isCompanyAdmin, isPlatformAdmin, integrations]
  );
  const page = useMemo(
    () => findNavItem(groups, location.pathname),
    [groups, location.pathname]
  );
  const showDatePicker = !!user && !DATE_PICKER_HIDDEN_PATHS.includes(location.pathname);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Signed out (the login page) the page carries its own branding. The hooks
  // above still run, so nothing about dialling depends on the bar being visible.
  if (!user) return null;

  return (
    <>
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/70 backdrop-blur-xl
                         shadow-[inset_0_-1px_0_hsl(var(--brand-from)/0.08)]">
        <div className="flex h-full items-center gap-3 px-4">
          {user && (
            <button
              onClick={() => setDrawerRoute(location.pathname)}
              className="md:hidden p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-smooth active:scale-90"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* The sidebar carries the brand on desktop; show it here otherwise. */}
          <NavLink
            to={!user ? "/login" : isAdmin ? "/" : "/call"}
            className={`rounded-lg outline-none transition-opacity hover:opacity-90 active:opacity-80 ${
              user ? "md:hidden" : ""
            }`}
            aria-label="Go to home"
          >
            <BrandMark showWordmark={!user} role={null} />
          </NavLink>

          {user && page && (
            <div className="hidden md:block min-w-0 leading-tight">
              <h2 className="truncate text-[17px] font-semibold text-foreground">{page.name}</h2>
              {page.description && (
                <p className="truncate text-xs text-muted-foreground">{page.description}</p>
              )}
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <CompanySelector />
            {showDatePicker && <DateRangePicker className="hidden md:flex" />}

            {user && !isAdmin && (
              <DialNextButton
                onDial={dial.dialNow}
                nextDialIn={dial.nextDialIn}
                isDialing={dial.isDialing}
                isPaused={dial.isPaused}
                isAvailableLeads={dial.isAvailableLeads}
                disabled={dial.disabled}
              />
            )}

            {user && <NotificationBell />}

            <div className="hidden md:block text-right leading-tight">
              <div className="text-sm font-mono-nums">{format(now, "hh:mm:ss a")}</div>
              <div className="text-[11px] text-muted-foreground">
                {format(now, "EEEE, MMM d")}
              </div>
            </div>
          </div>
        </div>
      </header>

      {user && (
        <MobileDrawer
          open={mobileOpen}
          onClose={() => setDrawerRoute(null)}
          showDatePicker={showDatePicker}
          dial={dial}
        />
      )}
    </>
  );
}

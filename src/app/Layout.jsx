import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";

import { selectUser, setUser } from "@/features/auth/slices/authSlice";
import { useGetMeQuery } from "@/services";
import { applyBranding } from "@/shared/theme/branding";
import WhatsappNotifier from "@/features/whatsapp/WhatsappNotifier";
import Sidebar from "@/shared/components/layout/Sidebar";
import TopBar from "@/shared/components/layout/TopBar";
import StringeeStatusBanner from "@/features/calls/components/StringeeStatusBanner";
import { useSidebarCollapsed } from "@/shared/components/layout/useSidebarCollapsed";
import { CompanyGate, CompanyPromptHost } from "@/shared/components/company/CompanyControls";

export function Layout({ children }) {
  const user = useSelector(selectUser);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  // Signed in, the company comes from the server (the user's own account — the login
  // page is the same neutral one for everyone). applyBranding is a no-op when unchanged.
  const dispatch = useDispatch();
  const { data: me } = useGetMeQuery(undefined, { skip: !user });
  useEffect(() => {
    if (user && me?.branding) applyBranding(me.branding);
  }, [user, me]);
  // Keep the menu's view of the company's integrations current (it is also set at login).
  useEffect(() => {
    if (!user || !me?.integrations) return;
    const canManageSettings = !!me.can_manage_settings;
    const isPlatformAdmin = !!me.is_platform_admin;
    const companies = me.companies || [];
    if (JSON.stringify(me.integrations) !== JSON.stringify(user.integrations)
        || canManageSettings !== !!user.canManageSettings
        || isPlatformAdmin !== !!user.isPlatformAdmin
        || JSON.stringify(companies) !== JSON.stringify(user.companies || [])) {
      dispatch(setUser({ ...user, integrations: me.integrations, canManageSettings, isPlatformAdmin, companies }));
    }
  }, [user, me, dispatch]);

  // Mirrors the fixed sidebar's width. Both classes are literals so Tailwind
  // emits them; the sidebar is absent (and the padding zero) when signed out.
  const contentOffset = !user ? "" : collapsed ? "md:pl-[4.5rem]" : "md:pl-64";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {user && <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />}
      <WhatsappNotifier />
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3500,
          style: {
            background: "hsl(var(--card))",
            color: "hsl(var(--foreground))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.625rem",
            fontSize: "13px",
            padding: "10px 14px",
            boxShadow: "0 12px 40px -8px rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
          },
          success: {
            iconTheme: {
              primary: "hsl(158 100% 41%)",
              secondary: "hsl(var(--card))",
            },
          },
          error: {
            iconTheme: {
              primary: "hsl(0 100% 64%)",
              secondary: "hsl(var(--card))",
            },
          },
        }}
      />

      <div className={`transition-[padding] duration-200 ${contentOffset}`}>
        <TopBar />
        <StringeeStatusBanner />
        {/* Signed out = the login page, which is full-bleed. */}
        <main className={user ? "min-h-full px-4 py-4" : "min-h-screen"}>
          {user ? <CompanyGate>{children}</CompanyGate> : children}
        </main>
        {user && <CompanyPromptHost />}
      </div>
    </div>
  );
}

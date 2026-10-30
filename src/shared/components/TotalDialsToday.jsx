import React from 'react';
import { Users, Headphones, Clock, PhoneIncoming, PauseCircle, Phone, Loader } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { OverviewCard } from '@/features/dashboard/components/OverviewCard';
import { useGetMetaLeadStatsQuery, useGetTotalDialsTodayQuery } from '@/services';
import { selectIsAdmin } from '@/features/auth/slices/authSlice';
import BreakMenu from '@/features/calls/components/BreakMenu';
import { SkeletonOverviewCard } from '@/shared/components/ui';

const TotalDialsToday = () => {
  const isAdmin = useSelector(selectIsAdmin);
  const { data: TodaysDialsData, isLoading } = useGetTotalDialsTodayQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true,
  });
  const { data: metaLeadData, isLoading: metaLoading } =
  useGetMetaLeadStatsQuery(undefined, {
    pollingInterval: 30000,
    skipPollingIfUnfocused: true,
  });
  const location = useLocation();
  const isCallPage = location.pathname === "/call";

  const {
    total_dials,
    connected_calls,
    connection_rate_pct,
    total_talk_time,
    avg_talk_time_sec,
  } = TodaysDialsData?.data?.[0] || {};
  const {
    total_leads,
    called_leads,
    pending_leads,
  } = metaLeadData || {};

  const kpis = [
    { label: 'Total Dials Today', value: total_dials, icon: PhoneIncoming, trend: '+16%', color: 'blue' },
    { label: 'Connected Calls', value: connected_calls, icon: Clock, trend: 'queue', color: 'amber' },
    { label: 'Connection Rate(%)', value: connection_rate_pct, icon: Clock, trend: 'stable', color: 'slate' },
    { label: 'Total Talk Time', value: total_talk_time, icon: Users, trend: 'total seats', color: 'blue' },
    { label: 'Avg Talk Time Sec', value: avg_talk_time_sec, icon: Headphones, trend: 'handling customers', color: 'blue' },
    { label: 'Total META Leads', value: total_leads, icon: Users, trend: 'meta', color: 'blue' },
    { label: 'Called META Leads', value: called_leads, icon: Phone, trend: 'progress', color: 'green' },
    { label: 'Pending META Leads', value: pending_leads, icon: PauseCircle, trend: 'remaining', color: 'red' },
  ];
  const isBusy = isLoading || metaLoading;

  return (
    <div
      className={
        isCallPage
          ? `relative overflow-hidden rounded-2xl border border-white/10
           bg-gradient-to-b from-slate-900/70 to-slate-950/80
           shadow-[0_30px_120px_rgba(0,0,0,0.55)]
           p-2 max-w-[1440px] animate-fade-in-up`
          : `p-2 max-w-[1440px] border border-border rounded-lg bg-card/60 animate-fade-in-up`
      }
    >
      {isCallPage && (
        <div className="pointer-events-none absolute inset-0 opacity-70 bg-[radial-gradient(700px_circle_at_15%_0%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(700px_circle_at_90%_10%,rgba(168,85,247,0.14),transparent_55%)]" />
      )}

      <div className="relative">
        <div className="flex justify-between items-center m-2 lg:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Total Dials Today
          </h2>
          {/* Break / Resume is the agent's state on the server (/agent/state). */}
          {!isAdmin && <BreakMenu />}
        </div>

        {/* Columns follow the CARD's width, not the screen's: on the dashboard this
            card is only ~2/3 of the page, so xl:grid-cols-4 at a 1280px screen
            (Nest Hub Max) squeezed four 200px-minimum tiles into ~650px and the
            whole page scrolled sideways. As many 9.5rem tiles as fit, max 4. */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(max(9.5rem,calc((100%_-_1.5rem)/4)),1fr))] gap-2 stagger-children">
          {isBusy
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonOverviewCard key={i} />)
            : kpis.map(({ label, value, icon, trend, color }) => (
                <OverviewCard
                  key={label}
                  label={label}
                  value={value}
                  icon={icon}
                  trend={trend}
                  color={color}
                />
              ))}
        </div>
      </div>
    </div>
  );
};

export default TotalDialsToday;

// One card of Settings → Call Quality.
export default function CallQualitySection({ icon, title, subtitle, children }) {
  const Icon = icon;
  return (
    <section className="rounded-xl border border-border bg-card/60 p-4 md:p-5 space-y-4">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg border border-primary/20 bg-primary/10 grid place-items-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

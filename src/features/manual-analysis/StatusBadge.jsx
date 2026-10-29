import { STATUS } from './status';

export default function StatusBadge({ status }) {
  const s = STATUS[status] ?? { label: status || '—', cls: 'border-border text-muted-foreground' };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  );
}

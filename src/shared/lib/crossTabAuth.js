// Every tab of one browser shares one localStorage, so they share one sign-in.
// When another tab signs in as someone else (e.g. a user of another company) or
// signs out, this tab would keep showing the old login's screens and cached data
// while its next API calls already go out with the new token — two companies'
// data mixed on one page. Reload instead, so the tab follows the new sign-in.
// (To work as two companies side by side, use two browsers or a private window.)

const identity = (raw) => {
  try {
    const u = raw ? JSON.parse(raw) : null;
    if (!u) return '';
    return [u.user, u.tenant?.slug, u.campaign_id].map((v) => String(v ?? '').toLowerCase()).join('|');
  } catch {
    return '';
  }
};

export function installCrossTabAuthSync() {
  window.addEventListener('storage', (e) => {
    // key === null: another tab cleared localStorage entirely.
    if (e.key !== 'user' && e.key !== null) return;
    const before = identity(e.oldValue);
    const after = identity(e.key === null ? null : e.newValue);
    // Same login (token refresh, integrations sync) — nothing to follow.
    if (before === after) return;
    window.location.reload();
  });
}

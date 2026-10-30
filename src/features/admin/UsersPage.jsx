import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { KeyRound, Pencil, Plus, Search, Users } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import { selectUser } from '@/features/auth/slices/authSlice';
import Modal from '@/features/email-templates/components/Modal';
import {
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useSetAdminUserPasswordMutation,
  useGetAdminCampaignsQuery,
} from '@/services';
import { Card, CheckList, Field, Pill, Table } from './ui';
import { apiError, buttonClass, fmtDateTime, ghostButtonClass, inputClass } from './lib';

// Dialer setup → Users (api/routers/admin.py /admin/users): the company's logins,
// their role, the campaigns they may dial and the StringeeX agent they ring through.

const ROLES = [
  { value: 'agent', label: 'Agent' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Admin' },
];
const MIN_PASSWORD = 8;

const blank = {
  username: '', full_name: '', role: 'agent', password: '', is_active: true,
  campaign_ids: [], stringee_user_id: '', phone_number: '',
};

function UserForm({ user, campaigns, onDone }) {
  const { success, error } = useToast();
  const [createUser, { isLoading: creating }] = useCreateAdminUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateAdminUserMutation();
  const isNew = !user;
  // The admin's own login: no deactivating, demoting or renaming it (the API refuses
  // that too — the session in use would lock itself out).
  const me = useSelector(selectUser);
  const isSelf = !isNew && !!me?.user && user.username.toLowerCase() === String(me.user).toLowerCase();
  const selfHint = isSelf ? 'You cannot change this on your own login' : undefined;
  const [form, setForm] = useState(() => (user ? {
    ...blank, ...user,
    full_name: user.full_name || '', stringee_user_id: user.stringee_user_id || '',
    phone_number: user.phone_number || '', campaign_ids: user.campaign_ids || [],
  } : blank));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      full_name: form.full_name.trim(),
      role: form.role,
      is_active: form.is_active,
      campaign_ids: form.campaign_ids,
      stringee_user_id: form.stringee_user_id.trim() || null,
      phone_number: form.phone_number.trim() || null,
    };
    try {
      if (isNew) {
        await createUser({
          username: form.username.trim(), password: form.password,
          full_name: body.full_name, role: body.role,
        }).unwrap();
        success(`Login ${form.username.trim()} created`);
      } else {
        await updateUser({ id: user.id, ...body, username: form.username.trim() }).unwrap();
        success(`${form.username.trim()} saved`);
      }
      onDone();
    } catch (err) { error(apiError(err, 'Could not save the login')); }
  };

  const options = campaigns.map((c) => ({ id: c.id, label: c.name, hint: c.is_active ? c.code : `${c.code} · off` }));
  const valid = form.username.trim() && (!isNew || form.password.length >= MIN_PASSWORD);

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Username" hint={selfHint}>
          <input className={`${inputClass} disabled:opacity-50`} value={form.username} maxLength={50} autoComplete="off"
            onChange={set('username')} placeholder="e.g. 8016" disabled={isSelf} />
        </Field>
        <Field label="Full name">
          <input className={inputClass} value={form.full_name} maxLength={100} onChange={set('full_name')} />
        </Field>
        <Field label="Role" hint={selfHint}>
          <select className={`${inputClass} disabled:opacity-50`} value={form.role} onChange={set('role')} disabled={isSelf}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        {isNew ? (
          <Field label="Password" hint={`At least ${MIN_PASSWORD} characters`}>
            <input className={inputClass} type="password" value={form.password} autoComplete="new-password"
              onChange={set('password')} />
          </Field>
        ) : (
          <Field label="Status" hint={selfHint}>
            <label className={`flex items-center gap-2 py-2 text-sm text-foreground ${isSelf ? 'opacity-50' : ''}`}>
              <input type="checkbox" checked={form.is_active} disabled={isSelf}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Active (can sign in)
            </label>
          </Field>
        )}
        {/* Softphone, phone and campaigns are mapped later, from Edit. */}
        {!isNew && (
          <>
            <Field label="StringeeX agent id" hint="The softphone this login's calls ring">
              <input className={inputClass} value={form.stringee_user_id} maxLength={64} onChange={set('stringee_user_id')} />
            </Field>
            <Field label="Phone number" hint="Rung instead when there is no StringeeX agent">
              <input className={inputClass} value={form.phone_number} maxLength={20} onChange={set('phone_number')} />
            </Field>
          </>
        )}
      </div>
      {!isNew && (
        <Field label="Campaigns this login may dial">
          <CheckList options={options} value={form.campaign_ids} onChange={set('campaign_ids')}
            empty="No campaigns yet: create one on Dialer setup → Campaigns" />
        </Field>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={onDone}>Cancel</button>
        <button type="submit" className={buttonClass} disabled={!valid || creating || updating}>
          {isNew ? 'Create login' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function PasswordForm({ user, onDone }) {
  const { success, error } = useToast();
  const [setPassword, { isLoading }] = useSetAdminUserPasswordMutation();
  const [password, setValue] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try {
      await setPassword({ id: user.id, password }).unwrap();
      success(`New password set for ${user.username}`);
      onDone();
    } catch (err) { error(apiError(err, 'Could not set the password')); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={`New password for ${user.username}`} hint={`At least ${MIN_PASSWORD} characters`}>
        <input className={inputClass} type="password" value={password} autoComplete="new-password"
          onChange={(e) => setValue(e.target.value)} autoFocus />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={onDone}>Cancel</button>
        <button type="submit" className={buttonClass} disabled={password.length < MIN_PASSWORD || isLoading}>Set password</button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('true');
  const params = useMemo(() => ({
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(role ? { role } : {}),
    ...(active ? { active } : {}),
  }), [q, role, active]);
  const { data, isLoading, isFetching } = useGetAdminUsersQuery(params);
  const { data: campaignData } = useGetAdminCampaignsQuery();
  const campaigns = useMemo(() => campaignData?.rows ?? [], [campaignData]);
  const campaignName = useMemo(() => Object.fromEntries(campaigns.map((c) => [c.id, c.name])), [campaigns]);
  const rows = data?.rows ?? [];

  const [editing, setEditing] = useState(null);      // null | 'new' | user
  const [passwordFor, setPasswordFor] = useState(null);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card icon={Users} title="Users" subtitle="Your company's logins, their campaigns and softphones"
        actions={<button type="button" className={buttonClass} onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> New login</button>}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input className={`${inputClass} pl-9`} value={q} placeholder="Search username or name"
              onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className={`${inputClass} w-auto`} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Every role</option>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <select className={`${inputClass} w-auto`} value={active} onChange={(e) => setActive(e.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
            <option value="">Everyone</option>
          </select>
          {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>

        <Table head={['Username', 'Name', 'Role', 'Campaigns', 'StringeeX / phone', 'Last login', 'Status', '']}
          empty={!isLoading && !rows.length ? 'No logins match' : null}>
          {rows.map((u) => (
            <tr key={u.id} className="hover:bg-secondary/20">
              <td className="px-3 py-2 font-semibold text-foreground">{u.username}</td>
              <td className="px-3 py-2 text-muted-foreground">{u.full_name || '—'}</td>
              <td className="px-3 py-2 capitalize">{u.role}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {u.campaign_ids?.length ? u.campaign_ids.map((id) => campaignName[id] || `#${id}`).join(', ') : '—'}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{u.stringee_user_id || u.phone_number || '—'}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(u.last_login_at)}</td>
              <td className="px-3 py-2"><Pill on={u.is_active} /></td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-2">
                  <button type="button" className={ghostButtonClass} onClick={() => setEditing(u)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button type="button" className={ghostButtonClass} onClick={() => setPasswordFor(u)}>
                    <KeyRound className="w-3.5 h-3.5" /> Password
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={!!editing} wide onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New login' : `Edit ${editing?.username ?? ''}`}>
        {editing && (
          <UserForm key={editing === 'new' ? 'new' : editing.id} user={editing === 'new' ? null : editing}
            campaigns={campaigns} onDone={() => setEditing(null)} />
        )}
      </Modal>
      <Modal open={!!passwordFor} onClose={() => setPasswordFor(null)} title="Reset password">
        {passwordFor && <PasswordForm user={passwordFor} onDone={() => setPasswordFor(null)} />}
      </Modal>
    </div>
  );
}

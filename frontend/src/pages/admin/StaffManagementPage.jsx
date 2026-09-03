import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { api, ApiError } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import { Modal } from '../../components/admin/Modal.jsx';
import './StaffManagementPage.css';

const EMPTY_FORM = { email: '', name: '', role: 'staff', password: '' };

export default function StaffManagementPage() {
  usePageTitle('Staff');
  const { user } = useAuth();
  const { data: users, status, error, refetch } = useApiQuery('/api/admin/users');

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [rowError, setRowError] = useState(null);

  if (user?.role === 'staff') {
    return (
      <div className="container">
        <ErrorState title="Access restricted" message="Staff management is only available to owners and managers." />
      </div>
    );
  }

  if (status === 'loading') return <LoadingState label="Loading staff…" />;
  if (status === 'error') return <ErrorState onRetry={refetch} />;

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/api/admin/users', form);
      setCreating(false);
      setForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not create this account.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(target) {
    setRowError(null);
    try {
      await api.patch(`/api/admin/users/${target.id}/active`, { isActive: !target.isActive });
      refetch();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : 'Could not update this account.');
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.patch(`/api/admin/users/${resetTarget.id}/password`, { password: newPassword });
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not reset the password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="staff-page">
      <header className="staff-page__header">
        <h1>Staff Accounts</h1>
        <button type="button" className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setFormError(null); setCreating(true); }}>
          New Account
        </button>
      </header>

      {rowError && <div className="staff-page__error">{rowError}</div>}
      {error && <div className="staff-page__error">{error.message}</div>}

      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td className="dashboard-table__capitalize">{u.role}</td>
                <td>
                  <span className={`badge ${u.isActive ? 'badge-success' : 'badge-neutral'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="staff-page__row-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setResetTarget(u); setNewPassword(''); setFormError(null); }}>
                    Reset Password
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={u.id === user?.id}
                    title={u.id === user?.id ? 'You cannot deactivate your own account' : undefined}
                    onClick={() => toggleActive(u)}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <Modal title="New Staff Account" onClose={() => setCreating(false)}>
          <form onSubmit={handleCreate} className="staff-form">
            {formError && <div className="staff-form__error">{formError}</div>}
            <div className="field">
              <label htmlFor="staff-name">Name</label>
              <input id="staff-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="staff-email">Email</label>
              <input id="staff-email" className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="staff-role">Role</label>
              <select id="staff-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="staff">Staff</option>
                {user?.role === 'owner' && <option value="admin">Manager (Admin)</option>}
                {user?.role === 'owner' && <option value="owner">Owner</option>}
              </select>
            </div>
            <div className="field">
              <label htmlFor="staff-password">Temporary Password</label>
              <input id="staff-password" className="input" type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <span className="field-hint">Share this with the staff member — they can change it after logging in.</span>
            </div>
            <div className="staff-form__actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create Account'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetTarget && (
        <Modal title={`Reset Password — ${resetTarget.name}`} onClose={() => setResetTarget(null)}>
          <form onSubmit={handleResetPassword} className="staff-form">
            {formError && <div className="staff-form__error">{formError}</div>}
            <div className="field">
              <label htmlFor="new-password">New Password</label>
              <input id="new-password" className="input" type="text" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="staff-form__actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Set New Password'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setResetTarget(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { api, ApiError } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import { Modal } from '../../components/admin/Modal.jsx';
import './CategoryManagementPage.css';

const EMPTY_FORM = { name: '', description: '', isSignature: false };

export default function CategoryManagementPage() {
  usePageTitle('Categories');
  const { user } = useAuth();
  const canManage = user?.role === 'owner' || user?.role === 'admin';
  const { data: categories, status, refetch } = useApiQuery('/api/admin/categories');

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...cat} = editing
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing({});
  }

  function openEdit(cat) {
    setForm({ name: cat.name, description: cat.description, isSignature: Boolean(cat.isSignature) });
    setFormError(null);
    setEditing(cat);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing?.id) {
        await api.patch(`/api/admin/categories/${editing.id}`, form);
      } else {
        await api.post('/api/admin/categories', form);
      }
      setEditing(null);
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save this category.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat) {
    await api.patch(`/api/admin/categories/${cat.id}/active`, { isActive: !cat.isActive });
    refetch();
  }

  async function move(cat, direction) {
    const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((c) => c.id === cat.id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= ordered.length) return;
    [ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]];
    await api.patch('/api/admin/categories/reorder', { order: ordered.map((c) => c.id) });
    refetch();
  }

  if (status === 'loading') return <LoadingState label="Loading categories…" />;
  if (status === 'error') return <ErrorState onRetry={refetch} />;

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="category-page">
      <header className="category-page__header">
        <h1>Categories</h1>
        {canManage && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            New Category
          </button>
        )}
      </header>

      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Signature</th>
              <th>Status</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((cat, index) => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.isSignature ? <span className="badge badge-amber">Signature</span> : '—'}</td>
                <td>
                  <span className={`badge ${cat.isActive ? 'badge-success' : 'badge-neutral'}`}>
                    {cat.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {canManage && (
                  <td className="category-page__actions">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => move(cat, 'up')} aria-label={`Move ${cat.name} up`}>
                      ↑
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={index === sorted.length - 1} onClick={() => move(cat, 'down')} aria-label={`Move ${cat.name} down`}>
                      ↓
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(cat)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleActive(cat)}>
                      {cat.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== null && (
        <Modal title={editing.id ? 'Edit Category' : 'New Category'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="category-form">
            {formError && <div className="category-form__error">{formError}</div>}
            <div className="field">
              <label htmlFor="cat-name">Name</label>
              <input id="cat-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="cat-description">Description</label>
              <textarea id="cat-description" className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <label className="category-form__checkbox">
              <input type="checkbox" checked={form.isSignature} onChange={(e) => setForm({ ...form, isSignature: e.target.checked })} />
              Signature category (featured prominently on the homepage)
            </label>
            <div className="category-form__actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Category'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

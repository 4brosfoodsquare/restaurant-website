import { useMemo, useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { api, ApiError } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMoney, isPriced } from '../../lib/money.js';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import { Modal } from '../../components/admin/Modal.jsx';
import './MenuManagementPage.css';

const EMPTY_FORM = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  imageUrl: '',
  dietType: 'unspecified',
  spiceLevel: 0,
  isFeatured: false,
  isPopular: false,
  isAvailable: true,
};

function itemToForm(item) {
  return {
    categoryId: String(item.categoryId),
    name: item.name,
    description: item.description,
    price: (item.priceMinor / 100).toString(),
    imageUrl: item.imageUrl ?? '',
    dietType: item.dietType,
    spiceLevel: item.spiceLevel,
    isFeatured: Boolean(item.isFeatured),
    isPopular: Boolean(item.isPopular),
    isAvailable: Boolean(item.isAvailable),
  };
}

export default function MenuManagementPage() {
  usePageTitle('Menu Management');
  const { user } = useAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'admin';

  const [statusFilter, setStatusFilter] = useState('active');
  const categories = useApiQuery('/api/admin/categories');
  const queryString = useMemo(() => `?status=${statusFilter}`, [statusFilter]);
  const menu = useApiQuery(`/api/admin/menu${queryString}`, [queryString]);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing({});
  }

  function openEdit(item) {
    setForm(itemToForm(item));
    setFormError(null);
    setEditing(item);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFormError(null);
    try {
      const body = new FormData();
      body.append('image', file);
      const result = await api.post('/api/admin/uploads/image', body);
      setForm((prev) => ({ ...prev, imageUrl: result.url }));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not upload the image.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const priceMinor = Math.round(Number.parseFloat(form.price) * 100);
    if (!Number.isFinite(priceMinor) || priceMinor < 0) {
      setFormError('Enter a valid price.');
      setSaving(false);
      return;
    }

    const payload = {
      categoryId: Number(form.categoryId),
      name: form.name,
      description: form.description,
      priceMinor,
      imageUrl: form.imageUrl || null,
      dietType: form.dietType,
      spiceLevel: Number(form.spiceLevel),
      isFeatured: form.isFeatured,
      isPopular: form.isPopular,
      isAvailable: form.isAvailable,
    };

    try {
      if (editing?.id) {
        await api.patch(`/api/admin/menu/${editing.id}`, payload);
      } else {
        await api.post('/api/admin/menu', payload);
      }
      setEditing(null);
      menu.refetch();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR') {
        const firstError = Object.values(err.details?.fieldErrors ?? {})[0]?.[0];
        setFormError(firstError || 'Please check the form and try again.');
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Could not save this item.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item) {
    await api.patch(`/api/admin/menu/${item.id}/availability`, { isAvailable: !item.isAvailable });
    menu.refetch();
  }

  async function toggleActive(item) {
    await api.patch(`/api/admin/menu/${item.id}/active`, { isActive: !item.isActive });
    menu.refetch();
  }

  return (
    <div className="menu-mgmt-page">
      <header className="menu-mgmt-page__header">
        <h1>Menu</h1>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={openCreate} disabled={categories.status !== 'success'}>
            New Item
          </button>
        )}
      </header>

      <div className="menu-mgmt-page__tabs">
        {['active', 'inactive', 'all'].map((s) => (
          <button key={s} type="button" className={`chip ${statusFilter === s ? 'chip--active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'active' ? 'Active' : s === 'inactive' ? 'Discontinued' : 'All'}
          </button>
        ))}
      </div>

      {menu.status === 'loading' && <LoadingState label="Loading menu…" />}
      {menu.status === 'error' && <ErrorState onRetry={menu.refetch} />}
      {menu.status === 'success' && (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Available</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menu.data.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.categoryName}</td>
                  {/* The storefront says "Price on request" for an unpriced dish;
                      here the owner needs the opposite emphasis — "₹0" looks like a
                      decision already made, "Not set" looks like the job it is. */}
                  <td>
                    {isPriced(item.priceMinor)
                      ? formatMoney(item.priceMinor)
                      : <span className="admin-table__unset">Not set</span>}
                  </td>
                  <td>
                    <button type="button" className={`badge ${item.isAvailable ? 'badge-success' : 'badge-neutral'} menu-mgmt-page__toggle`} onClick={() => toggleAvailability(item)}>
                      {item.isAvailable ? 'Available' : 'Sold Out'}
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${item.isActive ? 'badge-info' : 'badge-danger'}`}>{item.isActive ? 'Active' : 'Discontinued'}</span>
                  </td>
                  {canEdit ? (
                    <td className="menu-mgmt-page__actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => toggleActive(item)}>
                        {item.isActive ? 'Discontinue' : 'Reactivate'}
                      </button>
                    </td>
                  ) : (
                    <td>—</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && categories.status === 'success' && (
        <Modal title={editing.id ? 'Edit Menu Item' : 'New Menu Item'} onClose={() => setEditing(null)}>
          <form onSubmit={handleSave} className="menu-item-form">
            {formError && <div className="menu-item-form__error">{formError}</div>}

            <div className="field">
              <label htmlFor="item-name">Name</label>
              <input id="item-name" className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="field">
              <label htmlFor="item-category">Category</label>
              <select id="item-category" className="select" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="" disabled>
                  Select a category
                </option>
                {categories.data.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="item-description">Description</label>
              <textarea id="item-description" className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="menu-item-form__row">
              <div className="field">
                <label htmlFor="item-price">Price (₹)</label>
                <input id="item-price" className="input" type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="item-spice">Spice Level</label>
                <select id="item-spice" className="select" value={form.spiceLevel} onChange={(e) => setForm({ ...form, spiceLevel: e.target.value })}>
                  <option value={0}>Not spicy</option>
                  <option value={1}>Mild</option>
                  <option value={2}>Medium</option>
                  <option value={3}>Hot</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="item-diet">Dietary Type</label>
              <select id="item-diet" className="select" value={form.dietType} onChange={(e) => setForm({ ...form, dietType: e.target.value })}>
                <option value="unspecified">Not specified</option>
                <option value="veg">Vegetarian</option>
                <option value="non_veg">Non-Vegetarian</option>
                <option value="egg">Contains Egg</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="item-image">Photo</label>
              <input id="item-image" className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} disabled={uploading} />
              {uploading && <span className="field-hint">Uploading…</span>}
              {form.imageUrl && (
                <div className="menu-item-form__preview">
                  <img src={form.imageUrl} alt="Preview" />
                </div>
              )}
            </div>

            <div className="menu-item-form__checkboxes">
              <label>
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                Featured
              </label>
              <label>
                <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm({ ...form, isPopular: e.target.checked })} />
                Popular
              </label>
              <label>
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
                Available today
              </label>
            </div>

            <div className="menu-item-form__actions">
              <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                {saving ? 'Saving…' : 'Save Item'}
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

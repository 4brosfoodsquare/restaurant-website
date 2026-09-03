import { useEffect, useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { api, ApiError } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import './SettingsPage.css';

const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

export default function SettingsPage() {
  usePageTitle('Settings');
  const { user } = useAuth();
  const canEdit = user?.role === 'owner' || user?.role === 'admin';
  const { data: settings, status, refetch } = useApiQuery('/api/admin/settings');

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  if (status === 'loading' || !form) return <LoadingState label="Loading settings…" />;
  if (status === 'error') return <ErrorState onRetry={refetch} />;

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateHours(day, value) {
    setForm((prev) => ({ ...prev, hours: { ...prev.hours, [day]: value } }));
  }

  function toggleOrderType(type) {
    setForm((prev) => {
      const set = new Set(prev.orderTypesEnabled);
      if (set.has(type)) set.delete(type);
      else set.add(type);
      return { ...prev, orderTypesEnabled: [...set] };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await api.patch('/api/admin/settings', {
        ...form,
        deliveryFeeMinor: Math.round(Number(form.deliveryFeeMinor)),
        taxRateBps: Math.round(Number(form.taxRateBps)),
        minOrderMinor: Math.round(Number(form.minOrderMinor)),
      });
      setForm(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1>Restaurant Settings</h1>
        {!canEdit && <p className="settings-page__readonly-note">You have read-only access to settings.</p>}
      </header>

      <form onSubmit={handleSubmit} className="settings-form">
        <fieldset disabled={!canEdit || saving}>
          <section className="settings-form__section">
            <h2>Basics</h2>
            <div className="field">
              <label htmlFor="restaurantName">Restaurant Name</label>
              <input id="restaurantName" className="input" value={form.restaurantName} onChange={(e) => update('restaurantName', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="tagline">Tagline</label>
              <input id="tagline" className="input" value={form.tagline} onChange={(e) => update('tagline', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea id="description" className="textarea" value={form.description} onChange={(e) => update('description', e.target.value)} />
            </div>
          </section>

          <section className="settings-form__section">
            <h2>Contact &amp; Address</h2>
            <div className="settings-form__row">
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="addressLine1">Address Line 1</label>
              <input id="addressLine1" className="input" value={form.addressLine1} onChange={(e) => update('addressLine1', e.target.value)} />
            </div>
            <div className="settings-form__row">
              <div className="field">
                <label htmlFor="addressLine2">Address Line 2</label>
                <input id="addressLine2" className="input" value={form.addressLine2} onChange={(e) => update('addressLine2', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="addressPostcode">Postcode</label>
                <input id="addressPostcode" className="input" value={form.addressPostcode} onChange={(e) => update('addressPostcode', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="settings-form__section">
            <h2>Opening Hours</h2>
            <div className="settings-form__hours">
              {Object.entries(DAY_LABELS).map(([key, label]) => (
                <div className="field" key={key}>
                  <label htmlFor={`hours-${key}`}>{label}</label>
                  <input
                    id={`hours-${key}`}
                    className="input"
                    placeholder="11:00-22:30 or closed"
                    value={form.hours?.[key] ?? ''}
                    onChange={(e) => updateHours(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="settings-form__section">
            <h2>Ordering</h2>
            <div className="settings-form__checkboxes">
              <label>
                <input type="checkbox" checked={form.orderTypesEnabled.includes('pickup')} onChange={() => toggleOrderType('pickup')} />
                Pickup enabled
              </label>
              <label>
                <input type="checkbox" checked={form.orderTypesEnabled.includes('delivery')} onChange={() => toggleOrderType('delivery')} />
                Delivery enabled
              </label>
            </div>
            <div className="settings-form__row settings-form__row--three">
              <div className="field">
                <label htmlFor="deliveryFeeMinor">Delivery Fee (paise)</label>
                <input id="deliveryFeeMinor" className="input" type="number" min="0" value={form.deliveryFeeMinor} onChange={(e) => update('deliveryFeeMinor', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="taxRateBps">Tax Rate (basis points)</label>
                <input id="taxRateBps" className="input" type="number" min="0" max="10000" value={form.taxRateBps} onChange={(e) => update('taxRateBps', e.target.value)} />
                <span className="field-hint">500 = 5%</span>
              </div>
              <div className="field">
                <label htmlFor="minOrderMinor">Minimum Order (paise)</label>
                <input id="minOrderMinor" className="input" type="number" min="0" value={form.minOrderMinor} onChange={(e) => update('minOrderMinor', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="settings-form__section">
            <h2>Social Links</h2>
            <div className="settings-form__row">
              <div className="field">
                <label htmlFor="socialInstagram">Instagram URL</label>
                <input id="socialInstagram" className="input" value={form.socialInstagram} onChange={(e) => update('socialInstagram', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="socialFacebook">Facebook URL</label>
                <input id="socialFacebook" className="input" value={form.socialFacebook} onChange={(e) => update('socialFacebook', e.target.value)} />
              </div>
            </div>
          </section>

          {canEdit && (
            <div className="settings-form__actions">
              {saveError && <span className="settings-form__error">{saveError}</span>}
              {saved && <span className="settings-form__saved">Saved.</span>}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          )}
        </fieldset>
      </form>
    </div>
  );
}

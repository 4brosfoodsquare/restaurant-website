import { getAllSettings, setManySettings } from './settings.repository.js';

const DEFAULT_HOURS = { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' };

function safeJsonParse(value, fallback) {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toIntOrZero(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Maps the raw settings key/value rows onto a typed, camelCase API shape. */
export function getPublicSettings() {
  const raw = getAllSettings();
  return {
    restaurantName: raw.restaurant_name ?? '',
    tagline: raw.tagline ?? '',
    description: raw.description ?? '',
    phone: raw.phone ?? '',
    email: raw.email ?? '',
    addressLine1: raw.address_line1 ?? '',
    addressLine2: raw.address_line2 ?? '',
    addressPostcode: raw.address_postcode ?? '',
    hours: { ...DEFAULT_HOURS, ...safeJsonParse(raw.hours, {}) },
    orderTypesEnabled: safeJsonParse(raw.order_types_enabled, ['pickup', 'delivery']),
    deliveryFeeMinor: toIntOrZero(raw.delivery_fee_minor),
    taxRateBps: toIntOrZero(raw.tax_rate_bps),
    minOrderMinor: toIntOrZero(raw.min_order_minor),
    socialInstagram: raw.social_instagram ?? '',
    socialFacebook: raw.social_facebook ?? '',
  };
}

// Admin sees exactly the same shape today; kept as a separate export so the
// admin view can diverge later (e.g. internal-only fields) without the
// public route accidentally inheriting them.
export function getAdminSettings() {
  return getPublicSettings();
}

const FIELD_TO_KEY = {
  restaurantName: 'restaurant_name',
  tagline: 'tagline',
  description: 'description',
  phone: 'phone',
  email: 'email',
  addressLine1: 'address_line1',
  addressLine2: 'address_line2',
  addressPostcode: 'address_postcode',
  socialInstagram: 'social_instagram',
  socialFacebook: 'social_facebook',
};
const JSON_FIELD_TO_KEY = { hours: 'hours', orderTypesEnabled: 'order_types_enabled' };
const INT_FIELD_TO_KEY = { deliveryFeeMinor: 'delivery_fee_minor', taxRateBps: 'tax_rate_bps', minOrderMinor: 'min_order_minor' };

export function updateSettings(patch) {
  const entries = {};

  for (const [field, key] of Object.entries(FIELD_TO_KEY)) {
    if (patch[field] !== undefined) entries[key] = patch[field];
  }
  for (const [field, key] of Object.entries(JSON_FIELD_TO_KEY)) {
    if (patch[field] !== undefined) {
      const merged = field === 'hours' ? { ...getPublicSettings().hours, ...patch[field] } : patch[field];
      entries[key] = JSON.stringify(merged);
    }
  }
  for (const [field, key] of Object.entries(INT_FIELD_TO_KEY)) {
    if (patch[field] !== undefined) entries[key] = String(patch[field]);
  }

  if (Object.keys(entries).length > 0) setManySettings(entries);
  return getAdminSettings();
}

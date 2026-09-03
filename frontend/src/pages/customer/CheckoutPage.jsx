import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useCart } from '../../context/CartContext.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import { api, ApiError } from '../../lib/apiClient.js';
import { formatMoney } from '../../lib/money.js';
import { EmptyState } from '../../components/shared/StateViews.jsx';
import './CheckoutPage.css';

function generateIdempotencyKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CheckoutPage() {
  usePageTitle('Checkout');
  const navigate = useNavigate();
  const { items, subtotalMinor, clearCart, removeItem } = useCart();
  const { settings } = useSettings();

  const orderTypesEnabled = settings?.orderTypesEnabled ?? ['pickup', 'delivery'];
  const [orderType, setOrderType] = useState(orderTypesEnabled[0] ?? 'pickup');
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    addressLine1: '',
    addressLine2: '',
    addressCity: '',
    addressPostcode: '',
    addressNotes: '',
    customerNotes: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [unavailableItems, setUnavailableItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(generateIdempotencyKey);

  const estimatedTax = useMemo(
    () => Math.round((subtotalMinor * (settings?.taxRateBps ?? 0)) / 10_000),
    [subtotalMinor, settings],
  );
  const estimatedDeliveryFee = orderType === 'delivery' ? settings?.deliveryFeeMinor ?? 0 : 0;
  const estimatedTotal = subtotalMinor + estimatedTax + estimatedDeliveryFee;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (items.length === 0) {
    return (
      <div className="container checkout-page">
        <EmptyState
          title="Your cart is empty"
          message="Add something to your cart before checking out."
          action={
            <Link to="/menu" className="btn btn-primary">
              Browse the Menu
            </Link>
          }
        />
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);
    setUnavailableItems([]);
    setSubmitting(true);

    const payload = {
      orderType,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      ...(form.customerEmail.trim() ? { customerEmail: form.customerEmail.trim() } : {}),
      customerNotes: form.customerNotes.trim(),
      idempotencyKey,
      items: items.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity })),
      ...(orderType === 'delivery'
        ? {
            addressLine1: form.addressLine1.trim(),
            addressLine2: form.addressLine2.trim(),
            addressCity: form.addressCity.trim(),
            addressPostcode: form.addressPostcode.trim(),
            addressNotes: form.addressNotes.trim(),
          }
        : {}),
    };

    try {
      const order = await api.post('/api/orders', payload);
      clearCart();
      navigate(`/order/confirmation/${order.trackingToken}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'VALIDATION_ERROR' && error.details?.fieldErrors) {
          setFieldErrors(error.details.fieldErrors);
          setSubmitError('Please fix the highlighted fields and try again.');
        } else if (error.code === 'ITEMS_UNAVAILABLE') {
          setUnavailableItems(error.details?.unavailable ?? []);
          setSubmitError('Some items in your cart are no longer available.');
        } else {
          setSubmitError(error.message || "We couldn't place your order. Please try again.");
        }
      } else {
        setSubmitError("We couldn't place your order. Please check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-page__grid">
        <form className="checkout-form" onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="checkout-form__error" role="alert">
              {submitError}
            </div>
          )}

          {unavailableItems.length > 0 && (
            <div className="checkout-form__unavailable" role="alert">
              <p>These items are no longer available — please remove them to continue:</p>
              <ul>
                {unavailableItems.map((u) => (
                  <li key={u.menuItemId}>
                    {u.name ?? `Item #${u.menuItemId}`}
                    <button type="button" className="link-button" onClick={() => removeItem(u.menuItemId)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {orderTypesEnabled.length > 1 && (
            <fieldset className="field">
              <legend>Order Type</legend>
              <div className="order-type-toggle" role="radiogroup">
                {orderTypesEnabled.includes('pickup') && (
                  <label className={orderType === 'pickup' ? 'active' : ''}>
                    <input type="radio" name="orderType" value="pickup" checked={orderType === 'pickup'} onChange={() => setOrderType('pickup')} />
                    Pickup
                  </label>
                )}
                {orderTypesEnabled.includes('delivery') && (
                  <label className={orderType === 'delivery' ? 'active' : ''}>
                    <input type="radio" name="orderType" value="delivery" checked={orderType === 'delivery'} onChange={() => setOrderType('delivery')} />
                    Delivery
                  </label>
                )}
              </div>
            </fieldset>
          )}

          <div className="field">
            <label htmlFor="customerName">Full name</label>
            <input
              id="customerName"
              className="input"
              required
              value={form.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              aria-invalid={Boolean(fieldErrors.customerName)}
            />
            {fieldErrors.customerName && <span className="field-error">{fieldErrors.customerName[0]}</span>}
          </div>

          <div className="field">
            <label htmlFor="customerPhone">Phone number</label>
            <input
              id="customerPhone"
              className="input"
              type="tel"
              required
              value={form.customerPhone}
              onChange={(e) => updateField('customerPhone', e.target.value)}
              aria-invalid={Boolean(fieldErrors.customerPhone)}
            />
            {fieldErrors.customerPhone && <span className="field-error">{fieldErrors.customerPhone[0]}</span>}
          </div>

          <div className="field">
            <label htmlFor="customerEmail">Email (optional)</label>
            <input
              id="customerEmail"
              className="input"
              type="email"
              value={form.customerEmail}
              onChange={(e) => updateField('customerEmail', e.target.value)}
              aria-invalid={Boolean(fieldErrors.customerEmail)}
            />
            {fieldErrors.customerEmail && <span className="field-error">{fieldErrors.customerEmail[0]}</span>}
          </div>

          {orderType === 'delivery' && (
            <>
              <div className="field">
                <label htmlFor="addressLine1">Address line 1</label>
                <input
                  id="addressLine1"
                  className="input"
                  required
                  value={form.addressLine1}
                  onChange={(e) => updateField('addressLine1', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.addressLine1)}
                />
                {fieldErrors.addressLine1 && <span className="field-error">{fieldErrors.addressLine1[0]}</span>}
              </div>
              <div className="field">
                <label htmlFor="addressLine2">Address line 2 (optional)</label>
                <input id="addressLine2" className="input" value={form.addressLine2} onChange={(e) => updateField('addressLine2', e.target.value)} />
              </div>
              <div className="checkout-form__row">
                <div className="field">
                  <label htmlFor="addressCity">City</label>
                  <input
                    id="addressCity"
                    className="input"
                    required
                    value={form.addressCity}
                    onChange={(e) => updateField('addressCity', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.addressCity)}
                  />
                  {fieldErrors.addressCity && <span className="field-error">{fieldErrors.addressCity[0]}</span>}
                </div>
                <div className="field">
                  <label htmlFor="addressPostcode">Postcode</label>
                  <input
                    id="addressPostcode"
                    className="input"
                    required
                    value={form.addressPostcode}
                    onChange={(e) => updateField('addressPostcode', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.addressPostcode)}
                  />
                  {fieldErrors.addressPostcode && <span className="field-error">{fieldErrors.addressPostcode[0]}</span>}
                </div>
              </div>
              <div className="field">
                <label htmlFor="addressNotes">Delivery notes (optional)</label>
                <input id="addressNotes" className="input" value={form.addressNotes} onChange={(e) => updateField('addressNotes', e.target.value)} />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="customerNotes">Order notes (optional)</label>
            <textarea
              id="customerNotes"
              className="textarea"
              value={form.customerNotes}
              onChange={(e) => updateField('customerNotes', e.target.value)}
              placeholder="Any special requests…"
            />
          </div>

          <p className="checkout-form__payment-note">
            No online payment is required yet — you'll pay {orderType === 'delivery' ? 'on delivery' : 'on collection'}.
          </p>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? 'Placing your order…' : `Place Order — ${formatMoney(estimatedTotal)}`}
          </button>
        </form>

        <aside className="checkout-summary card">
          <h2>Order Summary</h2>
          <ul className="checkout-summary__items">
            {items.map((line) => (
              <li key={line.menuItemId}>
                <span>
                  {line.quantity} × {line.name}
                </span>
                <span>{formatMoney(line.priceMinor * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="checkout-summary__row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotalMinor)}</span>
          </div>
          {estimatedTax > 0 && (
            <div className="checkout-summary__row">
              <span>Estimated tax</span>
              <span>{formatMoney(estimatedTax)}</span>
            </div>
          )}
          {orderType === 'delivery' && estimatedDeliveryFee > 0 && (
            <div className="checkout-summary__row">
              <span>Delivery fee</span>
              <span>{formatMoney(estimatedDeliveryFee)}</span>
            </div>
          )}
          <div className="checkout-summary__row checkout-summary__total">
            <span>Estimated total</span>
            <span>{formatMoney(estimatedTotal)}</span>
          </div>
          <p className="checkout-summary__note">Final total is confirmed by the restaurant when your order is placed.</p>
        </aside>
      </div>
    </div>
  );
}

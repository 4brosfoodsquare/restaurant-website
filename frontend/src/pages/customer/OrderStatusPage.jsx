import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { api, ApiError } from '../../lib/apiClient.js';
import { OrderSummaryCard } from '../../components/customer/OrderSummaryCard.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import './OrderStatusPage.css';

export default function OrderStatusPage() {
  usePageTitle('Track Your Order');
  const { token } = useParams();

  if (token) return <TrackByToken token={token} />;
  return <LookupForm />;
}

function TrackByToken({ token }) {
  const { data: order, status, error, refetch } = useApiQuery(`/api/orders/track/${token}`, [token]);

  if (status === 'loading') return <LoadingState label="Loading order status…" />;
  if (status === 'error' && error?.status === 404) {
    return (
      <div className="container">
        <ErrorState title="Order not found" message="This tracking link may be invalid." />
      </div>
    );
  }
  if (status === 'error') return <ErrorState onRetry={refetch} />;

  return (
    <div className="container order-status-page">
      <h1>Order Status</h1>
      <OrderSummaryCard order={order} />
    </div>
  );
}

function LookupForm() {
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const found = await api.post('/api/orders/lookup', { reference: reference.trim(), phone: phone.trim() });
      setOrder(found);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container order-status-page">
      <h1>Track Your Order</h1>
      <p className="order-status-page__intro">
        Enter your order reference (e.g. FB-7GK4QP) and the phone number you ordered with.
      </p>

      <form className="order-lookup-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="lookup-reference">Order reference</label>
          <input
            id="lookup-reference"
            className="input"
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="FB-7GK4QP"
          />
        </div>
        <div className="field">
          <label htmlFor="lookup-phone">Phone number</label>
          <input id="lookup-phone" className="input" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching…' : 'Find My Order'}
        </button>
      </form>

      {error && (
        <p className="order-lookup-form__error" role="alert">
          {error}
        </p>
      )}

      {order && (
        <div className="order-status-page__result">
          <OrderSummaryCard order={order} />
        </div>
      )}
    </div>
  );
}

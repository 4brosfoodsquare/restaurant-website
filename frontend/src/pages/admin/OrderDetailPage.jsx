import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { api, ApiError } from '../../lib/apiClient.js';
import { formatMoney } from '../../lib/money.js';
import { OrderStatusStepper } from '../../components/customer/OrderStatusStepper.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import './OrderDetailPage.css';

const NEXT_STATUS = {
  new: [{ value: 'accepted', label: 'Accept Order' }],
  accepted: [{ value: 'preparing', label: 'Start Preparing' }],
  preparing: [{ value: 'ready', label: 'Mark Ready' }],
  ready: [{ value: 'completed', label: 'Mark Completed' }],
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, status, error, refetch } = useApiQuery(`/api/admin/orders/${id}`, [id]);
  usePageTitle(order ? `Order ${order.reference}` : 'Order');

  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  if (status === 'loading') return <LoadingState label="Loading order…" />;
  if (status === 'error' && error?.status === 404) {
    return (
      <div>
        <ErrorState title="Order not found" />
        <Link to="/admin/orders" className="btn btn-outline">
          Back to Orders
        </Link>
      </div>
    );
  }
  if (status === 'error') return <ErrorState onRetry={refetch} />;

  async function updateStatus(newStatus, note = '') {
    setUpdating(true);
    setActionError(null);
    try {
      await api.patch(`/api/admin/orders/${id}/status`, { status: newStatus, note });
      await refetch();
      setShowCancelForm(false);
      setCancelReason('');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update the order.');
    } finally {
      setUpdating(false);
    }
  }

  const nextSteps = NEXT_STATUS[order.status] ?? [];
  const canCancel = order.status !== 'completed' && order.status !== 'cancelled';

  return (
    <div className="order-detail-page">
      <Link to="/admin/orders" className="order-detail-page__back">
        ← Back to Orders
      </Link>

      <header className="order-detail-page__header">
        <div>
          <h1>{order.reference}</h1>
          <p>Placed {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className={`badge badge-${statusTone(order.status)} order-detail-page__status-badge`}>{order.status}</span>
      </header>

      <div className="order-detail-page__stepper">
        <OrderStatusStepper status={order.status} />
      </div>

      {actionError && (
        <div className="order-detail-page__error" role="alert">
          {actionError}
        </div>
      )}

      <div className="order-detail-page__actions">
        {nextSteps.map((step) => (
          <button key={step.value} type="button" className="btn btn-primary" disabled={updating} onClick={() => updateStatus(step.value)}>
            {updating ? 'Updating…' : step.label}
          </button>
        ))}
        {canCancel && !showCancelForm && (
          <button type="button" className="btn btn-danger" disabled={updating} onClick={() => setShowCancelForm(true)}>
            Cancel Order
          </button>
        )}
      </div>

      {showCancelForm && (
        <div className="order-detail-page__cancel-form">
          <label htmlFor="cancel-reason">Cancellation reason</label>
          <textarea id="cancel-reason" className="textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          <div className="order-detail-page__cancel-actions">
            <button type="button" className="btn btn-danger btn-sm" disabled={updating} onClick={() => updateStatus('cancelled', cancelReason)}>
              Confirm Cancellation
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCancelForm(false)}>
              Never mind
            </button>
          </div>
        </div>
      )}

      <div className="order-detail-page__grid">
        <div className="card card--brand order-detail-page__panel">
          <h2 className="card__header">Items</h2>
          <div className="card__body">
          <ul className="order-detail-page__items">
            {order.items.map((item) => (
              <li key={item.id}>
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span>{formatMoney(item.lineTotalMinor)}</span>
              </li>
            ))}
          </ul>
          <div className="order-detail-page__totals">
            <div><span>Subtotal</span><span>{formatMoney(order.subtotalMinor)}</span></div>
            {order.taxMinor > 0 && <div><span>Tax</span><span>{formatMoney(order.taxMinor)}</span></div>}
            {order.deliveryFeeMinor > 0 && <div><span>Delivery fee</span><span>{formatMoney(order.deliveryFeeMinor)}</span></div>}
            <div className="order-detail-page__total-row"><span>Total</span><span>{formatMoney(order.totalMinor)}</span></div>
          </div>
          </div>
        </div>

        <div className="card card--brand order-detail-page__panel">
          <h2 className="card__header">Customer</h2>
          <dl className="card__body order-detail-page__meta">
            <div><dt>Name</dt><dd>{order.customerName}</dd></div>
            <div><dt>Phone</dt><dd><a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a></dd></div>
            {order.customerEmail && <div><dt>Email</dt><dd>{order.customerEmail}</dd></div>}
            <div><dt>Order Type</dt><dd className="dashboard-table__capitalize">{order.orderType}</dd></div>
            {order.orderType === 'delivery' && (
              <div>
                <dt>Address</dt>
                <dd>
                  {order.addressLine1}
                  {order.addressLine2 ? `, ${order.addressLine2}` : ''}, {order.addressCity} {order.addressPostcode}
                  {order.addressNotes && <><br />Note: {order.addressNotes}</>}
                </dd>
              </div>
            )}
            {order.customerNotes && (
              <div>
                <dt>Order Notes</dt>
                <dd>{order.customerNotes}</dd>
              </div>
            )}
            {order.cancellationReason && (
              <div>
                <dt>Cancellation Reason</dt>
                <dd>{order.cancellationReason}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card card--brand order-detail-page__panel">
          <h2 className="card__header">History</h2>
          <ul className="card__body order-detail-page__history">
            {order.statusHistory.map((entry, index) => (
              <li key={index}>
                <span className="dashboard-table__capitalize">{entry.toStatus}</span>
                <span>{new Date(entry.createdAt).toLocaleString()}</span>
                {entry.note && <p>{entry.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function statusTone(status) {
  switch (status) {
    case 'new': return 'amber';
    case 'accepted': return 'info';
    case 'preparing': return 'warning';
    case 'ready': return 'success';
    case 'completed': return 'neutral';
    case 'cancelled': return 'danger';
    default: return 'neutral';
  }
}

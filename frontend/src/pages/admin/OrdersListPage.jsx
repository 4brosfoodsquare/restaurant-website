import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { formatMoney } from '../../lib/money.js';
import { LoadingState, ErrorState, EmptyState } from '../../components/shared/StateViews.jsx';
import './OrdersListPage.css';

const STATUS_TABS = [
  { value: 'active', label: 'Active' },
  { value: 'new', label: 'New' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: '', label: 'All' },
];

export default function OrdersListPage() {
  usePageTitle('Orders');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStatus = searchParams.get('status') ?? 'active';

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: '150' });
    if (activeStatus) params.set('status', activeStatus);
    return params.toString();
  }, [activeStatus]);

  const orders = useApiQuery(`/api/admin/orders?${queryString}`, [queryString]);

  function setStatus(value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="orders-list-page">
      <header className="orders-list-page__header">
        <h1>Orders</h1>
      </header>

      <div className="orders-list-page__tabs" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            role="tab"
            aria-selected={activeStatus === tab.value}
            className={`chip ${activeStatus === tab.value ? 'chip--active' : ''}`}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {orders.status === 'loading' && <LoadingState label="Loading orders…" />}
      {orders.status === 'error' && <ErrorState onRetry={orders.refetch} />}
      {orders.status === 'success' && orders.data.length === 0 && (
        <EmptyState title="No orders here" message="Nothing matches this filter right now." />
      )}
      {orders.status === 'success' && orders.data.length > 0 && (
        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((order) => (
                <tr key={order.id} className={order.status === 'new' ? 'orders-list-page__row--new' : ''}>
                  <td>
                    <Link to={`/admin/orders/${order.id}`}>{order.reference}</Link>
                  </td>
                  <td>{order.customerName}</td>
                  <td className="dashboard-table__capitalize">{order.orderType}</td>
                  <td>{order.itemCount ?? '—'}</td>
                  <td>{formatMoney(order.totalMinor)}</td>
                  <td>
                    <span className={`badge badge-${statusTone(order.status)}`}>{order.status}</span>
                  </td>
                  <td>{new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

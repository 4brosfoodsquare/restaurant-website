import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMoney } from '../../lib/money.js';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import './DashboardPage.css';

function isToday(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const orders = useApiQuery('/api/admin/orders?limit=100');
  const menu = useApiQuery('/api/admin/menu?status=active');

  if (orders.status === 'loading' || menu.status === 'loading') {
    return <LoadingState label="Loading dashboard…" />;
  }
  if (orders.status === 'error') return <ErrorState onRetry={orders.refetch} />;

  const all = orders.data ?? [];
  const todayOrders = all.filter((o) => isToday(o.createdAt));
  const newCount = all.filter((o) => o.status === 'new').length;
  const acceptedCount = all.filter((o) => o.status === 'accepted').length;
  const preparingCount = all.filter((o) => o.status === 'preparing').length;
  const readyCount = all.filter((o) => o.status === 'ready').length;
  const completedToday = todayOrders.filter((o) => o.status === 'completed');
  const revenueToday = completedToday.reduce((sum, o) => sum + o.totalMinor, 0);

  const unavailableItems = (menu.data ?? []).filter((item) => !item.isAvailable);

  const stats = [
    { label: 'New Orders', value: newCount, tone: newCount > 0 ? 'alert' : 'default', to: '/admin/orders?status=new' },
    { label: 'Accepted', value: acceptedCount, to: '/admin/orders?status=accepted' },
    { label: 'Preparing', value: preparingCount, to: '/admin/orders?status=preparing' },
    { label: 'Ready', value: readyCount, to: '/admin/orders?status=ready' },
    { label: 'Orders Today', value: todayOrders.length },
    { label: 'Revenue Today', value: formatMoney(revenueToday), isMoney: true },
  ];

  return (
    <div className="dashboard-page">
      <header className="dashboard-page__header">
        <h1>Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p>Here's what's happening at the restaurant right now.</p>
      </header>

      <div className="dashboard-stats">
        {stats.map((stat) => {
          const content = (
            <>
              <span className="dashboard-stats__value">{stat.value}</span>
              <span className="dashboard-stats__label">{stat.label}</span>
            </>
          );
          return stat.to ? (
            <Link key={stat.label} to={stat.to} className={`dashboard-stats__card dashboard-stats__card--${stat.tone ?? 'default'}`}>
              {content}
            </Link>
          ) : (
            <div key={stat.label} className="dashboard-stats__card">
              {content}
            </div>
          );
        })}
      </div>

      {newCount > 0 && (
        <div className="dashboard-alert" role="alert">
          <strong>{newCount} new order{newCount === 1 ? '' : 's'}</strong> waiting to be accepted.
          <Link to="/admin/orders?status=new" className="btn btn-dark btn-sm">
            Review Now
          </Link>
        </div>
      )}

      {unavailableItems.length > 0 && (
        <div className="dashboard-alert dashboard-alert--warning" role="status">
          <strong>{unavailableItems.length} menu item{unavailableItems.length === 1 ? '' : 's'}</strong> currently marked unavailable.
          <Link to="/admin/menu" className="btn btn-outline btn-sm">
            Manage Menu
          </Link>
        </div>
      )}

      <section className="dashboard-page__recent">
        <div className="dashboard-page__recent-header">
          <h2>Recent Orders</h2>
          <Link to="/admin/orders" className="btn btn-outline btn-sm">
            View All
          </Link>
        </div>
        {all.length === 0 ? (
          <p className="dashboard-page__empty">No orders yet.</p>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {all.slice(0, 8).map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/admin/orders/${order.id}`}>{order.reference}</Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td className="dashboard-table__capitalize">{order.orderType}</td>
                    <td>{formatMoney(order.totalMinor)}</td>
                    <td>
                      <span className={`badge badge-${statusTone(order.status)}`}>{order.status}</span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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

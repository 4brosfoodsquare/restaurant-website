import { useParams, Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { OrderSummaryCard } from '../../components/customer/OrderSummaryCard.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import './OrderConfirmationPage.css';

export default function OrderConfirmationPage() {
  usePageTitle('Order Confirmed');
  const { token } = useParams();
  const { data: order, status, error, refetch } = useApiQuery(`/api/orders/track/${token}`, [token]);

  if (status === 'loading') return <LoadingState label="Loading your order…" />;
  if (status === 'error' && error?.status === 404) {
    return (
      <div className="container">
        <ErrorState title="Order not found" message="This confirmation link may be invalid or expired." />
      </div>
    );
  }
  if (status === 'error') return <ErrorState onRetry={refetch} />;

  return (
    <div className="container confirmation-page">
      <div className="confirmation-page__banner">
        <span className="confirmation-page__check" aria-hidden="true">✓</span>
        <h1>Thank you, {order.customerName.split(' ')[0]}!</h1>
        <p>Your order has been received. Keep this page bookmarked to track its status.</p>
      </div>

      <OrderSummaryCard order={order} />

      <div className="confirmation-page__actions">
        <Link to={`/track-order/${order.trackingToken}`} className="btn btn-outline">
          Track This Order
        </Link>
        <Link to="/menu" className="btn btn-primary">
          Order More
        </Link>
      </div>
    </div>
  );
}

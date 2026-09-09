import { formatMoney } from '../../lib/money.js';
import { OrderStatusStepper } from './OrderStatusStepper.jsx';
import './OrderSummaryCard.css';

export function OrderSummaryCard({ order }) {
  return (
    <div className="order-summary-card card card--brand">
      <div className="order-summary-card__header card__header">
        <div>
          <span className="order-summary-card__label">Order</span>
          <h2>{order.reference}</h2>
        </div>
        <span className="badge badge-neutral order-summary-card__type">
          {order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}
        </span>
      </div>

      <div className="card__body">
        <div className="order-summary-card__stepper">
          <OrderStatusStepper status={order.status} />
        </div>

      <ul className="order-summary-card__items">
        {order.items.map((item) => (
          <li key={item.id}>
            <span>
              {item.quantity} × {item.name}
            </span>
            <span>{formatMoney(item.lineTotalMinor)}</span>
          </li>
        ))}
      </ul>

      <div className="order-summary-card__totals">
        <div>
          <span>Subtotal</span>
          <span>{formatMoney(order.subtotalMinor)}</span>
        </div>
        {order.taxMinor > 0 && (
          <div>
            <span>Tax</span>
            <span>{formatMoney(order.taxMinor)}</span>
          </div>
        )}
        {order.deliveryFeeMinor > 0 && (
          <div>
            <span>Delivery fee</span>
            <span>{formatMoney(order.deliveryFeeMinor)}</span>
          </div>
        )}
        <div className="order-summary-card__total">
          <span>Total</span>
          <span>{formatMoney(order.totalMinor)}</span>
        </div>
      </div>

      <p className="order-summary-card__payment">
        {order.paymentStatus === 'paid'
          ? 'Paid'
          : `Payment: pay on ${order.orderType === 'delivery' ? 'delivery' : 'collection'}`}
      </p>

      {order.customerNotes && (
        <p className="order-summary-card__notes">
          <strong>Notes:</strong> {order.customerNotes}
        </p>
      )}

      {order.orderType === 'delivery' && order.addressLine1 && (
        <p className="order-summary-card__address">
          <strong>Delivering to:</strong> {order.addressLine1}
          {order.addressLine2 ? `, ${order.addressLine2}` : ''}, {order.addressCity} {order.addressPostcode}
        </p>
      )}
      </div>
    </div>
  );
}

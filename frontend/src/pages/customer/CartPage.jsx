import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useCart } from '../../context/CartContext.jsx';
import { formatMoney } from '../../lib/money.js';
import { EmptyState } from '../../components/shared/StateViews.jsx';
import './CartPage.css';

export default function CartPage() {
  usePageTitle('Your Cart');
  const { items, subtotalMinor, setQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="container cart-page">
        <EmptyState
          title="Your cart is empty"
          message="Add some biriyani, kabab or chilli chicken to get started."
          action={
            <Link to="/menu" className="btn btn-primary">
              Browse the Menu
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container cart-page">
      <h1>Your Cart</h1>

      <div className="cart-page__grid">
        <ul className="cart-list">
          {items.map((line) => (
            <li key={line.menuItemId} className="cart-line card">
              <div className="cart-line__media" aria-hidden="true">
                {line.imageUrl ? <img src={line.imageUrl} alt="" /> : <span>🍽️</span>}
              </div>
              <div className="cart-line__info">
                <Link to={`/menu/${line.slug}`}>{line.name}</Link>
                <span className="cart-line__unit-price">{formatMoney(line.priceMinor)} each</span>
              </div>
              <div className="quantity-selector">
                <button type="button" onClick={() => setQuantity(line.menuItemId, line.quantity - 1)} aria-label={`Decrease quantity of ${line.name}`}>
                  −
                </button>
                <span aria-live="polite">{line.quantity}</span>
                <button type="button" onClick={() => setQuantity(line.menuItemId, line.quantity + 1)} aria-label={`Increase quantity of ${line.name}`}>
                  +
                </button>
              </div>
              <div className="cart-line__total">{formatMoney(line.priceMinor * line.quantity)}</div>
              <button type="button" className="cart-line__remove" onClick={() => removeItem(line.menuItemId)} aria-label={`Remove ${line.name} from cart`}>
                Remove
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary card">
          <h2>Order Summary</h2>
          <div className="cart-summary__row">
            <span>Subtotal</span>
            <span>{formatMoney(subtotalMinor)}</span>
          </div>
          <p className="cart-summary__note">Tax and any delivery fee are calculated at checkout.</p>
          <Link to="/checkout" className="btn btn-primary btn-block btn-lg">
            Proceed to Checkout
          </Link>
          <Link to="/menu" className="link-button cart-summary__continue">
            ← Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useCart } from '../../context/CartContext.jsx';
import { formatMoney, formatPrice, isPriced } from '../../lib/money.js';
import { DIET_LABELS, SPICE_LABELS } from '../../lib/dietLabels.js';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import { FoodImage } from '../../components/customer/FoodImage.jsx';
import './ItemDetailPage.css';

export default function ItemDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: item, status, error, refetch } = useApiQuery(`/api/menu/${slug}`, [slug]);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  usePageTitle(item?.name);

  if (status === 'loading') return <LoadingState label="Loading dish…" />;
  if (status === 'error' && error?.status === 404) {
    return (
      <div className="container">
        <ErrorState title="Dish not found" message="This item may have been removed from the menu." />
        <p style={{ textAlign: 'center' }}>
          <Link to="/menu" className="btn btn-outline">
            Back to Menu
          </Link>
        </p>
      </div>
    );
  }
  if (status === 'error') return <ErrorState onRetry={refetch} />;

  const soldOut = !item.isAvailable;
  const priced = isPriced(item.priceMinor);

  function handleAddToCart() {
    addItem(item, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  }

  return (
    <div className="container item-detail">
      <nav className="item-detail__breadcrumb" aria-label="Breadcrumb">
        <Link to="/menu">Menu</Link> <span aria-hidden="true">/</span>{' '}
        <Link to={`/menu?category=${item.categorySlug}`}>{item.categoryName}</Link>
      </nav>

      <div className="item-detail__grid">
        <div className="item-detail__media">
          <FoodImage src={item.imageUrl} label={item.name} eager />
          {soldOut && <span className="item-detail__sold-out">Currently Unavailable</span>}
        </div>

        <div className="item-detail__info">
          <div className="item-detail__badges">
            {item.dietType && item.dietType !== 'unspecified' && (
              <span className="item-detail__diet">
                <span className={`diet-mark ${item.dietType}`} aria-hidden="true" />
                {DIET_LABELS[item.dietType]}
              </span>
            )}
            {item.spiceLevel > 0 && <span className="badge badge-red">{SPICE_LABELS[item.spiceLevel]}</span>}
          </div>

          <h1>{item.name}</h1>
          <p className="item-detail__price">{formatPrice(item.priceMinor)}</p>
          {item.description && <p className="item-detail__description">{item.description}</p>}

          {!priced ? (
            <div className="item-detail__enquire">
              <p className="item-detail__unavailable-note">
                We haven&rsquo;t published a price for this dish online yet. Get in touch and
                we&rsquo;ll tell you what it costs today.
              </p>
              <Link to="/contact" className="btn btn-primary btn-lg">
                Ask Us
              </Link>
            </div>
          ) : soldOut ? (
            <p className="item-detail__unavailable-note">
              This item is currently unavailable. Please check back later or browse other dishes.
            </p>
          ) : (
            <div className="item-detail__actions">
              <div className="quantity-selector" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                  −
                </button>
                <span aria-live="polite">{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(20, q + 1))} aria-label="Increase quantity">
                  +
                </button>
              </div>
              <button type="button" className="btn btn-primary btn-lg" onClick={handleAddToCart}>
                Add {quantity > 1 ? `${quantity} ` : ''}to Cart — {formatMoney(item.priceMinor * quantity)}
              </button>
            </div>
          )}

          {justAdded && (
            <p className="item-detail__added" role="status">
              Added to cart.{' '}
              <button type="button" className="link-button" onClick={() => navigate('/cart')}>
                View cart →
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { formatMoney } from '../../lib/money.js';
import { DIET_LABELS } from '../../lib/dietLabels.js';
import { useCart } from '../../context/CartContext.jsx';
import './FoodCard.css';

export function FoodCard({ item }) {
  const { addItem } = useCart();
  const unavailable = !item.isAvailable;

  return (
    <article className="food-card card">
      {/* Decorative — the title link below is the real, accessible navigation
          to this dish; without this the image-only link would have no
          discernible name for screen readers, and with it present too we'd
          just be a second identical stop before that one. */}
      <Link to={`/menu/${item.slug}`} className="food-card__media" aria-hidden="true" tabIndex={-1}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="food-card__media-placeholder" aria-hidden="true">
            🍽️
          </div>
        )}
        {unavailable && <span className="food-card__sold-out">Sold Out</span>}
        {!unavailable && item.isPopular && <span className="badge badge-amber food-card__ribbon">Popular</span>}
      </Link>

      <div className="food-card__body">
        <div className="food-card__title-row">
          {item.dietType && item.dietType !== 'unspecified' && (
            <span className={`diet-mark ${item.dietType}`} role="img" aria-label={DIET_LABELS[item.dietType]} title={DIET_LABELS[item.dietType]} />
          )}
          <h3>
            <Link to={`/menu/${item.slug}`}>{item.name}</Link>
          </h3>
        </div>
        {item.description && <p className="food-card__description">{item.description}</p>}
        <div className="food-card__footer">
          <span className="food-card__price">{formatMoney(item.priceMinor)}</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={unavailable}
            onClick={() => addItem(item, 1)}
          >
            {unavailable ? 'Unavailable' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  );
}

import { Link } from 'react-router-dom';
import { formatPrice, isPriced } from '../../lib/money.js';
import { DIET_LABELS } from '../../lib/dietLabels.js';
import { useCart } from '../../context/CartContext.jsx';
import { FoodImage } from './FoodImage.jsx';
import './FoodCard.css';

export function FoodCard({ item }) {
  const { addItem } = useCart();
  // Two distinct states, deliberately not merged: "sold out" is the kitchen
  // being out of something, while "not priced yet" is the owner not having
  // set a price. Both block online ordering, but showing a Sold Out ribbon
  // over a dish that is simply awaiting a price would be a lie.
  const soldOut = !item.isAvailable;
  const priced = isPriced(item.priceMinor);

  return (
    <article className="food-card card">
      {/* Decorative — the title link below is the real, accessible navigation
          to this dish; without this the image-only link would have no
          discernible name for screen readers, and with it present too we'd
          just be a second identical stop before that one. */}
      <Link to={`/menu/${item.slug}`} className="food-card__media" aria-hidden="true" tabIndex={-1}>
        <FoodImage src={item.imageUrl} />
        {soldOut && <span className="food-card__sold-out">Sold Out</span>}
        {!soldOut && item.isPopular && <span className="badge badge-amber food-card__ribbon">Popular</span>}
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
          <span className="food-card__price">{formatPrice(item.priceMinor)}</span>
          {priced ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={soldOut}
              onClick={() => addItem(item, 1)}
            >
              {soldOut ? 'Unavailable' : 'Add to Cart'}
            </button>
          ) : (
            /* A disabled button would be a dead end; send them somewhere they
               can actually get the price instead. */
            <Link to="/contact" className="btn btn-outline btn-sm">
              Ask Us
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

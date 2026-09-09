import './FoodImage.css';

/**
 * A dish photo, or a branded well when there isn't one yet.
 *
 * No photography has been supplied, and a broken frame or an emoji would
 * undercut the brand — so the fallback is a deliberate red well with a fine
 * cream rule, matching the card treatment used across the site. Every place a
 * dish image appears also shows its name adjacent, so the well carries no
 * lettering of its own. The moment the owner uploads a photo in the admin
 * dashboard the `src` arrives and the well disappears; the photo crops to fill
 * exactly the same area, so nothing shifts.
 */
export function FoodImage({ src, alt = '', eager = false, className = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`food-image ${className}`}
        loading={eager ? 'eager' : 'lazy'}
      />
    );
  }

  return (
    <div className={`food-image food-image--placeholder ${className}`} role="presentation">
      <span className="food-image__rule" />
    </div>
  );
}

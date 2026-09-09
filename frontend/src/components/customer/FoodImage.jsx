import './FoodImage.css';

/**
 * A food image, or a designed stand-in when there isn't one yet.
 *
 * No photography has been supplied for the restaurant, and a broken frame or
 * an emoji would undercut the brand. The fallback is a deliberate type-plate
 * instead: warm ground, a hairline gold rule, the dish name set in the
 * display face. When the owner uploads a photo in the admin dashboard the
 * `src` simply arrives and the plate disappears — no code change needed.
 *
 * `compact` drops the lettering — for cards whose title already sits directly
 * beneath the image, printing the name inside it would just repeat it — while
 * keeping the gold rules so the frame still reads as designed rather than
 * blank. It omits the text rather than hiding it in CSS, so the name isn't
 * duplicated in the accessibility tree or read twice by anything walking the
 * DOM. Frames too small even for the rules (cart thumbnails) suppress them in
 * their own stylesheet.
 */
export function FoodImage({ src, alt = '', label, eager = false, compact = false, className = '' }) {
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
    <div
      className={`food-image food-image--placeholder ${compact ? 'food-image--compact' : ''} ${className}`}
      role="presentation"
    >
      <span className="food-image__rule" />
      {!compact && <span className="food-image__label">{label}</span>}
      <span className="food-image__rule" />
    </div>
  );
}

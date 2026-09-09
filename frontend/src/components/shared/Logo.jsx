/**
 * The restaurant's real logo (frontend/public/brand/logo.png — a square,
 * unaltered crop of the original sign photo; the untouched original is kept
 * at logo-original.jpg). The artwork itself is never edited, redrawn, or
 * recolored here — only displayed at different sizes.
 */
export function Logo({ size = 40, withWordmark = true, dark = false }) {
  // `size` may be a number of pixels or a CSS length such as a clamp(), which
  // is how the brand panel scales the mark fluidly. The width/height
  // attributes only accept numbers, so they're set only in that case; the
  // inline style takes either.
  const numericSize = typeof size === 'number' ? size : undefined;

  return (
    <span className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
      <img
        src="/brand/logo.png"
        alt="4 Bros Food Square"
        width={numericSize}
        height={numericSize}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
      {withWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.15rem',
            letterSpacing: '0.01em',
            color: dark ? 'var(--color-text-on-brand)' : 'var(--color-text)',
            lineHeight: 1.1,
          }}
        >
          4 Bros
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.6rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              // `dark` means "on the brand red" (the footer). Neither the deep
              // red nor gold survives there — 2.5:1 and 2.25:1 — so it takes
              // the cream calibrated for that ground.
              color: dark ? 'var(--color-text-on-brand-muted)' : 'var(--color-red-600)',
            }}
          >
            Food Square
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * The restaurant's real logo (frontend/public/brand/logo.png — a square,
 * unaltered crop of the original sign photo; the untouched original is kept
 * at logo-original.jpg). The artwork itself is never edited, redrawn, or
 * recolored here — only displayed at different sizes.
 */
export function Logo({ size = 40, withWordmark = true, dark = false }) {
  return (
    <span className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
      <img
        src="/brand/logo.png"
        alt="4 Bros Food Square"
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
      {withWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.15rem',
            letterSpacing: '0.01em',
            color: dark ? 'var(--color-text-on-ink)' : 'var(--color-text)',
            lineHeight: 1.1,
          }}
        >
          4 Bros
          <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-amber-500)' }}>
            Food Square
          </span>
        </span>
      )}
    </span>
  );
}

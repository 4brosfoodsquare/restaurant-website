import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Logo } from '../shared/Logo.jsx';
import { useCart } from '../../context/CartContext.jsx';
import './Header.css';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/track-order', label: 'Track Order' },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <header className="site-header">
      <div className="container site-header__bar">
        <Link to="/" className="site-header__logo" onClick={() => setMenuOpen(false)}>
          <Logo size={40} />
        </Link>

        <nav className="site-header__nav site-header__nav--desktop" aria-label="Primary">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__actions">
          <Link to="/cart" className="site-header__cart" aria-label={`Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}>
            <CartIcon />
            {itemCount > 0 && <span className="site-header__cart-badge">{itemCount}</span>}
          </Link>
          <Link to="/menu" className="btn btn-primary btn-sm site-header__cta">
            Order Now
          </Link>
          <button
            type="button"
            className="site-header__toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="site-header__nav--mobile" aria-label="Primary">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h2l1.6 9.6A2 2 0 0 0 9.57 17H18a2 2 0 0 0 1.94-1.51L21.5 9H6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="21" r="1.4" fill="currentColor" />
      <circle cx="18" cy="21" r="1.4" fill="currentColor" />
    </svg>
  );
}

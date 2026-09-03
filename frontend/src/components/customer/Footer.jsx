import { Link } from 'react-router-dom';
import { Logo } from '../shared/Logo.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import './Footer.css';

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export function Footer() {
  const { settings } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div className="site-footer__brand">
          <Logo size={40} dark />
          <p>{settings?.description || 'A specialist Indian non-vegetarian kitchen — biriyani, kabab and chilli chicken, made fresh.'}</p>
          {(settings?.socialInstagram || settings?.socialFacebook) && (
            <div className="site-footer__social">
              {settings?.socialInstagram && (
                <a href={settings.socialInstagram} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              )}
              {settings?.socialFacebook && (
                <a href={settings.socialFacebook} target="_blank" rel="noreferrer">
                  Facebook
                </a>
              )}
            </div>
          )}
        </div>

        <nav aria-label="Footer">
          <h3>Explore</h3>
          <ul>
            <li><Link to="/menu">Full Menu</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/track-order">Track an Order</Link></li>
          </ul>
        </nav>

        <div>
          <h3>Contact</h3>
          <ul className="site-footer__contact">
            {settings?.phone && <li><a href={`tel:${settings.phone.replace(/\s+/g, '')}`}>{settings.phone}</a></li>}
            {settings?.email && <li><a href={`mailto:${settings.email}`}>{settings.email}</a></li>}
            {settings?.addressLine1 && (
              <li>
                {settings.addressLine1}
                {settings.addressLine2 ? `, ${settings.addressLine2}` : ''}
              </li>
            )}
          </ul>
        </div>

        <div>
          <h3>Opening Hours</h3>
          <ul className="site-footer__hours">
            {settings?.hours &&
              Object.entries(DAY_LABELS).map(([key, label]) => (
                <li key={key}>
                  <span>{label}</span>
                  <span>{settings.hours[key] === 'closed' || !settings.hours[key] ? 'Closed' : settings.hours[key]}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <p>
          © {year} {settings?.restaurantName || '4 Bros Food Square'}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { LoadingState } from '../../components/shared/StateViews.jsx';
import './ContactPage.css';

const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

export default function ContactPage() {
  usePageTitle('Contact');
  const { settings, status } = useSettings();

  if (status === 'loading') return <LoadingState label="Loading contact details…" />;

  const mapQuery = encodeURIComponent(
    [settings?.addressLine1, settings?.addressLine2, settings?.addressPostcode].filter(Boolean).join(', '),
  );

  return (
    <div className="container contact-page">
      <header className="contact-page__header">
        <h1>Contact Us</h1>
        <p>Questions about an order, catering, or anything else — get in touch.</p>
      </header>

      <div className="contact-page__grid">
        <div className="card contact-page__card">
          <h2>Get in Touch</h2>
          <ul className="contact-page__list">
            {settings?.phone && (
              <li>
                <span>Phone</span>
                <a href={`tel:${settings.phone.replace(/\s+/g, '')}`}>{settings.phone}</a>
              </li>
            )}
            {settings?.email && (
              <li>
                <span>Email</span>
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </li>
            )}
            {settings?.addressLine1 && (
              <li>
                <span>Address</span>
                <span>
                  {settings.addressLine1}
                  {settings.addressLine2 ? `, ${settings.addressLine2}` : ''}
                  {settings.addressPostcode ? ` — ${settings.addressPostcode}` : ''}
                </span>
              </li>
            )}
          </ul>

          {mapQuery && (
            <a
              className="btn btn-outline btn-sm contact-page__map-link"
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Maps
            </a>
          )}
        </div>

        <div className="card contact-page__card">
          <h2>Opening Hours</h2>
          <ul className="contact-page__hours">
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
    </div>
  );
}

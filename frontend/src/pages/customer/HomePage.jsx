import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { FoodImage } from '../../components/customer/FoodImage.jsx';
import { Logo } from '../../components/shared/Logo.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import './HomePage.css';

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export default function HomePage() {
  usePageTitle();
  const { settings } = useSettings();
  // The three offerings are menu items, not categories — they're the things a
  // customer actually orders, so the cards link straight to the dish.
  const dishes = useApiQuery('/api/menu?featured=true');

  const signatureDishes = dishes.data ?? [];
  // Once the owner uploads a dish photo it becomes the hero's backdrop, sitting
  // behind the brand red rather than in a panel of its own. Until then the hero
  // is simply red — an empty photo frame would look like a missing asset.
  const heroImage = signatureDishes.find((d) => d.imageUrl)?.imageUrl;

  return (
    <>
      <section
        className={`hero ${heroImage ? 'hero--has-photo' : ''}`}
        style={heroImage ? { backgroundImage: `url(${heroImage})` } : undefined}
      >
        <div className="container hero__inner">
          <div className="hero__copy">
            <p className="hero__eyebrow">Homemade food · Homemade masalas</p>
            <h1>{settings?.tagline || 'Few dishes. Made with care.'}</h1>
            <p className="hero__lead">
              {settings?.description ||
                'Biriyani, kabab and chilli chicken, cooked with masalas we make ourselves. A short menu, so every plate gets the attention it deserves.'}
            </p>
            <div className="hero__actions">
              <Link to="/menu" className="btn btn-lg hero__primary">
                Order Now
              </Link>
              <Link to="/menu" className="btn btn-outline btn-lg hero__secondary">
                View Menu
              </Link>
            </div>
          </div>

          {/* Brand panel: the logo is the section, not decoration around it.
              It scales fluidly rather than at fixed breakpoints so the mark
              stays the dominant element from mobile through desktop. */}
          <aside className="hero__brand">
            <Logo size="clamp(9rem, 20vw, 15rem)" withWordmark={false} />
            <span className="hero__brand-rule" />
            <p className="hero__brand-line">Homemade food. Homemade masalas. Made with care.</p>
          </aside>
        </div>
      </section>

      <section className="section signature-section">
        <div className="container">
          <h2 className="section__title">What We Cook</h2>
          <p className="section__subtitle">Three dishes. That is the whole menu, and that is on purpose.</p>

          {dishes.status === 'loading' && <LoadingState label="Loading menu…" />}
          {dishes.status === 'error' && <ErrorState onRetry={dishes.refetch} />}
          {dishes.status === 'success' && (
            <div className="signature-grid">
              {signatureDishes.map((dish) => (
                <Link key={dish.id} to={`/menu/${dish.slug}`} className="signature-card">
                  <div className="signature-card__media">
                    <FoodImage src={dish.imageUrl} label={dish.name} />
                  </div>
                  <div className="signature-card__body">
                    <h3>{dish.name}</h3>
                    <p>{dish.description}</p>
                    <span className="signature-card__link">See {dish.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="approach-section">
        <div className="container approach-section__inner">
          <h2>Made at home. Served with pride.</h2>
          <p>
            Our masalas are made in our own kitchen, not bought in. That is the difference you
            taste in every plate we send out.
          </p>
        </div>
      </section>

      <section className="section about-section">
        <div className="container">
          <div className="about-section__inner">
            <h2 className="section__title">A Focused Kitchen</h2>
            <p>
              We are a small kitchen with a short menu. Biriyani, kabab and chilli chicken — three
              things we make properly, with our own homemade masalas, rather than a long list we
              cannot do justice.
            </p>
            <Link to="/about" className="btn btn-outline">
              Read Our Story
            </Link>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-band__inner">
          <h2>Ready when you are.</h2>
          <Link to="/menu" className="btn btn-primary btn-lg">
            Order Now
          </Link>
        </div>
      </section>

      <section className="section location-section">
        <div className="container location-grid">
          <div>
            <h2 className="section__title">Find Us</h2>
            {settings?.addressLine1 && (
              <p className="location-address">
                {settings.addressLine1}
                {settings.addressLine2 ? `, ${settings.addressLine2}` : ''}
                {settings.addressPostcode ? ` — ${settings.addressPostcode}` : ''}
              </p>
            )}
            {settings?.phone && (
              <p>
                <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="location-phone">
                  {settings.phone}
                </a>
              </p>
            )}
          </div>
          <div className="hours-card card">
            <h3>Opening Hours</h3>
            <ul>
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
      </section>
    </>
  );
}

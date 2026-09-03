import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import { FoodCard } from '../../components/customer/FoodCard.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import './HomePage.css';

const WHY_CHOOSE_US = [
  { icon: '🔥', title: 'Cooked to order', text: 'Every biriyani, kabab and chilli chicken is made fresh after you order — not reheated from a steam tray.' },
  { icon: '🌶️', title: 'Signature spice blends', text: 'Recipes built around slow-layered biriyani masala and char-grilled marinades, not shortcuts.' },
  { icon: '🛵', title: 'Pickup & delivery', text: 'Order ahead for quick pickup, or have it delivered hot to your door.' },
  { icon: '👨‍🍳', title: 'Family-run kitchen', text: 'A small, focused menu we know well — rather than trying to do everything.' },
];

const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export default function HomePage() {
  usePageTitle();
  const { settings } = useSettings();
  const categories = useApiQuery('/api/categories');
  const popular = useApiQuery('/api/menu?popular=true');

  const signatureCategories = (categories.data ?? []).filter((c) => c.isSignature);

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <p className="hero__eyebrow">Specialist Indian Non-Vegetarian Kitchen</p>
          <h1>{settings?.tagline || 'Biriyani. Kabab. Chilli Chicken.'}</h1>
          <p className="hero__lead">
            {settings?.description ||
              'A specialist Indian non-vegetarian kitchen built around three things we do better than anyone else: slow-cooked biriyani, char-grilled kababs and wok-tossed chilli chicken.'}
          </p>
          <div className="hero__actions">
            <Link to="/menu" className="btn btn-primary btn-lg">
              Order Now
            </Link>
            <Link to="/menu" className="btn btn-outline btn-lg hero__secondary">
              View Full Menu
            </Link>
          </div>
        </div>
      </section>

      <section className="section signature-section">
        <div className="container">
          <h2 className="section__title">Our Signatures</h2>
          <p className="section__subtitle">The three dishes this kitchen is built around.</p>

          {categories.status === 'loading' && <LoadingState label="Loading menu…" />}
          {categories.status === 'error' && <ErrorState onRetry={categories.refetch} />}
          {categories.status === 'success' && (
            <div className="signature-grid">
              {signatureCategories.map((cat) => (
                <Link key={cat.id} to={`/menu?category=${cat.slug}`} className="signature-card">
                  <div className="signature-card__media" aria-hidden="true">
                    {cat.imageUrl ? <img src={cat.imageUrl} alt="" loading="lazy" /> : <span>🍛</span>}
                  </div>
                  <div className="signature-card__body">
                    <h3>{cat.name}</h3>
                    <p>{cat.description}</p>
                    <span className="signature-card__link">Explore {cat.name} →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section why-section">
        <div className="container">
          <h2 className="section__title">Why 4 Bros</h2>
          <div className="why-grid">
            {WHY_CHOOSE_US.map((item) => (
              <div key={item.title} className="why-card">
                <span className="why-card__icon" aria-hidden="true">{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section popular-section">
        <div className="container">
          <div className="section__header-row">
            <div>
              <h2 className="section__title">Popular Right Now</h2>
              <p className="section__subtitle">Customer favourites from across the menu.</p>
            </div>
            <Link to="/menu" className="btn btn-outline btn-sm">
              View Full Menu
            </Link>
          </div>

          {popular.status === 'loading' && <LoadingState label="Loading popular dishes…" />}
          {popular.status === 'error' && <ErrorState onRetry={popular.refetch} />}
          {popular.status === 'success' && popular.data.length === 0 && (
            <p className="section__empty">No popular dishes marked yet — check back soon.</p>
          )}
          {popular.status === 'success' && popular.data.length > 0 && (
            <div className="food-grid">
              {popular.data.slice(0, 8).map((item) => (
                <FoodCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section about-section">
        <div className="container about-section__inner">
          <div>
            <h2 className="section__title">About {settings?.restaurantName || '4 Bros Food Square'}</h2>
            <p>{settings?.description}</p>
            <Link to="/about" className="btn btn-outline">
              Our Story
            </Link>
          </div>
        </div>
      </section>

      <section className="section location-section">
        <div className="container location-grid">
          <div>
            <h2 className="section__title">Visit or Order From Us</h2>
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

      <section className="cta-band">
        <div className="container cta-band__inner">
          <h2>Hungry already?</h2>
          <Link to="/menu" className="btn btn-primary btn-lg">
            Order Now
          </Link>
        </div>
      </section>
    </>
  );
}

import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import './AboutPage.css';

export default function AboutPage() {
  usePageTitle('About Us');
  const { settings } = useSettings();
  // The three offerings are read from the same place the menu reads them, so
  // editing a dish in the admin dashboard updates this page too rather than
  // leaving a second copy of the wording to drift.
  const dishes = useApiQuery('/api/menu?featured=true');

  return (
    <div className="container about-page">
      <header className="about-page__header">
        <h1>About {settings?.restaurantName || '4 Bros Food Square'}</h1>
        <p className="about-page__tagline">{settings?.tagline}</p>
      </header>

      <div className="about-page__body">
        <p>
          4 Bros Food Square is a homemade kitchen. We cook three things — biriyani, kabab and
          chilli chicken — and the masalas that go into them are made by us, not bought in.
        </p>
        <p>
          The short menu is deliberate. Fewer dishes means each one gets the time it needs, from
          the spice blend to the plate that reaches you.
        </p>
      </div>

      {dishes.status === 'success' && (
        <div className="about-page__pillars">
          {dishes.data.map((dish) => (
            <div key={dish.id} className="card card--brand about-page__pillar">
              <h2 className="card__header">{dish.name}</h2>
              <p className="card__body">{dish.description}</p>
            </div>
          ))}
        </div>
      )}

      <div className="about-page__cta">
        <Link to="/menu" className="btn btn-primary btn-lg">
          View Our Menu
        </Link>
      </div>
    </div>
  );
}

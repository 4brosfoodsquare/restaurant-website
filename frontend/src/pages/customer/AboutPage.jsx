import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import './AboutPage.css';

export default function AboutPage() {
  usePageTitle('About Us');
  const { settings } = useSettings();

  return (
    <div className="container about-page">
      <header className="about-page__header">
        <h1>About {settings?.restaurantName || '4 Bros Food Square'}</h1>
        <p className="about-page__tagline">{settings?.tagline}</p>
      </header>

      <div className="about-page__body">
        <p>{settings?.description}</p>
      </div>

      <div className="about-page__pillars">
        <div className="card about-page__pillar">
          <h2>Biriyani</h2>
          <p>Our founding dish — long-grain rice layered and slow-dum-cooked with marinated meat and whole spices.</p>
        </div>
        <div className="card about-page__pillar">
          <h2>Kabab</h2>
          <p>Char-grilled skewers, marinated and cooked over open flame for that smoky finish.</p>
        </div>
        <div className="card about-page__pillar">
          <h2>Chilli Chicken</h2>
          <p>Indo-Chinese wok-tossed chicken in a bold garlic-chilli sauce.</p>
        </div>
      </div>

      <div className="about-page__cta">
        <Link to="/menu" className="btn btn-primary btn-lg">
          View Our Menu
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import './NotFoundPage.css';

export default function NotFoundPage() {
  usePageTitle('Page Not Found');
  return (
    <div className="container not-found-page">
      <p className="not-found-page__code">404</p>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className="btn btn-primary">
        Back to Home
      </Link>
    </div>
  );
}

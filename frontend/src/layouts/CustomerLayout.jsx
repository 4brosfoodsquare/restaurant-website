import { Outlet } from 'react-router-dom';
import { Header } from '../components/customer/Header.jsx';
import { Footer } from '../components/customer/Footer.jsx';

export function CustomerLayout() {
  return (
    <div className="customer-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

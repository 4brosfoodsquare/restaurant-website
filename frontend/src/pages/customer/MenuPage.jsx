import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { FoodCard } from '../../components/customer/FoodCard.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/shared/StateViews.jsx';
import './MenuPage.css';

export default function MenuPage() {
  usePageTitle('Menu');
  // Three dishes fit on one page, so there is nothing worth filtering or
  // searching — the whole menu is visible at once by design.
  const menu = useApiQuery('/api/menu');

  return (
    <div className="menu-page container">
      <header className="menu-page__header">
        <h1>Our Menu</h1>
        <p>Three dishes, made with our own homemade masalas.</p>
      </header>

      {menu.status === 'loading' && <LoadingState label="Loading menu…" />}
      {menu.status === 'error' && <ErrorState message="We couldn't load the menu." onRetry={menu.refetch} />}
      {menu.status === 'success' && menu.data.length === 0 && (
        <EmptyState title="Menu coming soon" message="Our dishes are being added right now." />
      )}
      {menu.status === 'success' && menu.data.length > 0 && (
        <div className="food-grid">
          {menu.data.map((item) => (
            <FoodCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

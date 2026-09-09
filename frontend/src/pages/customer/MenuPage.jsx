import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { FoodCard } from '../../components/customer/FoodCard.jsx';
import { FoodImage } from '../../components/customer/FoodImage.jsx';
import { LoadingState, ErrorState } from '../../components/shared/StateViews.jsx';
import './MenuPage.css';

export default function MenuPage() {
  usePageTitle('Menu');
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category');

  const categories = useApiQuery('/api/categories');
  const menu = useApiQuery('/api/menu');

  // Three offerings means no filter chips are needed — the whole menu fits on
  // one page. A ?category= link from the homepage just scrolls to its section.
  useEffect(() => {
    if (!requestedCategory || categories.status !== 'success') return;
    const target = document.getElementById(`category-${requestedCategory}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [requestedCategory, categories.status]);

  const itemsByCategory = (slug) => (menu.data ?? []).filter((item) => item.categorySlug === slug);

  return (
    <div className="menu-page container">
      <header className="menu-page__header">
        <h1>Our Menu</h1>
        <p>Three dishes, made with our own homemade masalas.</p>
      </header>

      {(categories.status === 'loading' || menu.status === 'loading') && <LoadingState label="Loading menu…" />}
      {categories.status === 'error' && (
        <ErrorState message="We couldn't load the menu." onRetry={categories.refetch} />
      )}

      {categories.status === 'success' &&
        categories.data.map((cat) => {
          const items = itemsByCategory(cat.slug);
          return (
            <section key={cat.id} id={`category-${cat.slug}`} className="menu-category">
              <div className="menu-category__intro">
                <div className="menu-category__media">
                  <FoodImage src={cat.imageUrl} label={cat.name} />
                </div>
                <div className="menu-category__text">
                  <h2>{cat.name}</h2>
                  <p>{cat.description}</p>
                </div>
              </div>

              {items.length > 0 ? (
                <div className="food-grid">
                  {items.map((item) => (
                    <FoodCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="menu-category__pending">Dishes and prices for this section are being added.</p>
              )}
            </section>
          );
        })}
    </div>
  );
}

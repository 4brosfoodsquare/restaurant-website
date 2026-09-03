import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useApiQuery } from '../../hooks/useApiQuery.js';
import { FoodCard } from '../../components/customer/FoodCard.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/shared/StateViews.jsx';
import './MenuPage.css';

const DIET_FILTERS = [
  { value: '', label: 'All' },
  { value: 'veg', label: 'Vegetarian' },
  { value: 'non_veg', label: 'Non-Vegetarian' },
  { value: 'egg', label: 'Contains Egg' },
];

export default function MenuPage() {
  usePageTitle('Menu');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') ?? '';
  const activeDiet = searchParams.get('diet') ?? '';
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  const categories = useApiQuery('/api/categories');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (activeDiet) params.set('diet', activeDiet);
    const q = searchParams.get('q');
    if (q) params.set('q', q);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [activeCategory, activeDiet, searchParams]);

  const menu = useApiQuery(`/api/menu${queryString}`, [queryString]);

  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  }

  return (
    <div className="menu-page container">
      <header className="menu-page__header">
        <h1>Our Menu</h1>
        <p>Browse everything we make — filter by category or dietary preference, or search for a dish.</p>
      </header>

      <div className="menu-page__toolbar">
        <form className="menu-page__search" onSubmit={handleSearchSubmit} role="search">
          <label htmlFor="menu-search" className="visually-hidden">
            Search the menu
          </label>
          <input
            id="menu-search"
            type="search"
            className="input"
            placeholder="Search dishes…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            Search
          </button>
        </form>

        <div className="menu-page__diet-filter" role="group" aria-label="Filter by diet">
          {DIET_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`chip ${activeDiet === filter.value ? 'chip--active' : ''}`}
              onClick={() => updateParam('diet', filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {categories.status === 'success' && (
        <nav className="menu-page__categories" aria-label="Menu categories">
          <button
            type="button"
            className={`chip ${activeCategory === '' ? 'chip--active' : ''}`}
            onClick={() => updateParam('category', '')}
          >
            All Categories
          </button>
          {categories.data.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`chip ${activeCategory === cat.slug ? 'chip--active' : ''}`}
              onClick={() => updateParam('category', cat.slug)}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      )}

      {menu.status === 'loading' && <LoadingState label="Loading menu…" />}
      {menu.status === 'error' && <ErrorState message="We couldn't load the menu." onRetry={menu.refetch} />}
      {menu.status === 'success' && menu.data.length === 0 && (
        <EmptyState title="No dishes found" message="Try a different search or filter." />
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

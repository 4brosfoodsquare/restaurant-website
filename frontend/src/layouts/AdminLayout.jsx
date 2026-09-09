import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useRobotsMeta } from '../hooks/useRobotsMeta.js';
import { Logo } from '../components/shared/Logo.jsx';
import './AdminLayout.css';

/* Line icons rather than emoji. Emoji arrive with their own palette — a blue
   staff pair, a yellow folder, a grey cog — which is the only colour in the
   admin that belongs to no part of the brand, and each platform draws them
   differently. These are stroked in currentColor, so they take the cream of
   the sidebar and the red of the active tab without being told to. */
const ICONS = {
  dashboard: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z',
  orders: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  menu: 'M5 3v8a3 3 0 0 0 6 0V3M8 11v10M19 3c-1.7 1.4-2.5 3.4-2.5 6s.8 3 2.5 3v9',
  categories: 'M3 6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  staff: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20M16 4.5a3.5 3.5 0 0 1 0 6.8M18 14a4.5 4.5 0 0 1 3.5 4.4V20',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.3-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z',
};

function NavIcon({ name }) {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONS[name]} />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'dashboard' },
  { to: '/admin/orders', label: 'Orders', icon: 'orders', roles: ['owner', 'admin', 'staff'] },
  { to: '/admin/menu', label: 'Menu', icon: 'menu', roles: ['owner', 'admin', 'staff'] },
  { to: '/admin/categories', label: 'Categories', icon: 'categories', roles: ['owner', 'admin'] },
  { to: '/admin/staff', label: 'Staff', icon: 'staff', roles: ['owner', 'admin'] },
  { to: '/admin/settings', label: 'Settings', icon: 'settings', roles: ['owner', 'admin', 'staff'] },
];

export function AdminLayout() {
  useRobotsMeta('noindex, nofollow');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="admin-shell">
      <button
        type="button"
        className="admin-shell__mobile-toggle"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-expanded={sidebarOpen}
        aria-controls="admin-sidebar"
      >
        {sidebarOpen ? 'Close menu' : 'Menu'}
      </button>

      <aside id="admin-sidebar" className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__brand">
          <Logo size={40} withWordmark={false} />
          <div>
            <strong>4 Bros Admin</strong>
            <span className="admin-sidebar__brand-subtitle">Restaurant Operations</span>
          </div>
        </div>

        <nav aria-label="Admin">
          <ul>
            {visibleItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}>
                  <NavIcon name={item.icon} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-sidebar__user">
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}

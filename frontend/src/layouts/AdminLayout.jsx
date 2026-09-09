import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useRobotsMeta } from '../hooks/useRobotsMeta.js';
import { Logo } from '../components/shared/Logo.jsx';
import './AdminLayout.css';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true, icon: '◱' },
  { to: '/admin/orders', label: 'Orders', icon: '🧾', roles: ['owner', 'admin', 'staff'] },
  { to: '/admin/menu', label: 'Menu', icon: '🍽️', roles: ['owner', 'admin', 'staff'] },
  { to: '/admin/categories', label: 'Categories', icon: '📂', roles: ['owner', 'admin'] },
  { to: '/admin/staff', label: 'Staff', icon: '👥', roles: ['owner', 'admin'] },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️', roles: ['owner', 'admin', 'staff'] },
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
                  <span aria-hidden="true">{item.icon}</span>
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

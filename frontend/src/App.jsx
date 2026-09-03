import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CustomerLayout } from './layouts/CustomerLayout.jsx';
import { AdminLayout } from './layouts/AdminLayout.jsx';
import { RequireAdminAuth } from './layouts/RequireAdminAuth.jsx';
import { LoadingState } from './components/shared/StateViews.jsx';

const HomePage = lazy(() => import('./pages/customer/HomePage.jsx'));
const MenuPage = lazy(() => import('./pages/customer/MenuPage.jsx'));
const ItemDetailPage = lazy(() => import('./pages/customer/ItemDetailPage.jsx'));
const CartPage = lazy(() => import('./pages/customer/CartPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage.jsx'));
const OrderConfirmationPage = lazy(() => import('./pages/customer/OrderConfirmationPage.jsx'));
const OrderStatusPage = lazy(() => import('./pages/customer/OrderStatusPage.jsx'));
const AboutPage = lazy(() => import('./pages/customer/AboutPage.jsx'));
const ContactPage = lazy(() => import('./pages/customer/ContactPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/customer/NotFoundPage.jsx'));

const AdminLoginPage = lazy(() => import('./pages/admin/LoginPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/admin/DashboardPage.jsx'));
const AdminOrdersListPage = lazy(() => import('./pages/admin/OrdersListPage.jsx'));
const AdminOrderDetailPage = lazy(() => import('./pages/admin/OrderDetailPage.jsx'));
const AdminMenuPage = lazy(() => import('./pages/admin/MenuManagementPage.jsx'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/CategoryManagementPage.jsx'));
const AdminStaffPage = lazy(() => import('./pages/admin/StaffManagementPage.jsx'));
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage.jsx'));

function PageFallback() {
  return <LoadingState label="Loading page…" />;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<HomePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="menu/:slug" element={<ItemDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order/confirmation/:token" element={<OrderConfirmationPage />} />
          <Route path="track-order" element={<OrderStatusPage />} />
          <Route path="track-order/:token" element={<OrderStatusPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdminAuth>
              <AdminLayout />
            </RequireAdminAuth>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="orders" element={<AdminOrdersListPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

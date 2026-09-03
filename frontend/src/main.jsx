import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Global styles must be imported before any component: Vite/ESM evaluates
// (and injects <style> tags for) imports in the order they're reached, and
// CSS resolves ties between equal-specificity selectors by source order.
// base.css's utility classes (e.g. .btn) are meant to be a foundation that
// page/component CSS can override — but only if base.css's <style> tag
// lands FIRST in the document. Importing it after App (which transitively
// pulls in every component's own CSS) put it last instead, so any
// component rule with the same specificity as a base.css rule silently
// lost regardless of which one was "more specific" in intent.
import './styles/index.css';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

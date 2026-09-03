import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { useRobotsMeta } from '../../hooks/useRobotsMeta.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ApiError } from '../../lib/apiClient.js';
import { Logo } from '../../components/shared/Logo.jsx';
import './LoginPage.css';

export default function LoginPage() {
  usePageTitle('Admin Login');
  useRobotsMeta('noindex, nofollow');
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    const from = location.state?.from?.pathname ?? '/admin';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname ?? '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__panel card">
        <div className="admin-login__brand">
          <Logo size={48} withWordmark={false} />
          <div>
            <strong>4 Bros Admin</strong>
            <span>Restaurant operations dashboard</span>
          </div>
        </div>

        <h1>Log in</h1>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="admin-login__error" role="alert">
              {error}
            </div>
          )}

          <div className="field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              className="input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}

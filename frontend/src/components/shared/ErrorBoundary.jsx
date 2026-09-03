import { Component } from 'react';
import './StateViews.css';

/**
 * Top-level crash guard. React error boundaries must be class components —
 * there is no hook equivalent — so this is the one class component in the
 * app, kept deliberately minimal and wrapped around the whole tree in
 * main.jsx. Without this, an unhandled render error anywhere would white-
 * screen the entire site instead of showing a recoverable message.
 */
export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[app] unhandled render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="state-view state-view-error" role="alert" style={{ minHeight: '100vh' }}>
          <h2>Something went wrong</h2>
          <p>Please reload the page. If the problem continues, try again shortly.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

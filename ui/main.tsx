import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TrueCalling] Uncaught React error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            backgroundColor: '#080C14',
            color: '#F8FAFC',
            padding: '24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: '#EF4444', marginBottom: '12px' }}>Initialization Error</h2>
          <p style={{ color: '#94A3B8', marginBottom: '16px', maxWidth: '400px', fontSize: '14px' }}>
            {this.state.error?.message || 'An unexpected error occurred while starting TrueCalling.'}
          </p>
          <pre
            style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '11px',
              maxWidth: '90%',
              overflowX: 'auto',
              marginBottom: '20px',
              textAlign: 'left',
              color: '#CBD5E1',
            }}
          >
            {this.state.error?.stack || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10B981',
              color: '#080C14',
              fontWeight: 700,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global fail-safe for unhandled errors before React mounts
window.addEventListener('error', (event) => {
  console.error('[TrueCalling Global Error]', event.error || event.message);
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    root.innerHTML = `
      <div style="min-height:100vh;background:#080C14;color:#F8FAFC;padding:24px;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <h2 style="color:#EF4444;margin-bottom:12px">Startup Error</h2>
        <p style="color:#94A3B8;margin-bottom:20px;font-size:13px">${event.message || 'Script execution failed'}</p>
        <button onclick="window.location.reload()" style="padding:10px 20px;background:#10B981;color:#080C14;font-weight:700;border:none;border-radius:8px;cursor:pointer">Reload App</button>
      </div>
    `;
  }
});

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err: any) {
    console.error('[TrueCalling Fatal Mount Error]', err);
    rootElement.innerHTML = `
      <div style="min-height:100vh;background:#080C14;color:#F8FAFC;padding:24px;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <h2 style="color:#EF4444;margin-bottom:12px">Mounting Error</h2>
        <p style="color:#94A3B8;margin-bottom:20px;font-size:13px">${err?.message || String(err)}</p>
      </div>
    `;
  }
}

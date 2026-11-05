import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/client-log', JSON.stringify({
          type: 'component_error',
          name: this.props.name || 'Component',
          message: error?.message,
          stack: error?.stack,
          info: errorInfo?.componentStack
        }))
      }
    } catch (_) {}
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div style={{
          padding: '24px',
          margin: '20px auto',
          maxWidth: '600px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#fca5a5',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px'
        }}>
          <h3 style={{ margin: '0 0 10px', color: '#f87171' }}>Failed to render preview</h3>
          <p style={{ margin: '0 0 14px', color: '#cbd5e1' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: '#2563eb',
                color: '#ffffff',
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'inherit'
              }}
            >
              Retry
            </button>
            {this.props.onClose && (
              <button
                type="button"
                onClick={this.props.onClose}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  border: 'none',
                  fontFamily: 'inherit'
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}


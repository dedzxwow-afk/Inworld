import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App'
import './ui/styles.css'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; err?: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, err }
  }
  componentDidCatch(err: any) {
    console.error('AnonVPN WebApp error:', err)
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ padding: 24, color: '#ECECEC', fontFamily: 'system-ui', background: '#0F0F11', minHeight: '100vh' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, padding: 16, background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>AnonVPN WebApp</div>
          <div style={{ opacity: 0.8, marginBottom: 12 }}>Ошибка интерфейса. Открой консоль (F12) и пришли текст ошибки.</div>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', opacity: 0.8, fontSize: 12 }}>{String(this.state.err?.message ?? this.state.err ?? '')}</pre>
        </div>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

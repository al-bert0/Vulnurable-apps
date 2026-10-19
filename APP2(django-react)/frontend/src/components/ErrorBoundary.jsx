import { Component } from 'react'

// Without this, any render error unmounts the whole app and the page just looks blank.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card">
          <h2>This page failed to render</h2>
          <div className="error" role="alert">{String(this.state.error?.message || this.state.error)}</div>
          <p className="muted">Open the browser console for details, then try reloading.</p>
        </div>
      )
    }
    return this.props.children
  }
}

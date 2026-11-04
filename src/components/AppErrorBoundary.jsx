import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, recovering: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('MoCars page error', error, info);
    const key = `mocars-route-recovery:${window.location.pathname}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, String(Date.now()));
      this.setState({ recovering: true });
      window.setTimeout(() => window.location.reload(), 250);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.state.recovering) {
      return (
        <main className="app-recovery" role="status">
          <div className="recovery-spinner" />
          <h1>Opening this page…</h1>
          <p>MoCars is recovering the navigation automatically.</p>
        </main>
      );
    }
    return (
      <main className="app-recovery" role="alert">
        <img src="/logo.svg" alt="MoCars" />
        <h1>Something interrupted this page.</h1>
        <p>The site stayed online, but this page could not finish loading.</p>
        <div className="button-row centered">
          <button className="btn btn-red" type="button" onClick={() => window.location.reload()}>Try Again</button>
          <a className="btn btn-outline-dark" href="/">Go to Home</a>
        </div>
      </main>
    );
  }
}

import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, recovering: false };
  }

  static getDerivedStateFromError(error) {
    // Keep the one-time automatic recovery completely invisible to customers.
    return { error, recovering: true };
  }

  componentDidCatch(error, info) {
    console.error('MoCars page error', error, info);
    const key = `mocars-route-recovery:${window.location.pathname}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
      return;
    }
    // If the same route fails again after recovery, show a useful error action
    // instead of entering an endless reload loop.
    this.setState({ recovering: false });
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.state.recovering) return null;
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

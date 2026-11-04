import React, { useEffect } from 'react';

/**
 * Uses normal browser document navigation for every internal page link.
 * Cloudflare serves all routes directly, while versioned assets stay cached,
 * so navigation remains quick and cannot get stuck in a client-router state.
 */
export default function NavigationReliability() {
  useEffect(() => {
    document.body.classList.remove('route-loading');

    const handleInternalClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.protocol !== 'http:' && destination.protocol !== 'https:') return;

      const currentPage = `${window.location.pathname}${window.location.search}`;
      const nextPage = `${destination.pathname}${destination.search}`;
      if (currentPage === nextPage) return;

      event.preventDefault();
      document.body.classList.add('route-loading');
      window.location.assign(destination.href);
    };

    document.addEventListener('click', handleInternalClick, true);
    return () => document.removeEventListener('click', handleInternalClick, true);
  }, []);

  return <div className="route-progress" aria-hidden="true"><span /></div>;
}

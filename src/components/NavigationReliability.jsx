import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const routeKey = (location) => `${location.pathname}${location.search}${location.hash}`;

/**
 * Keeps client-side navigation fast while providing a hard-navigation fallback.
 * If a browser changes the URL but React does not commit the next route within
 * four seconds, the intended URL is loaded as a normal document automatically.
 */
export default function NavigationReliability() {
  const location = useLocation();
  const pendingTimer = useRef(null);
  const pendingUrl = useRef('');

  useEffect(() => {
    const committedRoute = routeKey(location);
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.dataset.routeReady = committedRoute;
      document.body.classList.remove('route-loading');
      window.dispatchEvent(new CustomEvent('mocars:route-ready', { detail: committedRoute }));

      // A successful render allows a future one-time recovery on this route.
      window.setTimeout(() => {
        sessionStorage.removeItem(`mocars-route-recovery:${location.pathname}`);
      }, 800);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const clearPending = () => {
      window.clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
      pendingUrl.current = '';
      document.body.classList.remove('route-loading');
    };

    const handleRouteReady = (event) => {
      if (!pendingUrl.current || event.detail === pendingUrl.current) clearPending();
    };

    const handleInternalClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.protocol !== 'http:' && destination.protocol !== 'https:') return;

      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const intended = `${destination.pathname}${destination.search}${destination.hash}`;
      if (current === intended) return;

      clearPending();
      pendingUrl.current = intended;
      document.documentElement.dataset.routeReady = '';
      document.body.classList.add('route-loading');

      pendingTimer.current = window.setTimeout(() => {
        // Normal document navigation is the most reliable recovery across browsers.
        if (`${window.location.pathname}${window.location.search}${window.location.hash}` === intended) {
          window.location.reload();
        } else {
          window.location.assign(destination.href);
        }
      }, 4000);
    };

    document.addEventListener('click', handleInternalClick, true);
    window.addEventListener('mocars:route-ready', handleRouteReady);
    return () => {
      clearPending();
      document.removeEventListener('click', handleInternalClick, true);
      window.removeEventListener('mocars:route-ready', handleRouteReady);
    };
  }, []);

  return <div className="route-progress" aria-hidden="true"><span /></div>;
}

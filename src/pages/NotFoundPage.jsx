import React from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function NotFoundPage() {
  usePageMeta('Page Not Found', 'The page you requested could not be found.');
  return <section className="not-found section"><div className="container"><span className="error-code">404</span><span className="eyebrow">Wrong turn</span><h1>We couldn’t find that page.</h1><p>Return home or continue browsing the MoCars catalogues.</p><div className="button-row centered"><Link className="btn btn-red" to="/">Back to Home</Link><Link className="btn btn-outline-dark" to="/auto-parts">Browse Auto Parts</Link></div></div></section>;
}

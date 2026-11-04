import React, { useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs container" aria-label="Breadcrumb">
      <Link to="/">Home</Link>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          <ChevronRight size={15} aria-hidden="true" />
          {item.to ? <Link to={item.to}>{item.label}</Link> : <strong aria-current="page">{item.label}</strong>}
        </span>
      ))}
    </nav>
  );
}

export function Modal({ open, onClose, title, eyebrow, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keyHandler = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', keyHandler);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', keyHandler);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`modal-panel${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button dark" type="button" onClick={onClose} aria-label="Close dialog"><X /></button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function PageHero({ eyebrow, title, children, compact = false }) {
  return (
    <section className={`page-hero${compact ? ' compact' : ''}`}>
      <div className="container">
        {eyebrow && <span className="eyebrow light">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <div className="page-hero-copy">{children}</div>}
      </div>
    </section>
  );
}

export function SectionHeading({ eyebrow, title, linkTo, linkLabel, light = false }) {
  return (
    <div className={`section-heading${light ? ' light' : ''}`}>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {linkTo && <Link className="text-link" to={linkTo}>{linkLabel}<ChevronRight size={19} /></Link>}
    </div>
  );
}

export function EmptyState({ title = "We couldn't find what you're looking for.", description, onClear, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">0</div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      <div className="button-row centered">
        {onClear && <button className="btn btn-navy" type="button" onClick={onClear}>Clear filters</button>}
        {action}
      </div>
    </div>
  );
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [pathname]);
  return null;
}

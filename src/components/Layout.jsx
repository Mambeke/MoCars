import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.jsx';
import { businessConfig } from '../config/business.js';

function Header() {
  const { cartCount, profile } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/auto-parts')) setType('parts');
    else if (location.pathname.includes('cars') || location.pathname.startsWith('/vehicles')) setType('vehicles');
    else setType('all');
  }, [location.pathname]);

  const submitSearch = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    window.location.assign(`/search?q=${encodeURIComponent(value)}&type=${type}`);
    setQuery('');
    setSearchOpen(false);
  };

  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <>
      <header className="site-header">
        <div className="header-inner container-wide">
          <Link className="brand" to="/" aria-label="MoCars home">
            <img src="/logo.svg" alt="MoCars" />
          </Link>
          <nav className={`main-nav${mobileOpen ? ' open' : ''}`} aria-label="Main navigation">
            <NavLink to="/" end className={navClass}>Home</NavLink>
            <NavLink to="/used-cars" className={navClass}>Used Cars</NavLink>
            <NavLink to="/new-cars" className={navClass}>New Cars</NavLink>
            <NavLink to="/auto-parts" className={navClass}>Auto Parts</NavLink>
            <div className="mobile-nav-actions">
              <NavLink to="/account" className={navClass}>My Account</NavLink>
              <NavLink to="/cart" className={navClass}>Shopping Cart ({cartCount})</NavLink>
            </div>
          </nav>
          <div className="header-actions">
            <button className="icon-button" type="button" onClick={() => setSearchOpen(true)} aria-label="Search MoCars">
              <Search />
            </button>
            <Link className="account-link" to="/account" aria-label="My account">
              <UserRound />
              <span>{profile ? profile.name.split(' ')[0] : 'My Account'}</span>
            </Link>
            <Link className="cart-link" to="/cart" aria-label={`Shopping cart with ${cartCount} items`}>
              <ShoppingCart />
              {cartCount > 0 && <span className="cart-count">{cartCount > 99 ? '99+' : cartCount}</span>}
            </Link>
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="modal-backdrop search-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search MoCars" onMouseDown={(event) => event.stopPropagation()}>
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">Find exactly what you need</span>
                <h2>Search MoCars</h2>
              </div>
              <button className="icon-button dark" type="button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X /></button>
            </div>
            <form className="global-search-form" onSubmit={submitSearch}>
              <div className="global-search-input">
                <Search aria-hidden="true" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={type === 'parts' ? 'Part name, number, make or model' : type === 'vehicles' ? 'Make, model or keyword' : 'Search vehicles and auto parts'}
                  aria-label="Search term"
                />
              </div>
              <div className="search-type-tabs" aria-label="Search category">
                {[
                  ['all', 'Everything'],
                  ['vehicles', 'Vehicles'],
                  ['parts', 'Auto Parts'],
                ].map(([value, label]) => (
                  <button key={value} className={type === value ? 'active' : ''} type="button" onClick={() => setType(value)}>{label}</button>
                ))}
              </div>
              <button className="btn btn-red btn-full" type="submit">Search catalogue <Search size={18} /></button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function Footer() {
  const contactItems = useMemo(
    () => [businessConfig.phone, businessConfig.email, businessConfig.address].filter(Boolean),
    [],
  );
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src="/logo.svg" alt="MoCars" />
          <p>New and used vehicles. New and used auto parts. One focused automotive marketplace.</p>
        </div>
        <div>
          <h3>Vehicles</h3>
          <Link to="/used-cars">Used Cars</Link>
          <Link to="/new-cars">New Cars</Link>
          <Link to="/search?type=vehicles">Search Vehicles</Link>
        </div>
        <div>
          <h3>Auto Parts</h3>
          <Link to="/auto-parts">All Auto Parts</Link>
          <Link to="/auto-parts?condition=New">New Auto Parts</Link>
          <Link to="/auto-parts?condition=Used">Used Auto Parts</Link>
          <Link to="/cart">Shopping Cart</Link>
        </div>
        <div>
          <h3>Contact</h3>
          {contactItems.length ? contactItems.map((item) => <span key={item}>{item}</span>) : (
            <span className="config-note">Contact details pending configuration.</span>
          )}
          <div className="social-links">
            {businessConfig.social.facebook && <a href={businessConfig.social.facebook} aria-label="Facebook"><Facebook /></a>}
            {businessConfig.social.instagram && <a href={businessConfig.social.instagram} aria-label="Instagram"><Instagram /></a>}
            {!businessConfig.social.facebook && !businessConfig.social.instagram && <span className="config-note">Social links pending.</span>}
          </div>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} MoCars. All rights reserved.</span>
        <span>Inventory details are subject to confirmation.</span>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { toast } = useShop();
  return (
    <div className="app-shell">
      <Header />
      <main id="main-content"><Outlet /></main>
      <Footer />
      {toast && <div className={`toast ${toast.tone}`} role="status">{toast.message}</div>}
    </div>
  );
}

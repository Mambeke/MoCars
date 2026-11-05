import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Check,
  Facebook,
  Instagram,
  MessageCircle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext.jsx';
import { businessConfig, whatsappLink } from '../config/business.js';
import { Modal } from './UI.jsx';

const emptyEnquiry = {
  name: '',
  phone: '',
  email: '',
  interest: 'vehicle',
  message: '',
};

function Header() {
  const { submitEnquiry } = useShop();
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [form, setForm] = useState(emptyEnquiry);
  const [status, setStatus] = useState({ loading: false, error: '', reference: '' });
  const navRef = useRef(null);
  const [navScroll, setNavScroll] = useState({ scrollable: false, width: 0, offset: 0 });

  const syncNavScroll = useCallback(() => {
    const element = navRef.current;
    if (!element) return;
    const { scrollWidth, clientWidth, scrollLeft } = element;
    const overflow = scrollWidth - clientWidth;
    const scrollable = overflow > 2;
    const width = scrollable ? Math.max((clientWidth / scrollWidth) * 100, 22) : 0;
    const offset = scrollable ? (scrollLeft / overflow) * (100 - width) : 0;
    setNavScroll({ scrollable, width, offset });
  }, []);

  useEffect(() => {
    syncNavScroll();
    const element = navRef.current;
    if (!element) return undefined;
    element.addEventListener('scroll', syncNavScroll, { passive: true });
    window.addEventListener('resize', syncNavScroll);
    return () => {
      element.removeEventListener('scroll', syncNavScroll);
      window.removeEventListener('resize', syncNavScroll);
    };
  }, [syncNavScroll]);
  const location = useLocation();

  useEffect(() => {
    setEnquiryOpen(false);
  }, [location.pathname]);

  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  const openEnquiry = () => {
    setStatus({ loading: false, error: '', reference: '' });
    setEnquiryOpen(true);
  };

  const submitGeneralEnquiry = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', reference: '' });
    try {
      const result = await submitEnquiry({
        name: form.name,
        phone: form.phone,
        email: form.email,
        type: form.interest,
        itemName: form.interest === 'vehicle' ? 'Vehicle enquiry' : form.interest === 'auto-part' ? 'Auto-part enquiry' : 'General enquiry',
        message: form.message,
      });
      setStatus({ loading: false, error: '', reference: result.reference });
    } catch (error) {
      setStatus({ loading: false, error: error.message, reference: '' });
    }
  };

  const whatsappNumber = businessConfig.whatsapp.replace(/\D/g, '');

  return (
    <>
      <header className="site-header">
        <div className="header-inner container-wide">
          <Link className="brand" to="/" aria-label="MoCars home">
            <span className="logo-surface header-logo">
              <img src="/images/mocars-swoosh-logo.png" alt="MoCars" />
            </span>
          </Link>
          <div className="nav-scroll">
            <nav className="main-nav" aria-label="Main navigation" ref={navRef}>
              <NavLink to="/" end className={navClass}>Home</NavLink>
              <NavLink to="/new-cars" className={navClass}>New Cars</NavLink>
              <NavLink to="/used-cars" className={navClass}>Used Cars</NavLink>
              <NavLink to="/auto-parts" className={navClass}>Auto Parts</NavLink>
            </nav>
            {navScroll.scrollable && (
              <div className="nav-scroll-bar" aria-hidden="true">
                <span style={{ width: `${navScroll.width}%`, left: `${navScroll.offset}%` }} />
              </div>
            )}
          </div>
          <div className={`header-actions${whatsappNumber ? ' has-whatsapp' : ''}`}>
            <button className="btn btn-red header-enquiry-button" type="button" onClick={openEnquiry} aria-haspopup="dialog">
              <MessageCircle aria-hidden="true" />
              <span>Inquire Now</span>
            </button>
            {whatsappNumber && (
              <a
                className="btn header-whatsapp-button"
                href={whatsappLink('Hello MoCars, I need help with a vehicle or an auto part.')}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat with MoCars on WhatsApp"
              >
                <MessageCircle aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <Modal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} eyebrow="Talk to MoCars" title="How can we help?">
        {status.reference ? (
          <div className="form-success">
            <Check />
            <h3>Inquiry submitted</h3>
            <p>Thank you. MoCars has received your inquiry.</p>
            <div className="reference-box"><span>Your reference</span><strong>{status.reference}</strong><small>Keep this reference for follow-up.</small></div>
            <button className="btn btn-navy btn-full" type="button" onClick={() => { setEnquiryOpen(false); setForm(emptyEnquiry); }}>Done</button>
          </div>
        ) : (
          <form className="stacked-form" onSubmit={submitGeneralEnquiry}>
            <p>Tell us whether you are looking for a vehicle or an auto part, and MoCars will follow up using the details below.</p>
            <div className="form-grid two">
              <label className="field"><span>Full name</span><input required minLength="2" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="field"><span>Phone number</span><input required minLength="6" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
              <label className="field"><span>Email address <small>(optional)</small></span><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label className="field"><span>I am interested in</span><select value={form.interest} onChange={(event) => setForm({ ...form, interest: event.target.value })}><option value="vehicle">Buying a vehicle</option><option value="auto-part">Finding an auto part</option><option value="general">A general question</option></select></label>
            </div>
            <label className="field"><span>How can we help?</span><textarea required minLength="3" rows="4" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us what you are looking for" /></label>
            {status.error && <p className="form-error" role="alert">{status.error}</p>}
            <button className="btn btn-red btn-full" type="submit" disabled={status.loading}>{status.loading ? 'Submitting…' : 'Send Inquiry'}</button>
          </form>
        )}
      </Modal>
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
          <span className="logo-surface footer-logo">
            <img src="/images/mocars-swoosh-logo.png" alt="MoCars" />
          </span>
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
        <span>Inventory details are subject to confirmation. <a className="footer-admin-link" href="/admin">Admin</a></span>
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

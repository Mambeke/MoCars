import React, { useMemo, useState } from 'react';
import { Heart, LogOut, PackageCheck, UserRound } from 'lucide-react';
import { PartCard, VehicleCard } from '../components/Cards.jsx';
import { Breadcrumbs } from '../components/UI.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { useShop } from '../context/ShopContext.jsx';
import { formatPrice } from '../data/inventory.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function AccountPage() {
  const { parts, vehicles } = useInventory();
  const { profile, favorites, history, login, register, logout, updateProfile } = useShop();
  const [authMode, setAuthMode] = useState('login');
  const [active, setActive] = useState('overview');
  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [editForm, setEditForm] = useState(() => ({ name: profile?.name || '', phone: profile?.phone || '', email: profile?.email || '' }));
  const [status, setStatus] = useState({ loading: false, error: '' });
  usePageMeta('My Account', 'Sign in to MoCars to manage saved vehicles, saved auto parts and order enquiry history.');

  const savedVehicles = useMemo(() => vehicles.filter((item) => favorites.includes(item.id)), [favorites, vehicles]);
  const savedParts = useMemo(() => parts.filter((item) => favorites.includes(item.id)), [favorites, parts]);

  const authenticate = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '' });
    try {
      const result = authMode === 'login' ? await login({ email: authForm.email, password: authForm.password }) : await register(authForm);
      setEditForm({ name: result.name, email: result.email, phone: result.phone || '' });
      setStatus({ loading: false, error: '' });
    } catch (error) {
      setStatus({ loading: false, error: error.message });
    }
  };

  if (!profile) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'My Account' }]} />
        <section className="section auth-page">
          <div className="container auth-layout">
            <div className="auth-message">
              <span className="eyebrow light">Your MoCars space</span>
              <h1>Save what matters.<br />Track every enquiry.</h1>
              <p>Browsing does not require an account. Sign in only when you want to keep saved listings and view activity from this browser.</p>
              <ul><li><Heart />Saved vehicles and parts</li><li><PackageCheck />Parts order enquiry history</li><li><UserRound />Basic profile management</li></ul>
            </div>
            <div className="auth-card">
              <div className="auth-tabs"><button className={authMode === 'login' ? 'active' : ''} type="button" onClick={() => { setAuthMode('login'); setStatus({ loading: false, error: '' }); }}>Sign In</button><button className={authMode === 'register' ? 'active' : ''} type="button" onClick={() => { setAuthMode('register'); setStatus({ loading: false, error: '' }); }}>Register</button></div>
              <form className="stacked-form" onSubmit={authenticate}>
                <div><span className="eyebrow">{authMode === 'login' ? 'Welcome back' : 'Create an account'}</span><h2>{authMode === 'login' ? 'Sign in to MoCars' : 'Register with MoCars'}</h2></div>
                {authMode === 'register' && <>
                  <label className="field"><span>Full name</span><input required minLength="2" autoComplete="name" value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} /></label>
                  <label className="field"><span>Phone number</span><input type="tel" autoComplete="tel" value={authForm.phone} onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })} /></label>
                </>}
                <label className="field"><span>Email address</span><input required type="email" autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} /></label>
                <label className="field"><span>Password</span><input required minLength="8" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /><small>Minimum 8 characters.</small></label>
                {status.error && <p className="form-error" role="alert">{status.error}</p>}
                <button className="btn btn-red btn-full" type="submit" disabled={status.loading}>{status.loading ? 'Please wait…' : authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
              </form>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'My Account' }]} />
      <section className="account-header"><div className="container"><div className="account-avatar">{profile.name.slice(0, 1).toUpperCase()}</div><div><span className="eyebrow light">My account</span><h1>Hello, {profile.name.split(' ')[0]}</h1><p>{profile.email}</p></div><button className="btn btn-outline-light" type="button" onClick={logout}><LogOut /> Sign Out</button></div></section>
      <section className="section account-page">
        <div className="container account-layout">
          <nav className="account-nav" aria-label="Account sections">
            {[['overview', 'Overview'], ['saved', `Saved (${favorites.length})`], ['activity', 'Orders & Enquiries'], ['profile', 'Profile']].map(([value, label]) => <button className={active === value ? 'active' : ''} key={value} type="button" onClick={() => setActive(value)}>{label}</button>)}
          </nav>
          <div className="account-content">
            {active === 'overview' && <><div className="account-stat-grid"><button type="button" onClick={() => setActive('saved')}><Heart /><strong>{favorites.length}</strong><span>Saved items</span></button><button type="button" onClick={() => setActive('activity')}><PackageCheck /><strong>{history.orders.length}</strong><span>Order enquiries</span></button><button type="button" onClick={() => setActive('activity')}><UserRound /><strong>{history.enquiries.length}</strong><span>Vehicle enquiries</span></button></div><div className="account-welcome-card"><span className="eyebrow">Account overview</span><h2>Your recent MoCars activity</h2><p>Saved listings, test-drive requests and order enquiries submitted from this browser appear here.</p></div></>}
            {active === 'saved' && <div><span className="eyebrow">Wishlist</span><h2>Saved Vehicles & Parts</h2>{!favorites.length ? <div className="account-empty"><Heart /><h3>No saved items yet</h3><p>Use the heart icon on any vehicle or auto part to save it here.</p></div> : <>{savedVehicles.length > 0 && <><h3 className="subsection-title">Vehicles</h3><div className="catalogue-grid">{savedVehicles.map((item) => <VehicleCard key={item.id} vehicle={item} />)}</div></>}{savedParts.length > 0 && <><h3 className="subsection-title">Auto Parts</h3><div className="catalogue-grid">{savedParts.map((item) => <PartCard key={item.id} part={item} />)}</div></>}</>}</div>}
            {active === 'activity' && <div><span className="eyebrow">Account history</span><h2>Orders & Enquiries</h2><h3 className="subsection-title">Parts order enquiries</h3>{history.orders.length ? <div className="history-list">{history.orders.map((order) => <article key={order.reference}><span><strong>{order.reference}</strong><small>{new Date(order.createdAt).toLocaleDateString()} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} items</small></span><b>{formatPrice(order.total)}</b></article>)}</div> : <p className="muted">No parts order enquiries have been submitted from this browser.</p>}<h3 className="subsection-title">Vehicle enquiries</h3>{history.enquiries.length ? <div className="history-list">{history.enquiries.map((enquiry) => <article key={enquiry.reference}><span><strong>{enquiry.itemName || 'General enquiry'}</strong><small>{enquiry.reference} · {new Date(enquiry.createdAt).toLocaleDateString()}</small></span><b className="status-chip">Received</b></article>)}</div> : <p className="muted">No vehicle enquiries have been submitted from this browser.</p>}</div>}
            {active === 'profile' && <div><span className="eyebrow">Personal details</span><h2>Manage Profile</h2><form className="profile-form" onSubmit={(event) => { event.preventDefault(); updateProfile(editForm); }}><label className="field"><span>Full name</span><input required minLength="2" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label><label className="field"><span>Email address</span><input type="email" disabled value={editForm.email} /></label><label className="field"><span>Phone number</span><input type="tel" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></label><button className="btn btn-navy" type="submit">Save Profile</button></form></div>}
          </div>
        </div>
      </section>
    </>
  );
}

import React, { useState } from 'react';
import { Check, ChevronLeft, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/UI.jsx';
import { useShop } from '../context/ShopContext.jsx';
import { formatPrice } from '../data/inventory.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function CheckoutPage() {
  const { cartDetails, cartCount, cartTotal, profile, submitOrder } = useShop();
  const [form, setForm] = useState({ name: profile?.name || '', phone: profile?.phone || '', email: profile?.email || '', address: '', city: '' });
  const [status, setStatus] = useState({ loading: false, error: '', result: null });
  usePageMeta('Checkout', 'Submit your MoCars auto-parts order enquiry for stock, compatibility and delivery confirmation.');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', result: null });
    try {
      const result = await submitOrder(form);
      setStatus({ loading: false, error: '', result });
    } catch (error) {
      setStatus({ loading: false, error: error.message, result: null });
    }
  };

  if (status.result) {
    return <section className="section checkout-success"><div className="container narrow"><div className="success-icon"><Check /></div><span className="eyebrow">Order enquiry submitted</span><h1>Thank you, {form.name.split(' ')[0]}.</h1><p>{status.result.message}</p><div className="reference-box"><span>Your reference</span><strong>{status.result.reference}</strong><small>Keep this reference for follow-up.</small></div><p className="muted">This is not a payment confirmation. MoCars must still confirm stock, fitment, delivery and payment arrangements.</p><div className="button-row centered"><Link className="btn btn-navy" to="/account">View Account</Link><Link className="btn btn-outline-dark" to="/auto-parts">Continue Shopping</Link></div></div></section>;
  }

  if (!cartDetails.length) {
    return <section className="section checkout-empty"><div className="container narrow"><h1>No parts to check out</h1><p>Add an auto part to your cart before opening checkout.</p><Link className="btn btn-red" to="/auto-parts">Browse Auto Parts</Link></div></section>;
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Shopping Cart', to: '/cart' }, { label: 'Checkout' }]} />
      <section className="section checkout-page">
        <div className="container checkout-layout">
          <div>
            <span className="eyebrow">Order enquiry</span><h1>Checkout</h1>
            <p className="checkout-intro">Provide your contact and delivery details. Submitting this form sends a real order enquiry; no payment is taken online.</p>
            <form className="checkout-form" onSubmit={submit}>
              <section className="form-card"><h2>Customer details</h2><div className="form-grid two">
                <label className="field"><span>Full name</span><input required minLength="2" autoComplete="name" value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
                <label className="field"><span>Phone number</span><input required minLength="6" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
                <label className="field full"><span>Email address</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
              </div></section>
              <section className="form-card"><h2>Delivery details</h2><div className="form-grid two">
                <label className="field full"><span>Delivery address</span><input required autoComplete="street-address" value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
                <label className="field"><span>City</span><input required autoComplete="address-level2" value={form.city} onChange={(event) => update('city', event.target.value)} /></label>
              </div></section>
              <section className="form-card"><h2>Payment method</h2><label className="payment-option selected"><input type="radio" checked readOnly /><span><strong>Order enquiry</strong><small>Payment arrangements will be confirmed after stock, compatibility and delivery checks.</small></span></label></section>
              {status.error && <p className="form-error" role="alert">{status.error}</p>}
              <button className="btn btn-red btn-full btn-large" type="submit" disabled={status.loading}>{status.loading ? 'Submitting order enquiry…' : 'Submit Order Enquiry'}</button>
              <p className="secure-form-note"><LockKeyhole /> Your request is sent to the MoCars order system.</p>
            </form>
          </div>
          <aside className="checkout-summary">
            <h2>Order Summary</h2>
            <div className="checkout-items">{cartDetails.map(({ product, quantity, subtotal }) => <div className="checkout-item" key={product.id}><img src={product.images[0]} alt="" /><span><strong>{product.name}</strong><small>Qty {quantity} · {product.condition}</small></span><b>{formatPrice(subtotal)}</b></div>)}</div>
            <div className="summary-row"><span>Items ({cartCount})</span><strong>{formatPrice(cartTotal)}</strong></div>
            <div className="summary-row"><span>Delivery</span><strong>To be confirmed</strong></div>
            <div className="summary-total"><span>Catalogue total</span><strong>{formatPrice(cartTotal)}</strong></div>
            <Link className="back-cart-link" to="/cart"><ChevronLeft /> Edit Cart</Link>
          </aside>
        </div>
      </section>
    </>
  );
}

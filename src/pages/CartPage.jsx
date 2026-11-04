import React from 'react';
import { Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/UI.jsx';
import { useShop } from '../context/ShopContext.jsx';
import { formatPrice } from '../data/inventory.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function CartPage() {
  const { cartDetails, cartCount, cartTotal, updateQuantity, removeFromCart } = useShop();
  usePageMeta('Shopping Cart', 'Review auto parts in your MoCars shopping cart and submit an order enquiry.');
  return (
    <>
      <Breadcrumbs items={[{ label: 'Shopping Cart' }]} />
      <section className="section cart-page">
        <div className="container">
          <div className="section-heading"><div><span className="eyebrow">Auto parts order</span><h1>Your Shopping Cart</h1></div>{cartCount > 0 && <span className="cart-items-label">{cartCount} {cartCount === 1 ? 'item' : 'items'}</span>}</div>
          {!cartDetails.length ? (
            <div className="empty-cart"><div><ShoppingBag /></div><h2>Your cart is empty</h2><p>Browse new and used auto parts, check compatibility and add the parts you need.</p><Link className="btn btn-red" to="/auto-parts">Browse Auto Parts</Link></div>
          ) : (
            <div className="cart-layout">
              <div className="cart-list">
                {cartDetails.map(({ product, quantity, subtotal }) => (
                  <article className="cart-item" key={product.id}>
                    <Link className="cart-item-image" to={`/auto-parts/${product.id}`}><img src={product.images[0]} alt={product.name} /></Link>
                    <div className="cart-item-info">
                      <span className={`condition-pill ${product.condition.toLowerCase()}`}>{product.condition}</span>
                      <h2><Link to={`/auto-parts/${product.id}`}>{product.name}</Link></h2>
                      <p>{product.compatibleMakes.length ? `Fits: ${product.compatibleMakes.join(', ')} ${product.compatibleModels.join(', ')}` : 'Compatibility confirmation required'}</p>
                      <span className="line-price">{formatPrice(product.price)} each</span>
                    </div>
                    <div className="cart-item-controls">
                      <div className="quantity-control small">
                        <button type="button" onClick={() => updateQuantity(product.id, quantity - 1)} aria-label="Decrease quantity"><Minus /></button>
                        <input type="number" min="1" max="99" value={quantity} onChange={(event) => updateQuantity(product.id, event.target.value)} aria-label={`Quantity of ${product.name}`} />
                        <button type="button" onClick={() => updateQuantity(product.id, quantity + 1)} aria-label="Increase quantity"><Plus /></button>
                      </div>
                      <strong>{formatPrice(subtotal)}</strong>
                      <button className="remove-button" type="button" onClick={() => removeFromCart(product.id)}><Trash2 /> Remove</button>
                    </div>
                  </article>
                ))}
                <Link className="text-link continue-link" to="/auto-parts">← Continue shopping</Link>
              </div>
              <aside className="order-summary">
                <span className="eyebrow">Order summary</span><h2>Requested Parts</h2>
                <div className="summary-row"><span>Items ({cartCount})</span><strong>{formatPrice(cartTotal)}</strong></div>
                <div className="summary-row"><span>Delivery</span><strong>To be confirmed</strong></div>
                <div className="summary-total"><span>Catalogue total</span><strong>{formatPrice(cartTotal)}</strong></div>
                <Link className="btn btn-red btn-full" to="/checkout">Proceed to Checkout</Link>
                <div className="summary-note"><ShieldCheck /><p><strong>Order enquiry only</strong>Stock, compatibility, delivery and payment arrangements will be confirmed before fulfilment.</p></div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

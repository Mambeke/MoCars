import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PartCard } from '../components/Cards.jsx';
import Gallery from '../components/Gallery.jsx';
import { Breadcrumbs, SectionHeading } from '../components/UI.jsx';
import { businessConfig, whatsappLink } from '../config/business.js';
import { useInventory } from '../context/InventoryContext.jsx';
import { useShop } from '../context/ShopContext.jsx';
import { formatPrice } from '../data/inventory.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function PartDetailPage() {
  const { parts } = useInventory();
  const { id } = useParams();
  const part = parts.find((item) => item.id === id);
  const { addToCart } = useShop();
  const [quantity, setQuantity] = useState(1);
  usePageMeta(part?.name || 'Part Not Found', part ? `${part.condition} ${part.name}. View compatibility, condition and order options.` : 'Auto part not found.');

  const related = useMemo(() => part ? parts.filter((item) => item.id !== part.id && (item.category === part.category || item.compatibleMakes.some((make) => part.compatibleMakes.includes(make)))).slice(0, 3) : [], [part, parts]);

  if (!part) return <section className="not-found section"><div className="container"><span className="eyebrow">Product unavailable</span><h1>Auto part not found</h1><p>This product may have moved or is no longer listed.</p><Link className="btn btn-red" to="/auto-parts">Browse auto parts</Link></div></section>;

  const compatibility = part.compatibleMakes.length
    ? part.compatibleMakes.map((make, index) => `${make}${part.compatibleModels[index] ? ` ${part.compatibleModels[index]}` : ''}`).join(', ')
    : 'Vehicle compatibility has not yet been supplied.';
  const message = `Hello MoCars, I am interested in ${part.name} (${part.reference}). Please confirm availability and compatibility for my vehicle.`;
  const buyNow = () => { addToCart(part.id, quantity); window.location.assign('/checkout'); };

  return (
    <>
      <Breadcrumbs items={[{ label: 'Auto Parts', to: '/auto-parts' }, { label: part.category, to: `/auto-parts?q=${encodeURIComponent(part.category)}` }, { label: part.name }]} />
      <section className="part-detail-section">
        <div className="container part-detail-grid">
          <Gallery images={part.images} alt={part.name} badge={part.condition} />
          <div className="part-info-panel">
            <div className="product-kicker"><span className={`condition-pill ${part.condition.toLowerCase()}`}>{part.condition}</span><span>{part.category}</span></div>
            <h1>{part.name}</h1>
            <p className="part-ref">Listing ref: {part.reference}</p>
            <strong className="detail-price">{formatPrice(part.price)}</strong>
            <div className="stock-status"><span />{part.availability}</div>
            <dl className="part-quick-facts">
              <div><dt>Part number</dt><dd>{part.partNumber || 'On request'}</dd></div>
              <div><dt>Condition</dt><dd>{part.condition}</dd></div>
              <div><dt>Compatible with</dt><dd>{compatibility}</dd></div>
              <div><dt>Manufacturer</dt><dd>{part.manufacturer || 'Not supplied'}</dd></div>
            </dl>
            <div className="purchase-row">
              <div className="quantity-control" aria-label="Quantity selector">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus /></button>
                <input type="number" min="1" max="99" value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))} aria-label="Quantity" />
                <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} aria-label="Increase quantity"><Plus /></button>
              </div>
              <button className="btn btn-red purchase-button" type="button" onClick={() => addToCart(part.id, quantity)}><ShoppingCart /> Add to Cart</button>
            </div>
            <button className="btn btn-navy btn-full" type="button" onClick={buyNow}>Buy Now — Submit Order Enquiry</button>
            <a className="btn btn-outline-dark btn-full" href={whatsappLink(message)} target="_blank" rel="noreferrer"><MessageCircle /> Enquire on WhatsApp</a>
            {!businessConfig.whatsapp && <p className="config-hint">WhatsApp opens with a pre-filled message. The business recipient number is pending configuration.</p>}
            <p className="purchase-note">No payment is taken online. Checkout submits an order enquiry so stock, compatibility and delivery can be confirmed.</p>
          </div>
        </div>
      </section>

      <section className="section part-description-section light-section">
        <div className="container part-description-grid">
          <article><span className="eyebrow">Product information</span><h2>Description</h2><p>{part.description}</p></article>
          <article><span className="eyebrow">Fitment check</span><h2>Compatibility</h2><ul className="compat-list"><li><Check />Compatible makes: {part.compatibleMakes.length ? part.compatibleMakes.join(', ') : 'Not supplied'}</li><li><Check />Compatible models: {part.compatibleModels.length ? part.compatibleModels.join(', ') : 'Not supplied'}</li><li><Check />Compatible years: {part.compatibleYears.length ? part.compatibleYears.join(', ') : 'Confirm with MoCars'}</li><li><Check />Part number: {part.partNumber || 'Confirm with MoCars'}</li></ul></article>
        </div>
      </section>

      {related.length > 0 && <section className="section"><div className="container"><SectionHeading eyebrow="Continue shopping" title="Related Parts" linkTo="/auto-parts" linkLabel="View All Parts" /><div className="catalogue-grid">{related.map((item) => <PartCard key={item.id} part={item} />)}</div></div></section>}
      <section className="next-step-band"><div className="container"><div><span className="eyebrow light">Need a different fitment?</span><h2>Search the complete parts catalogue.</h2></div><Link className="btn btn-red" to="/auto-parts">Browse all parts <ChevronRight /></Link></div></section>
    </>
  );
}

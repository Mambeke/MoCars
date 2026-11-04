import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  CarFront,
  Check,
  Cog,
  Fuel,
  Gauge,
  MapPin,
  MessageCircle,
  Phone,
  Route,
  Settings2,
  UsersRound,
} from 'lucide-react';
import Gallery from '../components/Gallery.jsx';
import { VehicleCard } from '../components/Cards.jsx';
import { Breadcrumbs, Modal, SectionHeading } from '../components/UI.jsx';
import { businessConfig, telLink, whatsappLink } from '../config/business.js';
import { useInventory } from '../context/InventoryContext.jsx';
import { useShop } from '../context/ShopContext.jsx';
import { formatMileage, formatPrice } from '../data/inventory.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

const icons = { mileage: Gauge, engine: Cog, transmission: Settings2, fuel: Fuel, drivetrain: Route, bodyType: CarFront };

export default function VehicleDetailPage() {
  const { vehicles } = useInventory();
  const { id } = useParams();
  const vehicle = vehicles.find((item) => item.id === id);
  const { notify, submitEnquiry } = useShop();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', preferredDate: '', preferredTime: '', message: '' });
  const [status, setStatus] = useState({ loading: false, error: '', success: '' });
  usePageMeta(vehicle?.title || 'Vehicle Not Found', vehicle ? `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.title}. View photographs, supplied specifications and enquiry options.` : 'Vehicle listing not found.');

  const similar = useMemo(() => {
    if (!vehicle) return [];
    return vehicles.filter((item) => item.id !== vehicle.id && (item.make === vehicle.make || item.bodyType === vehicle.bodyType)).slice(0, 3);
  }, [vehicle, vehicles]);

  if (!vehicle) {
    return <section className="not-found section"><div className="container"><span className="eyebrow">Listing unavailable</span><h1>Vehicle not found</h1><p>This listing may have moved or is no longer available.</p><Link className="btn btn-red" to="/used-cars">Browse vehicles</Link></div></section>;
  }

  const whatsappMessage = `Hello MoCars, I am interested in the ${vehicle.title} (${vehicle.reference}). Please share the latest availability and details.`;
  const phoneHref = telLink();
  const specs = [
    { key: 'mileage', label: 'Mileage', value: formatMileage(vehicle.mileage) },
    { key: 'engine', label: 'Engine', value: vehicle.engine },
    { key: 'transmission', label: 'Transmission', value: vehicle.transmission },
    { key: 'fuel', label: 'Fuel', value: vehicle.fuel },
    { key: 'drivetrain', label: 'Drive', value: vehicle.drivetrain },
    { key: 'bodyType', label: 'Body', value: vehicle.bodyType },
  ].filter((spec) => spec.value);

  const fullSpecs = [
    ['Make', vehicle.make], ['Model', vehicle.model], ['Year', vehicle.year],
    ['Mileage', Number.isFinite(vehicle.mileage) ? formatMileage(vehicle.mileage) : null],
    ['Engine', vehicle.engine], ['Fuel', vehicle.fuel], ['Transmission', vehicle.transmission],
    ['Drivetrain', vehicle.drivetrain], ['Exterior colour', vehicle.exteriorColor],
    ['Interior colour', vehicle.interiorColor], ['Body type', vehicle.bodyType],
    ['Seating capacity', vehicle.seatingCapacity ? `${vehicle.seatingCapacity} seats` : null],
    ['Condition', vehicle.condition], ['Listing reference', vehicle.reference],
    ['Availability', vehicle.availability],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  const book = async (event) => {
    event.preventDefault();
    setStatus({ loading: true, error: '', success: '' });
    try {
      const result = await submitEnquiry({
        ...form,
        type: 'test-drive',
        itemId: vehicle.id,
        itemName: vehicle.title,
        listingReference: vehicle.reference,
      });
      setStatus({ loading: false, error: '', success: `Request received. Your reference is ${result.reference}.` });
    } catch (error) {
      setStatus({ loading: false, error: error.message, success: '' });
    }
  };

  return (
    <>
      <Breadcrumbs items={[
        { label: `${vehicle.condition} Cars`, to: vehicle.condition === 'New' ? '/new-cars' : '/used-cars' },
        { label: vehicle.make, to: `${vehicle.condition === 'New' ? '/new-cars' : '/used-cars'}?q=${vehicle.make}` },
        { label: vehicle.title },
      ]} />
      <section className="vehicle-detail-section">
        <div className="container vehicle-detail-grid">
          <Gallery images={vehicle.images} alt={vehicle.title} badge={vehicle.condition} />
          <div className="vehicle-panel">
            <div className="vehicle-title-block">
              <span className={`condition-pill ${vehicle.condition.toLowerCase()}`}>{vehicle.condition}</span>
              <span className="listing-reference">Ref: {vehicle.reference}</span>
              <h1>{vehicle.title}</h1>
              <div className="vehicle-summary-line">
                <span>{vehicle.year || 'Year on request'}</span><span>{vehicle.fuel || 'Fuel on request'}</span><span>{vehicle.transmission || 'Transmission on request'}</span><span>{vehicle.bodyType || 'Body on request'}</span>
              </div>
              <strong className="detail-price">{formatPrice(vehicle.price)}</strong>
            </div>

            <div className="spec-summary-grid">
              {specs.map((spec) => {
                const Icon = icons[spec.key];
                return <div key={spec.key}><Icon /><span>{spec.label}<strong>{spec.value}</strong></span></div>;
              })}
            </div>

            <div className="enquiry-actions">
              <a className="btn btn-red btn-full" href={whatsappLink(whatsappMessage)} target="_blank" rel="noreferrer"><MessageCircle /> Enquire on WhatsApp</a>
              {phoneHref ? (
                <a className="btn btn-outline-dark btn-full" href={phoneHref}><Phone /> Call Us</a>
              ) : (
                <button className="btn btn-outline-dark btn-full" type="button" onClick={() => notify('The MoCars telephone number is pending configuration.', 'neutral')}><Phone /> Call Us</button>
              )}
              <button className="btn btn-navy btn-full" type="button" onClick={() => { setBookingOpen(true); setStatus({ loading: false, error: '', success: '' }); }}><CalendarDays /> Book a Test Drive</button>
            </div>
            {!businessConfig.whatsapp && <p className="config-hint">WhatsApp opens with a pre-filled message. The business recipient number is pending configuration.</p>}
            <div className="location-card">
              <MapPin />
              <span>Vehicle Location<strong>{vehicle.location || 'Confirm location with MoCars'}</strong></span>
            </div>
          </div>
        </div>
      </section>

      <section className="section detail-content-section">
        <div className="container detail-content-grid">
          <article className="overview-card">
            <span className="eyebrow">Vehicle overview</span>
            <h2>About this {vehicle.model}</h2>
            <p>{vehicle.description}</p>
          </article>
          <article className="features-card">
            <span className="eyebrow">Supplied equipment</span>
            <h2>Key Features</h2>
            {vehicle.features.length ? <ul className="feature-list">{vehicle.features.map((feature) => <li key={feature}><Check />{feature}</li>)}</ul> : <p>Feature information has not yet been supplied for this listing. Contact MoCars for a full equipment list.</p>}
          </article>
        </div>
      </section>

      <section className="section specs-section light-section">
        <div className="container">
          <SectionHeading eyebrow="Vehicle data" title="Additional Specifications" />
          <dl className="spec-table">
            {fullSpecs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <p className="inventory-note">Specifications not supplied with this listing are intentionally omitted. Please confirm all vehicle details before purchase.</p>
        </div>
      </section>

      {similar.length > 0 && <section className="section"><div className="container"><SectionHeading eyebrow="Keep exploring" title="Similar Vehicles" linkTo={vehicle.condition === 'New' ? '/new-cars' : '/used-cars'} linkLabel="View All Cars" /><div className="catalogue-grid">{similar.map((item) => <VehicleCard vehicle={item} key={item.id} />)}</div></div></section>}

      <Modal open={bookingOpen} onClose={() => setBookingOpen(false)} eyebrow="Vehicle enquiry" title="Book a Test Drive">
        {status.success ? (
          <div className="form-success"><Check /><h3>Request submitted</h3><p>{status.success}</p><button className="btn btn-navy btn-full" type="button" onClick={() => setBookingOpen(false)}>Done</button></div>
        ) : (
          <form className="stacked-form" onSubmit={book}>
            <p>Request a preferred date and time for the {vehicle.title}. MoCars will confirm the appointment after reviewing availability.</p>
            <div className="form-grid two">
              <label className="field"><span>Customer name</span><input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label className="field"><span>Phone number</span><input required minLength="6" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
              <label className="field"><span>Preferred date</span><input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.preferredDate} onChange={(event) => setForm({ ...form, preferredDate: event.target.value })} /></label>
              <label className="field"><span>Preferred time</span><input required type="time" value={form.preferredTime} onChange={(event) => setForm({ ...form, preferredTime: event.target.value })} /></label>
            </div>
            <label className="field"><span>Optional message</span><textarea rows="4" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Anything MoCars should know?" /></label>
            {status.error && <p className="form-error" role="alert">{status.error}</p>}
            <button className="btn btn-red btn-full" type="submit" disabled={status.loading}>{status.loading ? 'Submitting…' : 'Submit Test-Drive Request'}</button>
          </form>
        )}
      </Modal>
    </>
  );
}

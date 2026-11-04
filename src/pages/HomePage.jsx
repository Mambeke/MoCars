import React from 'react';
import { ArrowRight, CarFront, Cog, SearchCheck, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PartCard, VehicleCard } from '../components/Cards.jsx';
import { SectionHeading } from '../components/UI.jsx';
import { parts, vehicles } from '../data/inventory.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

const categories = [
  {
    title: 'Used Cars',
    label: 'Browse pre-owned inventory',
    image: '/images/land-cruiser-front.jpg',
    to: '/used-cars',
  },
  {
    title: 'New Cars',
    label: 'Explore new vehicles',
    image: '/images/cx5.jpg',
    to: '/new-cars',
  },
  {
    title: 'Auto Parts',
    label: 'Shop new and used parts',
    image: '/images/brake-kit.jpg',
    to: '/auto-parts',
  },
];

export default function HomePage() {
  usePageMeta('Cars & Auto Parts', 'Browse new and used cars and shop new and used auto parts from MoCars.');
  return (
    <>
      <section className="home-hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="container hero-content">
          <span className="hero-kicker">Cars and Auto Parts in One Place</span>
          <h1>
            <span className="hero-line">Find Your Next Car.</span>
            <span className="hero-line">Discover Quality Auto Parts.</span>
          </h1>
          <div className="hero-actions">
            <Link className="btn btn-red btn-large" to="/used-cars"><CarFront /> Browse Cars <ArrowRight /></Link>
            <Link className="btn btn-glass btn-large" to="/auto-parts"><Cog /> Check Your Part <ArrowRight /></Link>
          </div>
        </div>
      </section>

      <section className="facts-strip-wrap" aria-label="What you can find on MoCars">
        <div className="facts-strip container">
          <div><CarFront /><span><strong>New & Used</strong>Vehicles</span></div>
          <div><Cog /><span><strong>New & Used</strong>Auto Parts</span></div>
          <div><SearchCheck /><span><strong>Search by</strong>Vehicle or Part</span></div>
          <div><ShoppingBag /><span><strong>Separate</strong>Order Workflows</span></div>
        </div>
      </section>

      <section className="section category-section">
        <div className="container">
          <SectionHeading eyebrow="Start here" title="Browse by Category" />
          <div className="category-grid">
            {categories.map((category) => (
              <Link className="category-card" to={category.to} key={category.title}>
                <img src={category.image} alt="" />
                <div className="category-overlay" />
                <div className="category-copy">
                  <span>{category.label}</span>
                  <h3>{category.title}</h3>
                  <strong>Explore now <ArrowRight size={18} /></strong>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section light-section">
        <div className="container">
          <SectionHeading eyebrow="Selected inventory" title="Featured Vehicles" linkTo="/used-cars" linkLabel="View All Cars" />
          <div className="featured-grid four">
            {vehicles.filter((vehicle) => vehicle.featured).map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} compact />)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Parts catalogue" title="New & Used Auto Parts" linkTo="/auto-parts" linkLabel="View All Parts" />
          <div className="featured-grid four">
            {parts.filter((part) => part.featured).map((part) => <PartCard key={part.id} part={part} compact />)}
          </div>
        </div>
      </section>

      <section className="promo-section section">
        <div className="container">
          <div className="promo-banner">
            <img src="/images/fortuner.jpg" alt="Premium SUV at a dealership" />
            <div className="promo-gradient" />
            <div className="promo-copy">
              <span className="eyebrow light">Vehicle catalogue</span>
              <h2>Compare the details.<br />Choose with confidence.</h2>
              <p>Explore factual specifications, clear pricing and dedicated enquiry actions for every listed vehicle.</p>
              <Link className="btn btn-red" to="/used-cars">Browse Cars <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section latest-section light-section">
        <div className="container">
          <SectionHeading eyebrow="Catalogue highlights" title="Latest Arrivals" />
          <div className="latest-layout">
            <div className="latest-feature">
              <img src={vehicles[0].images[0]} alt={vehicles[0].title} />
              <div>
                <span className="condition-badge used">Used</span>
                <h3>{vehicles[0].title}</h3>
                <p>Open the listing to inspect the full photo gallery, supplied specifications and enquiry options.</p>
                <Link className="text-link" to={`/vehicles/${vehicles[0].id}`}>View vehicle <ArrowRight size={18} /></Link>
              </div>
            </div>
            <div className="latest-list">
              {parts.slice(0, 3).map((part) => (
                <Link className="latest-row" key={part.id} to={`/auto-parts/${part.id}`}>
                  <img src={part.images[0]} alt="" />
                  <span><small>{part.condition} · {part.category}</small><strong>{part.name}</strong></span>
                  <ArrowRight />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PartCard, VehicleCard } from '../components/Cards.jsx';
import { EmptyState, PageHero, SectionHeading } from '../components/UI.jsx';
import { whatsappLink } from '../config/business.js';
import { parts, vehicles } from '../data/inventory.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function SearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get('q') || '';
  const type = params.get('type') || 'all';
  const [input, setInput] = useState(query);
  useEffect(() => setInput(query), [query]);
  usePageMeta(query ? `Search: ${query}` : 'Search', 'Search the MoCars vehicle and auto-parts catalogues.');

  const term = query.toLowerCase().trim();
  const vehicleResults = useMemo(() => !term ? [] : vehicles.filter((vehicle) => [vehicle.title, vehicle.make, vehicle.model, vehicle.year, vehicle.fuel, vehicle.transmission, vehicle.bodyType, vehicle.reference].filter(Boolean).join(' ').toLowerCase().includes(term)), [term]);
  const partResults = useMemo(() => !term ? [] : parts.filter((part) => [part.name, part.category, part.partNumber, part.reference, ...part.compatibleMakes, ...part.compatibleModels, ...part.searchableKeywords].filter(Boolean).join(' ').toLowerCase().includes(term)), [term]);
  const shownVehicles = type !== 'parts' ? vehicleResults : [];
  const shownParts = type !== 'vehicles' ? partResults : [];
  const total = shownVehicles.length + shownParts.length;

  const submit = (event) => {
    event.preventDefault();
    if (input.trim()) navigate(`/search?q=${encodeURIComponent(input.trim())}&type=${type}`);
  };
  const switchType = (next) => navigate(`/search?q=${encodeURIComponent(query)}&type=${next}`);

  return (
    <>
      <PageHero eyebrow="Catalogue search" title={query ? `Results for “${query}”` : 'Search MoCars'}><p>Vehicle and auto-parts results stay separated so each search remains relevant.</p></PageHero>
      <section className="search-results-section section">
        <div className="container">
          <form className="results-search" onSubmit={submit}><Search /><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search vehicles or auto parts" aria-label="Search query" /><button className="btn btn-red" type="submit">Search</button></form>
          <div className="result-tabs" role="tablist" aria-label="Result type">{[['all', 'Everything'], ['vehicles', `Vehicles (${vehicleResults.length})`], ['parts', `Auto Parts (${partResults.length})`]].map(([value, label]) => <button role="tab" aria-selected={type === value} className={type === value ? 'active' : ''} key={value} type="button" onClick={() => switchType(value)}>{label}</button>)}</div>
          {!query ? <EmptyState title="What are you looking for?" description="Enter a vehicle make, model, auto-part name or part number." /> : total === 0 ? <EmptyState description="Check the spelling, clear your search or ask MoCars to help source the item." onClear={() => navigate('/search')} action={<a className="btn btn-red" href={whatsappLink(`Hello MoCars, I searched for “${query}” but could not find it. Can you help?`)} target="_blank" rel="noreferrer">Enquire on WhatsApp</a>} /> : <>
            {shownVehicles.length > 0 && <section className="result-group"><SectionHeading eyebrow="Vehicle catalogue" title={`${shownVehicles.length} matching ${shownVehicles.length === 1 ? 'vehicle' : 'vehicles'}`} /><div className="catalogue-grid">{shownVehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div></section>}
            {shownParts.length > 0 && <section className="result-group"><SectionHeading eyebrow="Auto-parts catalogue" title={`${shownParts.length} matching ${shownParts.length === 1 ? 'part' : 'parts'}`} /><div className="catalogue-grid">{shownParts.map((part) => <PartCard key={part.id} part={part} />)}</div></section>}
          </>}
        </div>
      </section>
    </>
  );
}

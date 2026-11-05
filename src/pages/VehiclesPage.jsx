import React, { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { VehicleCard } from '../components/Cards.jsx';
import { EmptyState, PageHero } from '../components/UI.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { usePageMeta } from '../hooks/usePageMeta.js';

const initialFilters = {
  keyword: '', make: '', model: '', minPrice: '', maxPrice: '', year: '', maxMileage: '',
  fuel: '', transmission: '', bodyType: '', drivetrain: '', sort: 'featured',
};

const unique = (values) => [...new Set(values.filter(Boolean))].sort();

const conditionTabs = [
  { key: 'All', label: 'All Cars', path: '/cars' },
  { key: 'New', label: 'New Cars', path: '/new-cars' },
  { key: 'Used', label: 'Used Cars', path: '/used-cars' },
];

export default function VehiclesPage({ condition = 'All' }) {
  const { vehicles } = useInventory();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...initialFilters, keyword: searchParams.get('q') || '' }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const title = condition === 'All' ? 'All Cars for Sale' : `${condition} Cars for Sale`;
  const eyebrow = condition === 'All' ? 'New and used vehicle catalogue' : `${condition.toLowerCase()} vehicle catalogue`;
  const catalogue = useMemo(
    () => (condition === 'All' ? vehicles : vehicles.filter((vehicle) => vehicle.condition === condition)),
    [condition, vehicles],
  );
  const conditionCounts = useMemo(() => ({
    All: vehicles.length,
    New: vehicles.filter((vehicle) => vehicle.condition === 'New').length,
    Used: vehicles.filter((vehicle) => vehicle.condition === 'Used').length,
  }), [vehicles]);

  usePageMeta(title, `Browse ${condition === 'All' ? 'new and used' : condition.toLowerCase()} cars from MoCars and filter by make, price, year, fuel type, transmission and body type.`);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setFilters((current) => ({ ...current, keyword: q }));
  }, [searchParams]);

  const options = useMemo(() => ({
    makes: unique(catalogue.map((vehicle) => vehicle.make)),
    models: unique(catalogue.filter((vehicle) => !filters.make || vehicle.make === filters.make).map((vehicle) => vehicle.model)),
    years: unique(catalogue.map((vehicle) => vehicle.year)).sort((a, b) => b - a),
    fuels: unique(catalogue.map((vehicle) => vehicle.fuel)),
    transmissions: unique(catalogue.map((vehicle) => vehicle.transmission)),
    bodies: unique(catalogue.map((vehicle) => vehicle.bodyType)),
    drivetrains: unique(catalogue.map((vehicle) => vehicle.drivetrain)),
  }), [catalogue, filters.make]);

  const results = useMemo(() => {
    const term = filters.keyword.trim().toLowerCase();
    const filtered = catalogue.filter((vehicle) => {
      const haystack = [vehicle.make, vehicle.model, vehicle.title, vehicle.fuel, vehicle.transmission, vehicle.bodyType, vehicle.reference].filter(Boolean).join(' ').toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (filters.make && vehicle.make !== filters.make) return false;
      if (filters.model && vehicle.model !== filters.model) return false;
      if (filters.minPrice && (!Number.isFinite(vehicle.price) || vehicle.price < Number(filters.minPrice))) return false;
      if (filters.maxPrice && (!Number.isFinite(vehicle.price) || vehicle.price > Number(filters.maxPrice))) return false;
      if (filters.year && vehicle.year !== Number(filters.year)) return false;
      if (filters.maxMileage && (!Number.isFinite(vehicle.mileage) || vehicle.mileage > Number(filters.maxMileage))) return false;
      if (filters.fuel && vehicle.fuel !== filters.fuel) return false;
      if (filters.transmission && vehicle.transmission !== filters.transmission) return false;
      if (filters.bodyType && vehicle.bodyType !== filters.bodyType) return false;
      if (filters.drivetrain && vehicle.drivetrain !== filters.drivetrain) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (filters.sort === 'price-asc') return (a.price ?? Infinity) - (b.price ?? Infinity);
      if (filters.sort === 'price-desc') return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      if (filters.sort === 'year-desc') return (b.year ?? -Infinity) - (a.year ?? -Infinity);
      if (filters.sort === 'mileage-asc') return (a.mileage ?? Infinity) - (b.mileage ?? Infinity);
      if (filters.sort === 'newest') return (b.dateAdded || '').localeCompare(a.dateAdded || '');
      return Number(b.featured) - Number(a.featured);
    });
  }, [catalogue, filters]);

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value, ...(key === 'make' ? { model: '' } : {}) }));
  const clear = () => setFilters(initialFilters);
  const activeCount = Object.entries(filters).filter(([key, value]) => value && key !== 'sort').length;

  const panel = (
    <form className="filters-panel" onSubmit={(event) => event.preventDefault()}>
      <div className="filter-heading"><div><span className="eyebrow">Refine results</span><h2>Filters</h2></div>{activeCount > 0 && <button type="button" onClick={clear}>Clear all</button>}</div>
      <label className="field"><span>Keyword</span><input value={filters.keyword} onChange={(event) => update('keyword', event.target.value)} placeholder="e.g. Toyota or SUV" /></label>
      <div className="filter-row">
        <label className="field"><span>Make</span><select value={filters.make} onChange={(event) => update('make', event.target.value)}><option value="">All makes</option>{options.makes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="field"><span>Model</span><select value={filters.model} onChange={(event) => update('model', event.target.value)}><option value="">All models</option>{options.models.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="filter-row">
        <label className="field"><span>Minimum price</span><input inputMode="numeric" type="number" min="0" value={filters.minPrice} onChange={(event) => update('minPrice', event.target.value)} placeholder="US$ 0" /></label>
        <label className="field"><span>Maximum price</span><input inputMode="numeric" type="number" min="0" value={filters.maxPrice} onChange={(event) => update('maxPrice', event.target.value)} placeholder="Any" /></label>
      </div>
      <div className="filter-row">
        <label className="field"><span>Year</span><select value={filters.year} onChange={(event) => update('year', event.target.value)}><option value="">Any year</option>{options.years.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="field"><span>Maximum mileage</span><input inputMode="numeric" type="number" min="0" value={filters.maxMileage} onChange={(event) => update('maxMileage', event.target.value)} placeholder="Any" /></label>
      </div>
      <label className="field"><span>Fuel type</span><select value={filters.fuel} onChange={(event) => update('fuel', event.target.value)}><option value="">All fuel types</option>{options.fuels.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="field"><span>Transmission</span><select value={filters.transmission} onChange={(event) => update('transmission', event.target.value)}><option value="">All transmissions</option>{options.transmissions.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="field"><span>Body type</span><select value={filters.bodyType} onChange={(event) => update('bodyType', event.target.value)}><option value="">All body types</option>{options.bodies.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="field"><span>Drivetrain</span><select value={filters.drivetrain} onChange={(event) => update('drivetrain', event.target.value)}><option value="">All drivetrains</option>{options.drivetrains.map((value) => <option key={value}>{value}</option>)}</select></label>
      <button className="btn btn-navy btn-full mobile-apply" type="button" onClick={() => setFiltersOpen(false)}>Show {results.length} results</button>
    </form>
  );

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title}>
        <p>Search the supplied MoCars inventory and compare factual listing details before making an enquiry.</p>
      </PageHero>
      <section className="catalogue-section section">
        <div className="container">
          <div className="vehicle-condition-toggle" role="group" aria-label="Choose vehicle condition">
            {conditionTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`vehicle-condition-pill${condition === tab.key ? ' is-active' : ''}`}
                aria-pressed={condition === tab.key}
                onClick={() => navigate(tab.path)}
              >
                {tab.label}
                <span>{conditionCounts[tab.key]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="container catalogue-layout">
          <aside className="desktop-filters">{panel}</aside>
          <div className="catalogue-results">
            <div className="results-toolbar">
              <div><strong>{results.length}</strong> {results.length === 1 ? 'vehicle' : 'vehicles'} found</div>
              <button className="mobile-filter-trigger" type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal /> Filters {activeCount > 0 && <span>{activeCount}</span>}</button>
              <label className="sort-control"><span>Sort by</span><select value={filters.sort} onChange={(event) => update('sort', event.target.value)}>
                <option value="featured">Featured</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="year-desc">Year: Newest First</option>
                <option value="mileage-asc">Lowest Mileage</option>
              </select></label>
            </div>
            {results.length ? <div className="catalogue-grid">{results.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div> : <EmptyState onClear={clear} description="Try a different make, price range or keyword." />}
            <p className="inventory-note">Only details supplied with the catalogue are shown. Confirm mileage, specification, availability and location with MoCars before making a decision.</p>
          </div>
        </div>
      </section>
      {filtersOpen && <div className="filter-drawer-backdrop" onMouseDown={() => setFiltersOpen(false)}><aside className="filter-drawer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X /></button>{panel}</aside></div>}
    </>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PartCard } from '../components/Cards.jsx';
import { EmptyState, PageHero } from '../components/UI.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { whatsappLink } from '../config/business.js';

const initialFilters = { keyword: '', category: '', condition: '', make: '', model: '', year: '', minPrice: '', maxPrice: '', availability: '', sort: 'featured' };
const unique = (values) => [...new Set(values.filter(Boolean))].sort();

export default function PartsPage() {
  const { partCategories, parts } = useInventory();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...initialFilters, keyword: searchParams.get('q') || '', condition: searchParams.get('condition') || '' }));
  const [filtersOpen, setFiltersOpen] = useState(false);
  usePageMeta('Auto Parts', 'Search new and used auto parts by product, part number, category and compatible vehicle.');

  useEffect(() => {
    setFilters((current) => ({ ...current, keyword: searchParams.get('q') ?? current.keyword, condition: searchParams.get('condition') || '' }));
  }, [searchParams]);

  const options = useMemo(() => ({
    makes: unique(parts.flatMap((part) => part.compatibleMakes)),
    models: unique(parts.filter((part) => !filters.make || part.compatibleMakes.includes(filters.make)).flatMap((part) => part.compatibleModels)),
    years: unique(parts.flatMap((part) => part.compatibleYears)).sort((a, b) => b - a),
    availability: unique(parts.map((part) => part.availability)),
  }), [filters.make, parts]);

  const results = useMemo(() => {
    const term = filters.keyword.trim().toLowerCase();
    const filtered = parts.filter((part) => {
      const haystack = [part.name, part.partNumber, part.category, part.reference, ...part.compatibleMakes, ...part.compatibleModels, ...part.searchableKeywords].filter(Boolean).join(' ').toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (filters.category && part.category !== filters.category) return false;
      if (filters.condition && part.condition !== filters.condition) return false;
      if (filters.make && !part.compatibleMakes.includes(filters.make)) return false;
      if (filters.model && !part.compatibleModels.includes(filters.model)) return false;
      if (filters.year && !part.compatibleYears.includes(Number(filters.year))) return false;
      if (filters.minPrice && part.price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && part.price > Number(filters.maxPrice)) return false;
      if (filters.availability && part.availability !== filters.availability) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (filters.sort === 'price-asc') return a.price - b.price;
      if (filters.sort === 'price-desc') return b.price - a.price;
      if (filters.sort === 'name') return a.name.localeCompare(b.name);
      if (filters.sort === 'newest') return (b.dateAdded || '').localeCompare(a.dateAdded || '');
      return Number(b.featured) - Number(a.featured);
    });
  }, [filters, parts]);

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value, ...(key === 'make' ? { model: '' } : {}) }));
  const clear = () => setFilters(initialFilters);
  const activeCount = Object.entries(filters).filter(([key, value]) => value && key !== 'sort').length;

  const panel = (
    <form className="filters-panel" onSubmit={(event) => event.preventDefault()}>
      <div className="filter-heading"><div><span className="eyebrow">Find a compatible part</span><h2>Filters</h2></div>{activeCount > 0 && <button type="button" onClick={clear}>Clear all</button>}</div>
      <label className="field"><span>Part search</span><div className="input-with-icon"><Search /><input value={filters.keyword} onChange={(event) => update('keyword', event.target.value)} placeholder="Name, part no. or keyword" /></div></label>
      <label className="field"><span>Part category</span><select value={filters.category} onChange={(event) => update('category', event.target.value)}><option value="">All categories</option>{partCategories.map((value) => <option key={value}>{value}</option>)}</select></label>
      <div className="filter-row">
        <label className="field"><span>Condition</span><select value={filters.condition} onChange={(event) => update('condition', event.target.value)}><option value="">New & Used</option><option>New</option><option>Used</option></select></label>
        <label className="field"><span>Availability</span><select value={filters.availability} onChange={(event) => update('availability', event.target.value)}><option value="">All</option>{options.availability.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="filter-row">
        <label className="field"><span>Vehicle make</span><select value={filters.make} onChange={(event) => update('make', event.target.value)}><option value="">All makes</option>{options.makes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="field"><span>Vehicle model</span><select value={filters.model} onChange={(event) => update('model', event.target.value)}><option value="">All models</option>{options.models.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <label className="field"><span>Vehicle year</span><select value={filters.year} disabled={!options.years.length} onChange={(event) => update('year', event.target.value)}><option value="">{options.years.length ? 'All years' : 'Compatibility years pending'}</option>{options.years.map((value) => <option key={value}>{value}</option>)}</select></label>
      <div className="filter-row">
        <label className="field"><span>Minimum price</span><input type="number" min="0" inputMode="numeric" value={filters.minPrice} onChange={(event) => update('minPrice', event.target.value)} placeholder="US$ 0" /></label>
        <label className="field"><span>Maximum price</span><input type="number" min="0" inputMode="numeric" value={filters.maxPrice} onChange={(event) => update('maxPrice', event.target.value)} placeholder="Any" /></label>
      </div>
      <button className="btn btn-navy btn-full mobile-apply" type="button" onClick={() => setFiltersOpen(false)}>Show {results.length} results</button>
    </form>
  );

  return (
    <>
      <PageHero statement="Search new and used auto parts by product name, part number, vehicle make, model or keyword." />
      <section className="parts-search-band">
        <div className="container">
          <div className="prominent-search"><Search /><input value={filters.keyword} onChange={(event) => update('keyword', event.target.value)} placeholder="Try “engine component”, “brake pad” or a part number" aria-label="Search auto parts" /><button className="btn btn-red" type="button">Search Parts</button></div>
        </div>
      </section>
      <section className="catalogue-section section">
        <div className="container catalogue-layout">
          <aside className="desktop-filters">{panel}</aside>
          <div className="catalogue-results">
            <div className="results-toolbar">
              <div><strong>{results.length}</strong> {results.length === 1 ? 'part' : 'parts'} found</div>
              <button className="mobile-filter-trigger" type="button" onClick={() => setFiltersOpen(true)}><SlidersHorizontal /> Filters {activeCount > 0 && <span>{activeCount}</span>}</button>
              <label className="sort-control"><span>Sort by</span><select value={filters.sort} onChange={(event) => update('sort', event.target.value)}><option value="featured">Featured</option><option value="newest">Newest Arrivals</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="name">Product Name</option></select></label>
            </div>
            {results.length ? <div className="catalogue-grid">{results.map((part) => <PartCard key={part.id} part={part} />)}</div> : <EmptyState onClear={clear} description="Try another part name, vehicle or condition." action={<a className="btn btn-red" href={whatsappLink('Hello MoCars, I could not find the auto part I need. Can you help me source it?')} target="_blank" rel="noreferrer">Enquire on WhatsApp</a>} />}
            <p className="inventory-note">Compatibility, part numbers and stock are shown only when supplied. Confirm fitment with MoCars before ordering.</p>
          </div>
        </div>
      </section>
      {filtersOpen && <div className="filter-drawer-backdrop" onMouseDown={() => setFiltersOpen(false)}><aside className="filter-drawer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X /></button>{panel}</aside></div>}
    </>
  );
}

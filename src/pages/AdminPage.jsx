import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Boxes,
  CarFront,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  FilePenLine,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { formatMileage, formatPrice } from '../data/inventory.js';
import { useInventory } from '../context/InventoryContext.jsx';

const OWNER_HEADER = { 'X-MoCars-Admin': '1' };
const vehicleTemplate = {
  id: '', reference: '', make: '', model: '', title: '', year: null, condition: 'New', price: null,
  mileage: null, engine: null, engineCapacity: null, fuel: null, transmission: null, drivetrain: null,
  bodyType: 'SUV', exteriorColor: null, interiorColor: null, seatingCapacity: null, location: null,
  availability: 'Enquire to confirm', dateAdded: null, featured: false, images: [], description: '', features: [],
};
const partTemplate = {
  id: '', reference: '', name: '', category: '', condition: 'New', partNumber: null,
  compatibleMakes: [], compatibleModels: [], compatibleYears: [], description: '', specifications: [],
  manufacturer: null, price: null, stockQuantity: null, availability: 'Enquire to confirm', dateAdded: null,
  featured: false, searchableKeywords: [], images: [],
};

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}
function nullable(value) {
  const clean = String(value ?? '').trim();
  return clean ? clean : null;
}
function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function listFromText(value) {
  return String(value || '').split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}
function textFromList(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}
function formatDate(value) {
  if (!value) return 'Not yet';
  return new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

async function adminFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  headers.set('X-MoCars-Admin', '1');
  if (options.body && !(options.body instanceof FormData) && !(options.body instanceof Blob)) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, { ...options, headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The admin request could not be completed.');
  return result;
}

async function prepareImage(file) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#eef2f5';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
  if (!blob) throw new Error(`Could not prepare ${file.name}.`);
  if (blob.size > 1_500_000) throw new Error(`${file.name} is still too large after optimisation.`);
  return new File([blob], `${slugify(file.name.replace(/\.[^.]+$/, '')) || 'listing-image'}.webp`, { type: 'image/webp' });
}

function StatusPill({ status }) {
  return <span className={`admin-status ${status}`}>{status}</span>;
}

function AdminField({ label, children, full = false, hint = '' }) {
  return <label className={`admin-field${full ? ' full' : ''}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function ImageManager({ images, onChange, setMessage }) {
  const [uploading, setUploading] = useState(false);
  const upload = async (event) => {
    const files = [...event.target.files];
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const original of files) {
        const file = await prepareImage(original);
        const result = await adminFetch('/admin/api/media', {
          method: 'POST',
          headers: { 'Content-Type': file.type, 'X-File-Name': file.name },
          body: file,
        });
        uploaded.push(result.url);
      }
      onChange([...images, ...uploaded].slice(0, 12));
      setMessage({ tone: 'success', text: `${uploaded.length} image${uploaded.length === 1 ? '' : 's'} uploaded.` });
    } catch (error) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };
  const move = (index, direction) => {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <section className="admin-image-manager">
      <div className="admin-editor-section-heading"><div><h3>Listing photographs</h3><p>The first photograph is used as the cover image.</p></div><label className="admin-upload-button"><UploadCloud /> {uploading ? 'Uploading…' : 'Upload images'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={upload} /></label></div>
      {images.length ? <div className="admin-image-grid">{images.map((image, index) => <figure key={`${image}-${index}`}><img src={image} alt="" /><figcaption><span>{index === 0 ? 'Cover' : `Image ${index + 1}`}</span><div><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move image left"><ArrowUp /></button><button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label="Move image right"><ArrowDown /></button><button type="button" onClick={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove image"><Trash2 /></button></div></figcaption></figure>)}</div> : <label className="admin-image-empty"><ImagePlus /><strong>Add listing photographs</strong><span>JPEG, PNG or WebP. Images are resized before upload.</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={upload} /></label>}
    </section>
  );
}

function ListingPreview({ type, data, status }) {
  const title = type === 'vehicle' ? data.title || 'Vehicle title' : data.name || 'Part name';
  return <aside className="admin-live-preview"><span className="admin-preview-label"><Eye /> Live card preview</span><article className={`product-card ${type === 'vehicle' ? 'vehicle-card' : 'part-card'}`}><div className={`card-image-wrap${type === 'part' ? ' part-image' : ''}`}>{data.images?.[0] ? <img src={data.images[0]} alt="" /> : <div className="admin-preview-placeholder"><ImagePlus />Cover image</div>}<span className={`condition-badge ${(data.condition || 'New').toLowerCase()}`}>{data.condition || 'New'}</span></div><div className="card-content">{type === 'part' && <span className="category-label">{data.category || 'Part category'}</span>}<h3>{title}</h3>{type === 'vehicle' ? <div className="vehicle-facts"><span>{data.year || 'Year on request'}</span><span>{formatMileage(data.mileage)}</span><span>{data.fuel || 'Fuel on request'}</span><span>{data.transmission || 'Transmission on request'}</span></div> : <><p className="compatibility">Fits: {data.compatibleMakes?.length ? data.compatibleMakes.map((make, index) => `${make}${data.compatibleModels?.[index] ? ` ${data.compatibleModels[index]}` : ''}`).join(', ') : 'Multiple specification-dependent applications'}</p><p className="part-number">Part no: {data.partNumber || data.reference || 'Catalogue reference'}</p></>}<div className="card-bottom"><strong className="price">{formatPrice(data.price)}</strong><span className="btn btn-outline btn-small">View Details</span></div></div></article><div className="admin-preview-state"><StatusPill status={status} /><span>{data.featured ? 'Featured listing' : 'Standard listing'}</span></div></aside>;
}

function ListingEditor({ record, type, onClose, onSaved, setMessage }) {
  const existing = Boolean(record);
  const [data, setData] = useState(() => ({ ...(type === 'vehicle' ? vehicleTemplate : partTemplate), ...(record?.data || {}) }));
  const [status, setStatus] = useState(record?.status || 'draft');
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setData((current) => ({ ...current, [key]: value }));

  const buildPayload = (nextStatus = status) => {
    const clean = { ...data };
    const displayName = type === 'vehicle' ? clean.title : clean.name;
    clean.id = slugify(clean.id || displayName);
    clean.reference = String(clean.reference || '').trim().toUpperCase();
    clean.condition = clean.condition === 'Used' ? 'Used' : 'New';
    clean.price = numberOrNull(clean.price);
    clean.dateAdded = clean.dateAdded || new Date().toISOString().slice(0, 10);
    clean.featured = Boolean(clean.featured);
    clean.images = Array.isArray(clean.images) ? clean.images.slice(0, 12) : [];
    if (type === 'vehicle') {
      clean.year = numberOrNull(clean.year); clean.mileage = numberOrNull(clean.mileage); clean.seatingCapacity = numberOrNull(clean.seatingCapacity);
      ['engine', 'engineCapacity', 'fuel', 'transmission', 'drivetrain', 'bodyType', 'exteriorColor', 'interiorColor', 'location'].forEach((key) => { clean[key] = nullable(clean[key]); });
      clean.features = Array.isArray(clean.features) ? clean.features : [];
    } else {
      clean.partNumber = nullable(clean.partNumber); clean.manufacturer = nullable(clean.manufacturer); clean.stockQuantity = numberOrNull(clean.stockQuantity);
      clean.compatibleMakes = Array.isArray(clean.compatibleMakes) ? clean.compatibleMakes : [];
      clean.compatibleModels = Array.isArray(clean.compatibleModels) ? clean.compatibleModels : [];
      clean.compatibleYears = (Array.isArray(clean.compatibleYears) ? clean.compatibleYears : []).map(Number).filter(Number.isFinite);
      clean.specifications = Array.isArray(clean.specifications) ? clean.specifications : [];
      clean.searchableKeywords = Array.isArray(clean.searchableKeywords) ? clean.searchableKeywords : [];
    }
    return { type, status: nextStatus, data: clean };
  };

  const save = async (nextStatus = status) => {
    setSaving(true);
    try {
      const payload = buildPayload(nextStatus);
      if (!payload.data.id || !payload.data.reference || !(type === 'vehicle' ? payload.data.title : payload.data.name)) throw new Error('Complete the title, listing ID and reference before saving.');
      if (nextStatus === 'published' && !payload.data.images.length) throw new Error('Add at least one photograph before publishing.');
      const result = await adminFetch(existing ? `/admin/api/listings/${encodeURIComponent(record.id)}` : '/admin/api/listings', { method: existing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setData(result.listing.data); setStatus(result.listing.status);
      setMessage({ tone: 'success', text: nextStatus === 'published' ? 'Listing published to the public website.' : 'Listing saved.' });
      await onSaved();
      if (!existing) onClose();
    } catch (error) {
      setMessage({ tone: 'error', text: error.message });
    } finally { setSaving(false); }
  };

  return <div className="admin-editor-shell"><header className="admin-editor-header"><button type="button" onClick={onClose}><ArrowLeft />Back to listings</button><div><span>{existing ? 'Edit listing' : `Add ${type}`}</span><strong>{type === 'vehicle' ? data.title || 'Untitled vehicle' : data.name || 'Untitled part'}</strong></div><div className="admin-editor-actions"><button className="admin-secondary-button" type="button" disabled={saving} onClick={() => save('draft')}><Save />Save draft</button><button className="admin-primary-button" type="button" disabled={saving} onClick={() => save('published')}><Check />{saving ? 'Saving…' : 'Publish'}</button></div></header><main className="admin-editor-layout"><div className="admin-editor-form"><section className="admin-editor-card"><div className="admin-editor-section-heading"><div><h2>Core details</h2><p>Only supplied information should be entered. Leave unknown fields blank.</p></div><StatusPill status={status} /></div><div className="admin-form-grid"><AdminField label={type === 'vehicle' ? 'Listing title' : 'Part name'} full><input value={type === 'vehicle' ? data.title : data.name} onChange={(event) => { const value = event.target.value; set(type === 'vehicle' ? 'title' : 'name', value); if (!existing && !data.id) set('id', slugify(value)); }} required /></AdminField><AdminField label="Listing ID" hint="Used in the page URL"><input value={data.id} disabled={existing} onChange={(event) => set('id', slugify(event.target.value))} /></AdminField><AdminField label="Reference"><input value={data.reference} onChange={(event) => set('reference', event.target.value.toUpperCase())} placeholder={type === 'vehicle' ? 'MOC-VEH-007' : 'MOC-PART-005'} /></AdminField><AdminField label="Condition"><select value={data.condition} onChange={(event) => set('condition', event.target.value)}><option>New</option><option>Used</option></select></AdminField><AdminField label="Availability"><input value={data.availability || ''} onChange={(event) => set('availability', event.target.value)} /></AdminField><AdminField label="Price (USD)" hint="Leave blank to show Price on request"><input type="number" min="0" value={data.price ?? ''} onChange={(event) => set('price', event.target.value)} placeholder="On request" /></AdminField><AdminField label="Publish status"><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></AdminField><AdminField label="Homepage placement"><span className="admin-switch-row"><input type="checkbox" checked={Boolean(data.featured)} onChange={(event) => set('featured', event.target.checked)} />Feature this listing</span></AdminField></div></section>
  {type === 'vehicle' ? <section className="admin-editor-card"><div className="admin-editor-section-heading"><div><h2>Vehicle information</h2><p>Year, price and specifications can remain on request.</p></div><CarFront /></div><div className="admin-form-grid"><AdminField label="Make"><input value={data.make || ''} onChange={(event) => set('make', event.target.value)} /></AdminField><AdminField label="Model"><input value={data.model || ''} onChange={(event) => set('model', event.target.value)} /></AdminField><AdminField label="Year"><input type="number" min="1900" max="2100" value={data.year ?? ''} onChange={(event) => set('year', event.target.value)} placeholder="On request" /></AdminField><AdminField label="Mileage (km)"><input type="number" min="0" value={data.mileage ?? ''} onChange={(event) => set('mileage', event.target.value)} placeholder="On request" /></AdminField><AdminField label="Engine"><input value={data.engine || ''} onChange={(event) => set('engine', event.target.value)} /></AdminField><AdminField label="Fuel"><input value={data.fuel || ''} onChange={(event) => set('fuel', event.target.value)} /></AdminField><AdminField label="Transmission"><input value={data.transmission || ''} onChange={(event) => set('transmission', event.target.value)} /></AdminField><AdminField label="Drivetrain"><input value={data.drivetrain || ''} onChange={(event) => set('drivetrain', event.target.value)} /></AdminField><AdminField label="Body type"><input value={data.bodyType || ''} onChange={(event) => set('bodyType', event.target.value)} /></AdminField><AdminField label="Seating capacity"><input type="number" min="1" max="30" value={data.seatingCapacity ?? ''} onChange={(event) => set('seatingCapacity', event.target.value)} /></AdminField><AdminField label="Exterior colour"><input value={data.exteriorColor || ''} onChange={(event) => set('exteriorColor', event.target.value)} /></AdminField><AdminField label="Interior colour"><input value={data.interiorColor || ''} onChange={(event) => set('interiorColor', event.target.value)} /></AdminField><AdminField label="Location" full><input value={data.location || ''} onChange={(event) => set('location', event.target.value)} placeholder="Confirm location with MoCars" /></AdminField><AdminField label="Description" full><textarea rows="5" value={data.description || ''} onChange={(event) => set('description', event.target.value)} /></AdminField><AdminField label="Features" full hint="Enter one feature per line"><textarea rows="5" value={textFromList(data.features)} onChange={(event) => set('features', listFromText(event.target.value))} /></AdminField></div></section> : <section className="admin-editor-card"><div className="admin-editor-section-heading"><div><h2>Part information</h2><p>Compatibility and part details remain separate from vehicle inventory.</p></div><Boxes /></div><div className="admin-form-grid"><AdminField label="Category"><input value={data.category || ''} onChange={(event) => set('category', event.target.value)} /></AdminField><AdminField label="Part number"><input value={data.partNumber || ''} onChange={(event) => set('partNumber', event.target.value)} placeholder="On request" /></AdminField><AdminField label="Manufacturer"><input value={data.manufacturer || ''} onChange={(event) => set('manufacturer', event.target.value)} /></AdminField><AdminField label="Stock quantity"><input type="number" min="0" value={data.stockQuantity ?? ''} onChange={(event) => set('stockQuantity', event.target.value)} placeholder="On request" /></AdminField><AdminField label="Compatible makes" hint="Separate with commas"><input value={(data.compatibleMakes || []).join(', ')} onChange={(event) => set('compatibleMakes', listFromText(event.target.value))} /></AdminField><AdminField label="Compatible models" hint="Separate with commas"><input value={(data.compatibleModels || []).join(', ')} onChange={(event) => set('compatibleModels', listFromText(event.target.value))} /></AdminField><AdminField label="Compatible years" full hint="Separate with commas"><input value={(data.compatibleYears || []).join(', ')} onChange={(event) => set('compatibleYears', listFromText(event.target.value).map(Number).filter(Number.isFinite))} /></AdminField><AdminField label="Description" full><textarea rows="5" value={data.description || ''} onChange={(event) => set('description', event.target.value)} /></AdminField><AdminField label="Search keywords" full hint="Separate with commas"><input value={(data.searchableKeywords || []).join(', ')} onChange={(event) => set('searchableKeywords', listFromText(event.target.value))} /></AdminField></div></section>}
  <section className="admin-editor-card"><ImageManager images={data.images || []} onChange={(images) => set('images', images)} setMessage={setMessage} /></section></div><ListingPreview type={type} data={data} status={status} /></main></div>;
}

function Dashboard({ records, enquiries, orders, onNavigate, onEdit }) {
  const published = records.filter((item) => item.status === 'published').length;
  const drafts = records.filter((item) => item.status === 'draft').length;
  const recent = [...records].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 5);
  return <><div className="admin-page-heading"><div><span>Inventory overview</span><h1>Dashboard</h1><p>Manage vehicles, auto parts and customer requests from one private workspace.</p></div><button className="admin-primary-button" type="button" onClick={() => onNavigate('vehicles', 'new')}><Plus />Add vehicle</button></div><div className="admin-stat-grid"><button type="button" onClick={() => onNavigate('vehicles')}><span className="blue"><CarFront /></span><div><strong>{records.filter((item) => item.type === 'vehicle').length}</strong><small>Vehicle listings</small></div><ChevronRight /></button><button type="button" onClick={() => onNavigate('parts')}><span className="red"><Boxes /></span><div><strong>{records.filter((item) => item.type === 'part').length}</strong><small>Part listings</small></div><ChevronRight /></button><button type="button" onClick={() => onNavigate('enquiries')}><span className="gold"><MessageSquareText /></span><div><strong>{enquiries.filter((item) => item.status === 'received').length}</strong><small>New enquiries</small></div><ChevronRight /></button><button type="button" onClick={() => onNavigate('orders')}><span className="green"><PackageCheck /></span><div><strong>{orders.filter((item) => item.status === 'received').length}</strong><small>New order enquiries</small></div><ChevronRight /></button></div><div className="admin-overview-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><span>Inventory</span><h2>Recently updated</h2></div><button type="button" onClick={() => onNavigate('vehicles')}>View all</button></div><div className="admin-recent-list">{recent.map((record) => <button type="button" key={record.id} onClick={() => onEdit(record)}><img src={record.data.images?.[0] || '/images/hero-showroom.jpg'} alt="" /><span><strong>{record.title}</strong><small>{record.type === 'vehicle' ? 'Vehicle' : 'Auto part'} · {formatDate(record.updatedAt)}</small></span><StatusPill status={record.status} /></button>)}</div></section><section className="admin-panel admin-publish-summary"><div className="admin-panel-heading"><div><span>Publishing</span><h2>Catalogue status</h2></div><BarChart3 /></div><div><span><i style={{ '--value': `${records.length ? (published / records.length) * 100 : 0}%` }} /></span><strong>{published}</strong><small>Published listings</small></div><ul><li><span>Published</span><b>{published}</b></li><li><span>Drafts</span><b>{drafts}</b></li><li><span>Archived</span><b>{records.filter((item) => item.status === 'archived').length}</b></li><li><span>Featured</span><b>{records.filter((item) => item.data.featured).length}</b></li></ul></section></div></>;
}

function ListingsView({ type, records, onEdit, onCreate, onArchive, loading }) {
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('active');
  const shown = useMemo(() => records.filter((record) => record.type === type).filter((record) => status === 'all' || (status === 'active' ? record.status !== 'archived' : record.status === status)).filter((record) => !query.trim() || `${record.title} ${record.reference}`.toLowerCase().includes(query.toLowerCase())), [records, type, query, status]);
  const label = type === 'vehicle' ? 'Vehicles' : 'Auto Parts';
  return <><div className="admin-page-heading"><div><span>Catalogue management</span><h1>{label}</h1><p>Add, update, publish and archive {type === 'vehicle' ? 'new and used vehicles' : 'new and used auto parts'}.</p></div><button className="admin-primary-button" type="button" onClick={onCreate}><Plus />Add {type === 'vehicle' ? 'vehicle' : 'part'}</button></div><div className="admin-list-toolbar"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()} or reference`} /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="active">Active listings</option><option value="published">Published</option><option value="draft">Drafts</option><option value="archived">Archived</option><option value="all">All statuses</option></select></div><section className="admin-panel admin-listings-panel">{loading ? <div className="admin-loading"><RefreshCw />Loading listings…</div> : shown.length ? <div className="admin-listing-table"><div className="admin-table-head"><span>Listing</span><span>Condition</span><span>Price</span><span>Status</span><span>Updated</span><span>Actions</span></div>{shown.map((record) => <article key={record.id}><div className="admin-listing-identity"><img src={record.data.images?.[0] || '/images/hero-showroom.jpg'} alt="" /><span><strong>{record.title}</strong><small>{record.reference}{record.data.featured ? ' · Featured' : ''}</small></span></div><span>{record.data.condition}</span><strong className="admin-listing-price">{formatPrice(record.data.price)}</strong><StatusPill status={record.status} /><span>{formatDate(record.updatedAt)}</span><div className="admin-row-actions"><button type="button" onClick={() => onEdit(record)} aria-label={`Edit ${record.title}`}><FilePenLine /></button>{record.status === 'published' && <a href={type === 'vehicle' ? `/vehicles/${record.id}` : `/auto-parts/${record.id}`} target="_blank" rel="noreferrer" aria-label={`Preview ${record.title}`}><Eye /></a>}<button type="button" onClick={() => onArchive(record)} aria-label={`Archive ${record.title}`}><Archive /></button></div></article>)}</div> : <div className="admin-empty"><Boxes /><h2>No matching listings</h2><p>Change the filters or add a new listing.</p><button className="admin-primary-button" type="button" onClick={onCreate}><Plus />Add listing</button></div>}</section></>;
}

function RequestsView({ kind, items, onStatus, loading }) {
  const isOrders = kind === 'orders'; const title = isOrders ? 'Order Enquiries' : 'Customer Enquiries';
  return <><div className="admin-page-heading"><div><span>Customer requests</span><h1>{title}</h1><p>{isOrders ? 'Track parts order enquiries without presenting them as completed payments.' : 'Review general, vehicle and test-drive enquiries.'}</p></div></div><section className="admin-panel admin-requests-panel">{loading ? <div className="admin-loading"><RefreshCw />Loading requests…</div> : items.length ? <div className="admin-request-list">{items.map((item) => <article key={item.id}><div className="admin-request-top"><div><StatusPill status={item.status} /><span>{formatDate(item.createdAt)}</span></div><strong>{item.id}</strong></div><div className="admin-request-main"><div><h2>{isOrders ? item.customerName : item.name}</h2><p>{isOrders ? `${item.customerEmail} · ${item.customerPhone}` : `${item.email || 'No email'} · ${item.phone}`}</p>{!isOrders && item.itemName && <span>{item.itemName} · {item.listingReference}</span>}{isOrders && <span>{item.city} · {item.items?.some((orderItem) => orderItem.unitPrice === null) ? 'Price on request' : formatPrice(item.total)}</span>}</div><label>Status<select value={item.status} onChange={(event) => onStatus(item.id, event.target.value)}><option value="received">Received</option><option value="contacted">Contacted</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="closed">Closed</option></select></label></div>{isOrders ? <details><summary>View requested items</summary><pre>{JSON.stringify(item.items, null, 2)}</pre></details> : item.message && <blockquote>{item.message}</blockquote>}</article>)}</div> : <div className="admin-empty"><ClipboardList /><h2>No requests yet</h2><p>New submissions will appear here automatically.</p></div>}</section></>;
}

export default function AdminPage() {
  const { refresh: refreshPublicInventory } = useInventory();
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [records, setRecords] = useState([]); const [enquiries, setEnquiries] = useState([]); const [orders, setOrders] = useState([]);
  const [session, setSession] = useState(null); const [loading, setLoading] = useState(true); const [editor, setEditor] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sessionResult, listingsResult, enquiriesResult, ordersResult] = await Promise.all([
        adminFetch('/admin/api/session'), adminFetch('/admin/api/listings'), adminFetch('/admin/api/enquiries'), adminFetch('/admin/api/orders'),
      ]);
      setSession(sessionResult); setRecords(listingsResult.listings); setEnquiries(enquiriesResult.enquiries); setOrders(ordersResult.orders);
    } catch (error) { setMessage({ tone: 'error', text: error.message }); }
    finally { setLoading(false); }
  };
  const loadAndRefresh = async () => { await Promise.all([load(), refreshPublicInventory()]); };
  useEffect(() => { document.title = 'MoCars Admin'; load(); }, []);
  useEffect(() => { if (!message) return undefined; const timer = window.setTimeout(() => setMessage(null), 5000); return () => window.clearTimeout(timer); }, [message]);

  const navigate = (next, action) => { setSection(next); setSidebarOpen(false); if (action === 'new') setEditor({ type: next === 'parts' ? 'part' : 'vehicle', record: null }); };
  const archive = async (record) => { if (!window.confirm(`Archive ${record.title}? It will disappear from the public catalogue.`)) return; try { await adminFetch(`/admin/api/listings/${encodeURIComponent(record.id)}`, { method: 'DELETE' }); setMessage({ tone: 'success', text: 'Listing archived.' }); await loadAndRefresh(); } catch (error) { setMessage({ tone: 'error', text: error.message }); } };
  const requestStatus = async (kind, id, status) => { try { await adminFetch(`/admin/api/${kind}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); if (kind === 'orders') setOrders((current) => current.map((item) => item.id === id ? { ...item, status } : item)); else setEnquiries((current) => current.map((item) => item.id === id ? { ...item, status } : item)); setMessage({ tone: 'success', text: 'Request status updated.' }); } catch (error) { setMessage({ tone: 'error', text: error.message }); } };

  if (editor) return <><ListingEditor type={editor.type} record={editor.record} onClose={() => setEditor(null)} onSaved={loadAndRefresh} setMessage={setMessage} />{message && <div className={`admin-toast ${message.tone}`}>{message.tone === 'success' ? <Check /> : <X />}{message.text}</div>}</>;

  const links = [
    ['dashboard', 'Dashboard', LayoutDashboard], ['vehicles', 'Vehicles', CarFront], ['parts', 'Auto Parts', Boxes],
    ['enquiries', 'Enquiries', MessageSquareText], ['orders', 'Orders', PackageCheck],
  ];
  return <div className="admin-app"><header className="admin-mobile-header"><img src="/images/mocars-swoosh-logo.png" alt="MoCars Admin" /><button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open admin navigation"><Menu /></button></header><aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}><div className="admin-brand"><img src="/images/mocars-swoosh-logo.png" alt="MoCars" /><span>Owner Admin</span></div><button className="admin-sidebar-close" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X /></button><nav>{links.map(([key, label, Icon]) => <button key={key} className={section === key ? 'active' : ''} type="button" onClick={() => navigate(key)}><Icon />{label}{key === 'enquiries' && enquiries.filter((item) => item.status === 'received').length > 0 && <b>{enquiries.filter((item) => item.status === 'received').length}</b>}{key === 'orders' && orders.filter((item) => item.status === 'received').length > 0 && <b>{orders.filter((item) => item.status === 'received').length}</b>}</button>)}</nav><div className="admin-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer"><Eye />View public website</a><a href="/cdn-cgi/access/logout"><LogOut />Sign out</a></div></aside>{sidebarOpen && <button className="admin-sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close admin navigation" />}<div className="admin-main"><header className="admin-topbar"><div><span>Private workspace</span><strong>MoCars Inventory Admin</strong></div><div className="admin-owner"><span>{session?.email?.slice(0, 1).toUpperCase() || 'B'}</span><div><strong>Website owner</strong><small>{session?.email || 'Authenticated by Cloudflare Access'}</small></div></div></header><main className="admin-content">{section === 'dashboard' && <Dashboard records={records} enquiries={enquiries} orders={orders} onNavigate={navigate} onEdit={(record) => setEditor({ type: record.type, record })} />}{section === 'vehicles' && <ListingsView type="vehicle" records={records} loading={loading} onEdit={(record) => setEditor({ type: 'vehicle', record })} onCreate={() => setEditor({ type: 'vehicle', record: null })} onArchive={archive} />}{section === 'parts' && <ListingsView type="part" records={records} loading={loading} onEdit={(record) => setEditor({ type: 'part', record })} onCreate={() => setEditor({ type: 'part', record: null })} onArchive={archive} />}{section === 'enquiries' && <RequestsView kind="enquiries" items={enquiries} loading={loading} onStatus={(id, status) => requestStatus('enquiries', id, status)} />}{section === 'orders' && <RequestsView kind="orders" items={orders} loading={loading} onStatus={(id, status) => requestStatus('orders', id, status)} />}</main></div>{message && <div className={`admin-toast ${message.tone}`}>{message.tone === 'success' ? <Check /> : <X />}{message.text}</div>}</div>;
}

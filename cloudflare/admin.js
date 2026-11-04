import { partCategories, parts as bundledParts, vehicles as bundledVehicles } from '../src/data/inventory.js';

const ALLOWED_STATUSES = new Set(['draft', 'published', 'archived']);
const REQUEST_STATUSES = new Set(['received', 'contacted', 'in_progress', 'completed', 'closed']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
let accessKeysCache = { expiresAt: 0, keys: [] };

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}
function accessOrigin(env) {
  try {
    const origin = new URL(env.ACCESS_TEAM_DOMAIN);
    if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.cloudflareaccess.com')) return null;
    return origin.origin;
  } catch { return null; }
}
async function accessKeys(env, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && accessKeysCache.keys.length && accessKeysCache.expiresAt > now) return accessKeysCache.keys;
  const origin = accessOrigin(env);
  if (!origin) return [];
  const response = await fetch(`${origin}/cdn-cgi/access/certs`, { headers: { Accept: 'application/json' } });
  if (!response.ok) return [];
  const result = await response.json();
  const keys = Array.isArray(result.keys) ? result.keys : [];
  accessKeysCache = { keys, expiresAt: now + 60 * 60 * 1000 };
  return keys;
}
async function verifyAccessJwt(request, env) {
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) return null;
  const pieces = token.split('.');
  if (pieces.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(pieces[0])));
    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(pieces[1])));
    if (header.alg !== 'RS256' || !header.kid) return null;
    let keys = await accessKeys(env);
    let jwk = keys.find((key) => key.kid === header.kid);
    if (!jwk) {
      keys = await accessKeys(env, true);
      jwk = keys.find((key) => key.kid === header.kid);
    }
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, decodeBase64Url(pieces[2]), new TextEncoder().encode(`${pieces[0]}.${pieces[1]}`),
    );
    if (!verified) return null;
    const expectedAudience = cleanString(env.ACCESS_AUD, 100);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const now = Math.floor(Date.now() / 1000);
    if (!expectedAudience || !audiences.includes(expectedAudience)) return null;
    if (claims.iss !== accessOrigin(env)) return null;
    if (!Number.isFinite(claims.exp) || claims.exp <= now - 30) return null;
    if (Number.isFinite(claims.nbf) && claims.nbf > now + 30) return null;
    return claims;
  } catch { return null; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
function cleanString(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function id(prefix = '') {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}${[...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}
function parseData(value) {
  try { return JSON.parse(value); } catch { return null; }
}
function titleFor(type, data) {
  return cleanString(type === 'vehicle' ? data.title : data.name, 180);
}
function rowToListing(row) {
  const data = parseData(row.data_json) || {};
  return {
    id: row.id,
    type: row.item_type,
    reference: row.reference,
    title: row.title,
    status: row.status,
    featured: Boolean(row.featured),
    data: { ...data, id: row.id, reference: row.reference, featured: Boolean(row.featured) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}
function normalizeListing(type, source) {
  const data = { ...(source || {}) };
  data.id = cleanString(data.id, 100).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  data.reference = cleanString(data.reference, 80).toUpperCase();
  data.condition = data.condition === 'Used' ? 'Used' : 'New';
  data.availability = cleanString(data.availability, 100) || 'Enquire to confirm';
  data.description = cleanString(data.description, 3000);
  data.featured = Boolean(data.featured);
  data.price = Number.isFinite(Number(data.price)) && data.price !== null && data.price !== '' ? Number(data.price) : null;
  data.images = Array.isArray(data.images) ? data.images.filter((value) => typeof value === 'string' && value.startsWith('/')).slice(0, 12) : [];
  data.dateAdded = cleanString(data.dateAdded, 20) || new Date().toISOString().slice(0, 10);
  if (type === 'vehicle') {
    data.make = cleanString(data.make, 100);
    data.model = cleanString(data.model, 120);
    data.title = cleanString(data.title, 180);
    data.year = Number.isFinite(Number(data.year)) && data.year !== null && data.year !== '' ? Number(data.year) : null;
    data.mileage = Number.isFinite(Number(data.mileage)) && data.mileage !== null && data.mileage !== '' ? Number(data.mileage) : null;
    data.seatingCapacity = Number.isFinite(Number(data.seatingCapacity)) && data.seatingCapacity !== null && data.seatingCapacity !== '' ? Number(data.seatingCapacity) : null;
    ['engine', 'engineCapacity', 'fuel', 'transmission', 'drivetrain', 'bodyType', 'exteriorColor', 'interiorColor', 'location'].forEach((key) => { data[key] = cleanString(data[key], 120) || null; });
    data.features = Array.isArray(data.features) ? data.features.map((value) => cleanString(value, 120)).filter(Boolean).slice(0, 40) : [];
  } else {
    data.name = cleanString(data.name, 180);
    data.category = cleanString(data.category, 120);
    data.partNumber = cleanString(data.partNumber, 120) || null;
    data.manufacturer = cleanString(data.manufacturer, 120) || null;
    data.stockQuantity = Number.isFinite(Number(data.stockQuantity)) && data.stockQuantity !== null && data.stockQuantity !== '' ? Number(data.stockQuantity) : null;
    data.compatibleMakes = Array.isArray(data.compatibleMakes) ? data.compatibleMakes.map((value) => cleanString(value, 80)).filter(Boolean).slice(0, 30) : [];
    data.compatibleModels = Array.isArray(data.compatibleModels) ? data.compatibleModels.map((value) => cleanString(value, 80)).filter(Boolean).slice(0, 40) : [];
    data.compatibleYears = Array.isArray(data.compatibleYears) ? data.compatibleYears.map(Number).filter(Number.isFinite).slice(0, 60) : [];
    data.specifications = Array.isArray(data.specifications) ? data.specifications.slice(0, 50) : [];
    data.searchableKeywords = Array.isArray(data.searchableKeywords) ? data.searchableKeywords.map((value) => cleanString(value, 80)).filter(Boolean).slice(0, 50) : [];
  }
  return data;
}

export async function ensureCatalogueSeeded(env) {
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM inventory_listings').first();
  if (Number(count?.count) > 0) return;
  const createdAt = new Date().toISOString();
  const records = [
    ...bundledVehicles.map((data) => ({ type: 'vehicle', data })),
    ...bundledParts.map((data) => ({ type: 'part', data })),
  ];
  await env.DB.batch(records.map(({ type, data }) => env.DB.prepare(
    `INSERT OR IGNORE INTO inventory_listings
      (id, item_type, reference, title, status, featured, data_json, created_at, updated_at, published_at)
     VALUES (?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`,
  ).bind(data.id, type, data.reference, titleFor(type, data), data.featured ? 1 : 0, JSON.stringify(data), createdAt, createdAt, createdAt)));
}

export async function publicCatalogue(env) {
  try {
    await ensureCatalogueSeeded(env);
    const result = await env.DB.prepare("SELECT * FROM inventory_listings WHERE status = 'published' ORDER BY featured DESC, created_at ASC").all();
    const listings = (result.results || []).map(rowToListing);
    const vehicles = listings.filter((item) => item.type === 'vehicle').map((item) => item.data);
    const parts = listings.filter((item) => item.type === 'part').map((item) => item.data);
    const categories = [...new Set([...partCategories, ...parts.map((part) => part.category).filter(Boolean)])];
    return json({ vehicles, parts, partCategories: categories });
  } catch (error) {
    console.error('Catalogue database fallback', error);
    return json({ vehicles: bundledVehicles, parts: bundledParts, partCategories });
  }
}

export async function publishedPart(env, partId) {
  try {
    await ensureCatalogueSeeded(env);
    const row = await env.DB.prepare("SELECT data_json FROM inventory_listings WHERE id = ? AND item_type = 'part' AND status = 'published'").bind(partId).first();
    return row ? parseData(row.data_json) : null;
  } catch {
    return bundledParts.find((part) => part.id === partId) || null;
  }
}

async function adminIdentity(ctx, env, request) {
  let identity = null;
  if (ctx?.access && (!env.ACCESS_AUD || ctx.access.aud === env.ACCESS_AUD)) {
    identity = await ctx.access.getIdentity();
  }
  if (!identity && request) identity = await verifyAccessJwt(request, env);
  const email = cleanString(identity?.email, 160).toLowerCase();
  return email && email === cleanString(env.ADMIN_EMAIL, 160).toLowerCase() ? { ...identity, email } : null;
}

export async function requireAdmin(ctx, env, request) {
  try { return await adminIdentity(ctx, env, request); } catch { return null; }
}

function validAdminMutation(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  if (request.headers.get('x-mocars-admin') !== '1') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

async function body(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) throw new Error('Expected a JSON request.');
  return request.json();
}

async function listAdminListings(env) {
  await ensureCatalogueSeeded(env);
  const result = await env.DB.prepare('SELECT * FROM inventory_listings ORDER BY updated_at DESC').all();
  return (result.results || []).map(rowToListing);
}

async function saveListing(request, env, existingId = '') {
  const payload = await body(request);
  const type = payload.type === 'part' ? 'part' : 'vehicle';
  const status = ALLOWED_STATUSES.has(payload.status) ? payload.status : 'draft';
  const data = normalizeListing(type, payload.data);
  const listingId = existingId || data.id;
  if (!listingId || !data.reference || !titleFor(type, data)) return json({ error: 'A listing title, ID and reference are required.' }, 400);
  if (existingId && data.id !== existingId) return json({ error: 'A listing ID cannot be changed after creation.' }, 400);
  if (status === 'published' && !data.images.length) return json({ error: 'Add at least one photograph before publishing.' }, 400);
  const now = new Date().toISOString();
  data.id = listingId;
  const existing = await env.DB.prepare('SELECT created_at, published_at FROM inventory_listings WHERE id = ?').bind(listingId).first();
  if (!existing && existingId) return json({ error: 'Listing not found.' }, 404);
  try {
    await env.DB.prepare(
      `INSERT INTO inventory_listings
        (id, item_type, reference, title, status, featured, data_json, created_at, updated_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        item_type = excluded.item_type, reference = excluded.reference, title = excluded.title,
        status = excluded.status, featured = excluded.featured, data_json = excluded.data_json,
        updated_at = excluded.updated_at, published_at = excluded.published_at`,
    ).bind(
      listingId, type, data.reference, titleFor(type, data), status, data.featured ? 1 : 0,
      JSON.stringify(data), existing?.created_at || now, now,
      status === 'published' ? (existing?.published_at || now) : existing?.published_at || null,
    ).run();
  } catch (error) {
    if (String(error.message).toLowerCase().includes('unique')) return json({ error: 'That listing ID or reference is already in use.' }, 409);
    throw error;
  }
  const row = await env.DB.prepare('SELECT * FROM inventory_listings WHERE id = ?').bind(listingId).first();
  return json({ listing: rowToListing(row) }, existing ? 200 : 201);
}

async function uploadMedia(request, env) {
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!IMAGE_TYPES.has(contentType)) return json({ error: 'Only JPEG, PNG and WebP images are accepted.' }, 400);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength < 1 || bytes.byteLength > 1_500_000) return json({ error: 'Images must be smaller than 1.5 MB after optimisation.' }, 400);
  const mediaId = id('img_');
  const fileName = cleanString(request.headers.get('x-file-name'), 180) || 'listing-image';
  await env.DB.prepare('INSERT INTO media_assets (id, file_name, content_type, byte_size, data, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(mediaId, fileName, contentType, bytes.byteLength, bytes, new Date().toISOString()).run();
  return json({ id: mediaId, url: `/media/${mediaId}` }, 201);
}

async function listEnquiries(env) {
  const result = await env.DB.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 300').all();
  return (result.results || []).map((row) => ({
    id: row.id, type: row.type, name: row.name, phone: row.phone, email: row.email,
    itemId: row.item_id, itemName: row.item_name, listingReference: row.listing_reference,
    preferredDate: row.preferred_date, preferredTime: row.preferred_time,
    message: row.message, status: row.status, createdAt: row.created_at,
  }));
}
async function listOrders(env) {
  const result = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300').all();
  return (result.results || []).map((row) => ({
    id: row.id, customerName: row.customer_name, customerPhone: row.customer_phone,
    customerEmail: row.customer_email, deliveryAddress: row.delivery_address, city: row.city,
    items: parseData(row.items_json) || [], total: row.total, paymentMethod: row.payment_method,
    status: row.status, createdAt: row.created_at,
  }));
}
async function updateRequestStatus(request, env, table, requestId) {
  const payload = await body(request);
  const status = cleanString(payload.status, 40);
  if (!REQUEST_STATUSES.has(status)) return json({ error: 'Select a valid request status.' }, 400);
  const result = await env.DB.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).bind(status, requestId).run();
  if (!result.meta?.changes) return json({ error: 'Request not found.' }, 404);
  return json({ ok: true, status });
}

export async function serveMedia(env, mediaId) {
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(mediaId)) return new Response('Not found', { status: 404 });
  try {
    const row = await env.DB.prepare('SELECT content_type, data FROM media_assets WHERE id = ?').bind(mediaId).first();
    if (!row) return new Response('Not found', { status: 404 });
    return new Response(row.data, { headers: { 'content-type': row.content_type, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}

export async function handleAdminApi(request, env, ctx, url) {
  const identity = await requireAdmin(ctx, env, request);
  if (!identity) return json({ error: 'Owner authentication is required.' }, 403);
  if (!validAdminMutation(request)) return json({ error: 'The admin request could not be verified.' }, 403);
  if (!env.DB) return json({ error: 'The production database is not configured.' }, 503);
  const pathname = url.pathname;
  if (pathname === '/admin/api/session' && request.method === 'GET') return json({ email: identity.email, name: identity.name || 'Website owner' });
  if (pathname === '/admin/api/listings' && request.method === 'GET') return json({ listings: await listAdminListings(env) });
  if (pathname === '/admin/api/listings' && request.method === 'POST') return saveListing(request, env);
  const listingMatch = pathname.match(/^\/admin\/api\/listings\/([^/]+)$/);
  if (listingMatch && request.method === 'PUT') return saveListing(request, env, decodeURIComponent(listingMatch[1]));
  if (listingMatch && request.method === 'DELETE') {
    const listingId = decodeURIComponent(listingMatch[1]);
    const result = await env.DB.prepare("UPDATE inventory_listings SET status = 'archived', updated_at = ? WHERE id = ?").bind(new Date().toISOString(), listingId).run();
    return result.meta?.changes ? json({ ok: true }) : json({ error: 'Listing not found.' }, 404);
  }
  if (pathname === '/admin/api/media' && request.method === 'POST') return uploadMedia(request, env);
  if (pathname === '/admin/api/enquiries' && request.method === 'GET') return json({ enquiries: await listEnquiries(env) });
  if (pathname === '/admin/api/orders' && request.method === 'GET') return json({ orders: await listOrders(env) });
  const enquiryMatch = pathname.match(/^\/admin\/api\/enquiries\/([^/]+)$/);
  if (enquiryMatch && request.method === 'PATCH') return updateRequestStatus(request, env, 'enquiries', decodeURIComponent(enquiryMatch[1]));
  const orderMatch = pathname.match(/^\/admin\/api\/orders\/([^/]+)$/);
  if (orderMatch && request.method === 'PATCH') return updateRequestStatus(request, env, 'orders', decodeURIComponent(orderMatch[1]));
  return json({ error: 'Admin API route not found.' }, 404);
}

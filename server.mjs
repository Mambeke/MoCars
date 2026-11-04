import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { partCategories, parts, vehicles } from './src/data/inventory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4173);
const dataDir = path.join(__dirname, 'data');

app.disable('x-powered-by');
app.use(express.json({ limit: '250kb' }));

let localListings = [
  ...vehicles.map((data) => ({ id: data.id, type: 'vehicle', reference: data.reference, title: data.title, status: 'published', featured: Boolean(data.featured), data: structuredClone(data), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString() })),
  ...parts.map((data) => ({ id: data.id, type: 'part', reference: data.reference, title: data.name, status: 'published', featured: Boolean(data.featured), data: structuredClone(data), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString() })),
];
const localMedia = new Map();
const adminEmail = 'Brandonmambeke@gmail.com';

function localCatalogue() {
  const published = localListings.filter((item) => item.status === 'published');
  const liveVehicles = published.filter((item) => item.type === 'vehicle').map((item) => item.data);
  const liveParts = published.filter((item) => item.type === 'part').map((item) => item.data);
  return { vehicles: liveVehicles, parts: liveParts, partCategories: [...new Set([...partCategories, ...liveParts.map((part) => part.category).filter(Boolean)])] };
}
function localAdminRecord(type, payload, existing = null) {
  const data = structuredClone(payload.data || {});
  const now = new Date().toISOString();
  data.id = existing?.id || cleanString(data.id, 100);
  data.reference = cleanString(data.reference, 80).toUpperCase();
  data.featured = Boolean(data.featured);
  data.images = Array.isArray(data.images) ? data.images.slice(0, 12) : [];
  const title = cleanString(type === 'vehicle' ? data.title : data.name, 180);
  if (!data.id || !data.reference || !title) throw new Error('A listing title, ID and reference are required.');
  return { id: data.id, type, reference: data.reference, title, status: ['draft', 'published', 'archived'].includes(payload.status) ? payload.status : 'draft', featured: data.featured, data, createdAt: existing?.createdAt || now, updatedAt: now, publishedAt: payload.status === 'published' ? (existing?.publishedAt || now) : existing?.publishedAt || null };
}

async function ensureJsonFile(name) {
  await fs.mkdir(dataDir, { recursive: true });
  const file = path.join(dataDir, name);
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, '[]\n', 'utf8');
  }
  return file;
}

async function readList(name) {
  const file = await ensureJsonFile(name);
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function appendTo(name, record) {
  const file = await ensureJsonFile(name);
  const list = JSON.parse(await fs.readFile(file, 'utf8'));
  list.push(record);
  await fs.writeFile(file, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
  return record;
}

function cleanString(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function reference(prefix) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/catalogue', (_req, res) => res.json(localCatalogue()));

app.get('/admin/api/session', (_req, res) => res.json({ email: adminEmail, name: 'Website owner', localDevelopment: true }));
app.get('/admin/api/listings', (_req, res) => res.json({ listings: [...localListings].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }));
app.post('/admin/api/listings', (req, res) => {
  try {
    const type = req.body.type === 'part' ? 'part' : 'vehicle';
    const record = localAdminRecord(type, req.body);
    if (localListings.some((item) => item.id === record.id || item.reference === record.reference)) return res.status(409).json({ error: 'That listing ID or reference is already in use.' });
    if (record.status === 'published' && !record.data.images.length) return res.status(400).json({ error: 'Add at least one photograph before publishing.' });
    localListings = [record, ...localListings];
    return res.status(201).json({ listing: record });
  } catch (error) { return res.status(400).json({ error: error.message }); }
});
app.put('/admin/api/listings/:id', (req, res) => {
  try {
    const index = localListings.findIndex((item) => item.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Listing not found.' });
    const current = localListings[index];
    const type = req.body.type === 'part' ? 'part' : 'vehicle';
    const record = localAdminRecord(type, req.body, current);
    if (localListings.some((item, itemIndex) => itemIndex !== index && item.reference === record.reference)) return res.status(409).json({ error: 'That listing reference is already in use.' });
    if (record.status === 'published' && !record.data.images.length) return res.status(400).json({ error: 'Add at least one photograph before publishing.' });
    localListings[index] = record;
    return res.json({ listing: record });
  } catch (error) { return res.status(400).json({ error: error.message }); }
});
app.delete('/admin/api/listings/:id', (req, res) => {
  const record = localListings.find((item) => item.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Listing not found.' });
  record.status = 'archived'; record.updatedAt = new Date().toISOString();
  return res.json({ ok: true });
});
app.post('/admin/api/media', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '1.5mb' }), (req, res) => {
  const contentType = (req.headers['content-type'] || '').split(';')[0];
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType) || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Choose a valid JPEG, PNG or WebP image.' });
  const mediaId = `img_${crypto.randomBytes(8).toString('hex')}`;
  localMedia.set(mediaId, { contentType, data: req.body });
  return res.status(201).json({ id: mediaId, url: `/media/${mediaId}` });
});
app.get('/media/:id', (req, res) => {
  const media = localMedia.get(req.params.id);
  if (!media) return res.status(404).send('Not found');
  res.set('Content-Type', media.contentType); res.set('Cache-Control', 'no-store');
  return res.send(media.data);
});
app.get('/admin/api/enquiries', async (_req, res) => {
  const enquiries = await readList('enquiries.json');
  return res.json({ enquiries: enquiries.map((item) => ({ ...item, createdAt: item.createdAt || item.created_at })) .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')) });
});
app.get('/admin/api/orders', async (_req, res) => {
  const raw = await readList('orders.json');
  const orders = raw.map((item) => ({ id: item.id, customerName: item.customer?.name || item.customerName, customerPhone: item.customer?.phone || item.customerPhone, customerEmail: item.customer?.email || item.customerEmail, deliveryAddress: item.customer?.address || item.deliveryAddress, city: item.customer?.city || item.city, items: item.items || [], total: item.total, paymentMethod: item.paymentMethod, status: item.status, createdAt: item.createdAt }));
  return res.json({ orders: orders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')) });
});
async function updateLocalRequest(fileName, requestId, status) {
  const allowed = ['received', 'contacted', 'in_progress', 'completed', 'closed'];
  if (!allowed.includes(status)) throw new Error('Select a valid request status.');
  const file = await ensureJsonFile(fileName); const list = JSON.parse(await fs.readFile(file, 'utf8')); const item = list.find((record) => record.id === requestId);
  if (!item) return false; item.status = status; await fs.writeFile(file, `${JSON.stringify(list, null, 2)}\n`, 'utf8'); return true;
}
app.patch('/admin/api/enquiries/:id', async (req, res) => { try { return await updateLocalRequest('enquiries.json', req.params.id, req.body.status) ? res.json({ ok: true, status: req.body.status }) : res.status(404).json({ error: 'Request not found.' }); } catch (error) { return res.status(400).json({ error: error.message }); } });
app.patch('/admin/api/orders/:id', async (req, res) => { try { return await updateLocalRequest('orders.json', req.params.id, req.body.status) ? res.json({ ok: true, status: req.body.status }) : res.status(404).json({ error: 'Request not found.' }); } catch (error) { return res.status(400).json({ error: error.message }); } });

app.post('/api/enquiries', async (req, res) => {
  try {
    const name = cleanString(req.body.name, 100);
    const phone = cleanString(req.body.phone, 50);
    const type = cleanString(req.body.type, 40) || 'general';
    if (name.length < 2 || phone.length < 6) {
      return res.status(400).json({ error: 'Please provide a valid name and phone number.' });
    }
    const record = {
      id: reference('ENQ'),
      type,
      name,
      phone,
      email: cleanString(req.body.email, 160),
      itemId: cleanString(req.body.itemId, 100),
      itemName: cleanString(req.body.itemName, 180),
      listingReference: cleanString(req.body.listingReference, 80),
      preferredDate: cleanString(req.body.preferredDate, 20),
      preferredTime: cleanString(req.body.preferredTime, 20),
      message: cleanString(req.body.message, 1500),
      status: 'received',
      createdAt: new Date().toISOString(),
    };
    await appendTo('enquiries.json', record);
    return res.status(201).json({
      ok: true,
      reference: record.id,
      message: 'Your enquiry has been received.',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'The enquiry could not be saved. Please try again.' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const customer = req.body.customer || {};
    const name = cleanString(customer.name, 100);
    const phone = cleanString(customer.phone, 50);
    const email = cleanString(customer.email, 160);
    const address = cleanString(customer.address, 240);
    const city = cleanString(customer.city, 100);
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (name.length < 2 || phone.length < 6 || !validEmail(email) || !address || !city) {
      return res.status(400).json({ error: 'Please complete all customer and delivery fields.' });
    }
    if (!requestedItems.length) {
      return res.status(400).json({ error: 'Your order enquiry is empty.' });
    }
    const items = requestedItems.map((requested) => {
      const product = localCatalogue().parts.find((part) => part.id === requested.id);
      if (!product) throw new Error('An item in this order is no longer available.');
      const quantity = Math.max(1, Math.min(99, Number(requested.quantity) || 1));
      return {
        id: product.id,
        name: product.name,
        reference: product.reference,
        quantity,
        unitPrice: Number.isFinite(product.price) ? product.price : null,
        subtotal: Number.isFinite(product.price) ? product.price * quantity : null,
      };
    });
    const total = items.reduce((sum, item) => sum + (Number.isFinite(item.subtotal) ? item.subtotal : 0), 0);
    const record = {
      id: reference('ORD'),
      customer: { name, phone, email, address, city },
      items,
      total,
      paymentMethod: 'Order enquiry — payment arrangement pending',
      status: 'received',
      createdAt: new Date().toISOString(),
    };
    await appendTo('orders.json', record);
    return res.status(201).json({
      ok: true,
      reference: record.id,
      total,
      message: 'Your order enquiry has been submitted for stock and delivery confirmation.',
    });
  } catch (error) {
    console.error(error);
    const message = error.message.includes('item in this order')
      ? error.message
      : 'The order enquiry could not be saved. Please try again.';
    return res.status(500).json({ error: message });
  }
});

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = cleanString(req.body.name, 100);
    const email = cleanString(req.body.email, 160).toLowerCase();
    const phone = cleanString(req.body.phone, 50);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (name.length < 2 || !validEmail(email) || password.length < 8) {
      return res.status(400).json({ error: 'Use a valid name, email and a password of at least 8 characters.' });
    }
    const users = await readList('users.json');
    if (users.some((user) => user.email === email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const passwordRecord = hashPassword(password);
    const user = {
      id: reference('CUS'),
      name,
      email,
      phone,
      ...passwordRecord,
      createdAt: new Date().toISOString(),
    };
    await appendTo('users.json', user);
    return res.status(201).json({ profile: { id: user.id, name, email, phone } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'The account could not be created.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = cleanString(req.body.email, 160).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const users = await readList('users.json');
    const user = users.find((candidate) => candidate.email === email);
    if (!user) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const attempt = hashPassword(password, user.salt).hash;
    const matches = crypto.timingSafeEqual(Buffer.from(attempt, 'hex'), Buffer.from(user.hash, 'hex'));
    if (!matches) return res.status(401).json({ error: 'Email or password is incorrect.' });
    return res.json({ profile: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Sign in is unavailable right now.' });
  }
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, 'dist');
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method === 'GET') return res.sendFile(path.join(dist, 'index.html'));
    return next();
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root: __dirname,
    server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`MoCars is ready at http://0.0.0.0:${port}`);
});

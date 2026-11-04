import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parts } from './src/data/inventory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 4173);
const dataDir = path.join(__dirname, 'data');

app.disable('x-powered-by');
app.use(express.json({ limit: '250kb' }));

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
      const product = parts.find((part) => part.id === requested.id);
      if (!product) throw new Error('An item in this order is no longer available.');
      const quantity = Math.max(1, Math.min(99, Number(requested.quantity) || 1));
      return {
        id: product.id,
        name: product.name,
        reference: product.reference,
        quantity,
        unitPrice: product.price,
        subtotal: product.price * quantity,
      };
    });
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
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

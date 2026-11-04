import { parts } from '../src/data/inventory.js';

const encoder = new TextEncoder();

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

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function reference(prefix) {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const suffix = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function bytesFromHex(value) {
  const pairs = value.match(/.{1,2}/g) || [];
  return Uint8Array.from(pairs.map((pair) => Number.parseInt(pair, 16)));
}

async function hashPassword(password, saltHex) {
  const salt = saltHex ? bytesFromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310000 },
    key,
    256,
  );
  return { salt: hex(salt), hash: hex(bits) };
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('Expected a JSON request.');
  return request.json();
}

async function createEnquiry(request, env) {
  const body = await readBody(request);
  const name = cleanString(body.name, 100);
  const phone = cleanString(body.phone, 50);
  if (name.length < 2 || phone.length < 6) {
    return json({ error: 'Please provide a valid name and phone number.' }, 400);
  }

  const record = {
    id: reference('ENQ'),
    type: cleanString(body.type, 40) || 'general',
    name,
    phone,
    email: cleanString(body.email, 160),
    itemId: cleanString(body.itemId, 100),
    itemName: cleanString(body.itemName, 180),
    listingReference: cleanString(body.listingReference, 80),
    preferredDate: cleanString(body.preferredDate, 20),
    preferredTime: cleanString(body.preferredTime, 20),
    message: cleanString(body.message, 1500),
    createdAt: new Date().toISOString(),
  };

  await env.DB.prepare(
    `INSERT INTO enquiries
      (id, type, name, phone, email, item_id, item_name, listing_reference, preferred_date, preferred_time, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?)`,
  ).bind(
    record.id,
    record.type,
    record.name,
    record.phone,
    record.email,
    record.itemId,
    record.itemName,
    record.listingReference,
    record.preferredDate,
    record.preferredTime,
    record.message,
    record.createdAt,
  ).run();

  return json({ ok: true, reference: record.id, message: 'Your enquiry has been received.' }, 201);
}

async function createOrder(request, env) {
  const body = await readBody(request);
  const customer = body.customer || {};
  const name = cleanString(customer.name, 100);
  const phone = cleanString(customer.phone, 50);
  const email = cleanString(customer.email, 160);
  const address = cleanString(customer.address, 240);
  const city = cleanString(customer.city, 100);
  const requestedItems = Array.isArray(body.items) ? body.items : [];

  if (name.length < 2 || phone.length < 6 || !validEmail(email) || !address || !city) {
    return json({ error: 'Please complete all customer and delivery fields.' }, 400);
  }
  if (!requestedItems.length) return json({ error: 'Your order enquiry is empty.' }, 400);

  const items = [];
  for (const requested of requestedItems) {
    const product = parts.find((part) => part.id === requested.id);
    if (!product) return json({ error: 'An item in this order is no longer available.' }, 400);
    const quantity = Math.max(1, Math.min(99, Number(requested.quantity) || 1));
    items.push({
      id: product.id,
      name: product.name,
      reference: product.reference,
      quantity,
      unitPrice: product.price,
      subtotal: product.price * quantity,
    });
  }

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const id = reference('ORD');
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO orders
      (id, customer_name, customer_phone, customer_email, delivery_address, city, items_json, total, payment_method, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Order enquiry — payment arrangement pending', 'received', ?)`,
  ).bind(id, name, phone, email, address, city, JSON.stringify(items), total, createdAt).run();

  return json({
    ok: true,
    reference: id,
    total,
    message: 'Your order enquiry has been submitted for stock and delivery confirmation.',
  }, 201);
}

async function register(request, env) {
  const body = await readBody(request);
  const name = cleanString(body.name, 100);
  const email = cleanString(body.email, 160).toLowerCase();
  const phone = cleanString(body.phone, 50);
  const password = typeof body.password === 'string' ? body.password : '';
  if (name.length < 2 || !validEmail(email) || password.length < 8) {
    return json({ error: 'Use a valid name, email and a password of at least 8 characters.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return json({ error: 'An account with this email already exists.' }, 409);

  const passwordRecord = await hashPassword(password);
  const id = reference('CUS');
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, phone, password_hash, salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, name, email, phone, passwordRecord.hash, passwordRecord.salt, new Date().toISOString()).run();

  return json({ profile: { id, name, email, phone } }, 201);
}

async function login(request, env) {
  const body = await readBody(request);
  const email = cleanString(body.email, 160).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const user = await env.DB.prepare(
    'SELECT id, name, email, phone, password_hash, salt FROM users WHERE email = ?',
  ).bind(email).first();

  if (!user) return json({ error: 'Email or password is incorrect.' }, 401);
  const attempt = await hashPassword(password, user.salt);
  if (!safeEqual(attempt.hash, user.password_hash)) {
    return json({ error: 'Email or password is incorrect.' }, 401);
  }
  return json({ profile: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
}

async function handleApi(request, env, url) {
  if (url.pathname === '/api/health' && request.method === 'GET') {
    return json({ ok: true, runtime: 'cloudflare-workers' });
  }
  if (!env.DB) return json({ error: 'The production database is not configured.' }, 503);
  if (url.pathname === '/api/enquiries' && request.method === 'POST') return createEnquiry(request, env);
  if (url.pathname === '/api/orders' && request.method === 'POST') return createOrder(request, env);
  if (url.pathname === '/api/auth/register' && request.method === 'POST') return register(request, env);
  if (url.pathname === '/api/auth/login' && request.method === 'POST') return login(request, env);
  return json({ error: 'API route not found.' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env, url);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: 'The request could not be completed. Please try again.' }, 500);
    }
  },
};

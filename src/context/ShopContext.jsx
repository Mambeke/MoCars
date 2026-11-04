import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { parts } from '../data/inventory.js';

const ShopContext = createContext(null);

function load(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browsing must continue when storage is blocked, unavailable or full.
  }
}

export function ShopProvider({ children }) {
  const [cart, setCart] = useState(() => load('mocars-cart', []));
  const [favorites, setFavorites] = useState(() => load('mocars-favorites', []));
  const [profile, setProfile] = useState(() => load('mocars-profile', null));
  const [history, setHistory] = useState(() => load('mocars-history', { enquiries: [], orders: [] }));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => save('mocars-cart', cart), [cart]);
  useEffect(() => save('mocars-favorites', favorites), [favorites]);
  useEffect(() => save('mocars-profile', profile), [profile]);
  useEffect(() => save('mocars-history', history), [history]);

  const notify = (message, tone = 'success') => {
    setToast({ message, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  };

  const addToCart = (id, quantity = 1) => {
    const product = parts.find((part) => part.id === id);
    if (!product) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === id);
      if (existing) {
        return current.map((item) =>
          item.id === id ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item,
        );
      }
      return [...current, { id, quantity: Math.max(1, quantity) }];
    });
    notify(`${product.name} added to your cart.`);
  };

  const updateQuantity = (id, quantity) => {
    const safe = Math.max(1, Math.min(99, Number(quantity) || 1));
    setCart((current) => current.map((item) => (item.id === id ? { ...item, quantity: safe } : item)));
  };

  const removeFromCart = (id) => {
    setCart((current) => current.filter((item) => item.id !== id));
    notify('Item removed from your cart.', 'neutral');
  };

  const toggleFavorite = (id) => {
    setFavorites((current) => {
      const exists = current.includes(id);
      notify(exists ? 'Removed from saved items.' : 'Saved to your account.', 'neutral');
      return exists ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const submitEnquiry = async (payload) => {
    const response = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your enquiry could not be submitted.');
    setHistory((current) => ({
      ...current,
      enquiries: [{ ...payload, reference: result.reference, createdAt: new Date().toISOString() }, ...current.enquiries],
    }));
    notify(`Enquiry received — ${result.reference}`);
    return result;
  };

  const submitOrder = async (customer) => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, items: cart }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your order enquiry could not be submitted.');
    const order = {
      reference: result.reference,
      total: result.total,
      items: cart,
      customer,
      createdAt: new Date().toISOString(),
    };
    setHistory((current) => ({ ...current, orders: [order, ...current.orders] }));
    setCart([]);
    notify(`Order enquiry received — ${result.reference}`);
    return result;
  };

  const register = async (details) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Account creation failed.');
    setProfile(result.profile);
    notify('Your MoCars account is ready.');
    return result.profile;
  };

  const login = async (details) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Sign in failed.');
    setProfile(result.profile);
    notify(`Welcome back, ${result.profile.name}.`);
    return result.profile;
  };

  const cartDetails = useMemo(
    () =>
      cart
        .map((item) => {
          const product = parts.find((part) => part.id === item.id);
          return product ? { ...item, product, subtotal: item.quantity * product.price } : null;
        })
        .filter(Boolean),
    [cart],
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartDetails.reduce((sum, item) => sum + item.subtotal, 0);

  const value = {
    cart,
    cartDetails,
    cartCount,
    cartTotal,
    favorites,
    profile,
    history,
    toast,
    addToCart,
    updateQuantity,
    removeFromCart,
    toggleFavorite,
    submitEnquiry,
    submitOrder,
    register,
    login,
    updateProfile: (details) => {
      setProfile((current) => ({ ...current, ...details }));
      notify('Profile details updated.');
    },
    logout: () => {
      setProfile(null);
      notify('You have signed out.', 'neutral');
    },
    notify,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used inside ShopProvider');
  return context;
}

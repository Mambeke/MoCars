import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  partCategories as fallbackPartCategories,
  parts as fallbackParts,
  vehicles as fallbackVehicles,
} from '../data/inventory.js';

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [catalogue, setCatalogue] = useState({
    vehicles: fallbackVehicles,
    parts: fallbackParts,
    partCategories: fallbackPartCategories,
  });
  const [status, setStatus] = useState({ loading: true, error: '' });

  const refresh = async () => {
    try {
      const response = await fetch('/api/catalogue', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Catalogue refresh failed.');
      const result = await response.json();
      if (!Array.isArray(result.vehicles) || !Array.isArray(result.parts)) throw new Error('Catalogue response is invalid.');
      setCatalogue({
        vehicles: result.vehicles,
        parts: result.parts,
        partCategories: Array.isArray(result.partCategories) ? result.partCategories : fallbackPartCategories,
      });
      setStatus({ loading: false, error: '' });
    } catch {
      // The bundled catalogue keeps the public site usable if the live catalogue is temporarily unavailable.
      setStatus({ loading: false, error: 'Live inventory could not be refreshed.' });
    }
  };

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({ ...catalogue, ...status, refresh }), [catalogue, status]);
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used inside InventoryProvider');
  return context;
}

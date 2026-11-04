import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import App from './App.jsx';
import { InventoryProvider } from './context/InventoryContext.jsx';
import { ShopProvider } from './context/ShopContext.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <InventoryProvider>
        <ShopProvider>
          <App />
        </ShopProvider>
      </InventoryProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ScrollToTop } from './components/UI.jsx';
import AccountPage from './pages/AccountPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PartDetailPage from './pages/PartDetailPage.jsx';
import PartsPage from './pages/PartsPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import VehicleDetailPage from './pages/VehicleDetailPage.jsx';
import VehiclesPage from './pages/VehiclesPage.jsx';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="used-cars" element={<VehiclesPage condition="Used" />} />
          <Route path="new-cars" element={<VehiclesPage condition="New" />} />
          <Route path="vehicles/:id" element={<VehicleDetailPage />} />
          <Route path="auto-parts" element={<PartsPage />} />
          <Route path="auto-parts/:id" element={<PartDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

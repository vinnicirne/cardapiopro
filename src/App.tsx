import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StoreMenu from './pages/public/StoreMenu';
import LandingPage from './pages/public/LandingPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import CatalogPage from './pages/dashboard/CatalogPage';
import DeliveryAreasPage from './pages/dashboard/DeliveryAreasPage';
import StoreSettingsPage from './pages/dashboard/StoreSettingsPage';
import SubscriptionPage from './pages/dashboard/SubscriptionPage';
import CustomersPage from './pages/dashboard/CustomersPage';
import CouponsPage from './pages/dashboard/CouponsPage';
import OrdersPage from './pages/dashboard/OrdersPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import StoresManagerPage from './pages/admin/StoresManagerPage';
import PlansManagerPage from './pages/admin/PlansManagerPage';
import BuyersManagerPage from './pages/admin/BuyersManagerPage';
import GlobalCustomersManagerPage from './pages/admin/GlobalCustomersManagerPage';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { usePlatformStore } from './store/platformStore';

import PlatformSettingsPage from './pages/admin/PlatformSettingsPage';

import { ReloadPrompt } from './components/pwa/ReloadPrompt';

function App() {
  const { setUser, setStore, setLoading } = useAuthStore();
  const { fetchSettings } = usePlatformStore();

  useEffect(() => {
    // Busca configs da plataforma
    fetchSettings();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from('stores').select('*, subscriptions(plans(*))').eq('owner_id', session.user.id).single();
        if (data) {
          const plan = (Array.isArray(data.subscriptions) ? data.subscriptions[0]?.plans : data.subscriptions?.plans) || null;
          const storeData = { ...data, plan };
          delete storeData.subscriptions;
          setStore(storeData);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from('stores').select('*, subscriptions(plans(*))').eq('owner_id', session.user.id).single();
        if (data) {
          const plan = (Array.isArray(data.subscriptions) ? data.subscriptions[0]?.plans : data.subscriptions?.plans) || null;
          const storeData = { ...data, plan };
          delete storeData.subscriptions;
          setStore(storeData);
        }
      } else {
        setStore(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setStore, setLoading]);

  return (
    <>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/:storeSlug" element={<StoreMenu />} />
          
          {/* Store Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<Navigate to="/dashboard/orders" replace />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="delivery-areas" element={<DeliveryAreasPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="coupons" element={<CouponsPage />} />
              <Route path="settings" element={<StoreSettingsPage />} />
            </Route>
          </Route>
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<StoresManagerPage />} />
              <Route path="plans" element={<PlansManagerPage />} />
              <Route path="buyers" element={<BuyersManagerPage />} />
              <Route path="customers" element={<GlobalCustomersManagerPage />} />
              <Route path="settings" element={<PlatformSettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <ReloadPrompt />
    </>
  );
}

export default App;

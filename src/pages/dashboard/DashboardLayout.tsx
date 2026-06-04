import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Package, Settings, LogOut, Menu, MapPin, Shield, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { QrCodeModal } from '../../components/dashboard/QrCodeModal';

export default function DashboardLayout() {
  const location = useLocation();
  const { store, isSuperadmin } = useAuthStore();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Painel', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Pedidos', path: '/dashboard/orders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { name: 'Catálogo', path: '/dashboard/catalog', icon: <Package className="w-5 h-5" /> },
    { name: 'Áreas de Entrega', path: '/dashboard/delivery-areas', icon: <MapPin className="w-5 h-5" /> },
    { name: 'Clientes', path: '/dashboard/customers', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { name: 'Cupons', path: '/dashboard/coupons', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg> },
    { name: 'Configurações', path: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 truncate" title={store?.name}>{store?.name || 'Carregando...'}</h1>
          <p className="text-sm text-gray-500">Área do Lojista</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive ? 'bg-orange-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {item.icon}
                {item.name}
              </Link>
            )
          })}
          <button 
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-50 w-full transition-colors text-left"
          >
            <QrCode className="w-5 h-5 text-gray-500" />
            Meu QR Code
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-2">
          {isSuperadmin && (
            <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-white bg-slate-900 hover:bg-slate-800 w-full transition-colors">
              <Shield className="w-5 h-5 text-orange-500" />
              Painel Global
            </Link>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-gray-600 hover:bg-gray-50 w-full transition-colors cursor-pointer">
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 md:hidden">
          <button className="text-gray-600 cursor-pointer">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">{store?.name || 'Carregando...'}</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>

      {/* Modais Globais do Dashboard */}
      {isQrModalOpen && <QrCodeModal onClose={() => setIsQrModalOpen(false)} />}
    </div>
  );
}

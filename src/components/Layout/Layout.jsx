import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Softphone from '../Softphone';
import ImpersonationBanner from './ImpersonationBanner';
import './Layout.css';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/hablaphone': 'Hablaphone',
  '/reportes': 'Reportería',
  '/agendas': 'Agendas',
  '/contactos': 'Contactos',
  '/ia-operadora': 'Operadora IA',
  '/campanas': 'Campañas',
  '/configuracion': 'Configuración',
};

const Layout = () => {
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      <Sidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <div
        className={`sidebar-backdrop ${mobileNavOpen ? 'open' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      />
      <div className="main-wrapper">
        <ImpersonationBanner />
        <Header title={title} onMenuClick={() => setMobileNavOpen((v) => !v)} />

        {/* Área de contenido con Softphone al lado */}
        <div className={`content-area ${isSoftphoneOpen ? 'softphone-open' : ''}`}>
          <main className="main-content">
            <Outlet />
          </main>

          {/* Softphone Panel - solo en el área de contenido */}
          <Softphone
            isOpen={isSoftphoneOpen}
            onToggle={() => setIsSoftphoneOpen(!isSoftphoneOpen)}
          />
        </div>
      </div>
    </div>
  );
};

export default Layout;

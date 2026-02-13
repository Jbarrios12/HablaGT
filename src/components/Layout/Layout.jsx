import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Softphone from '../Softphone';
import './Layout.css';

const Layout = ({ title = 'Dashboard' }) => {
  const [isSoftphoneOpen, setIsSoftphoneOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-wrapper">
        <Header title={title} />

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

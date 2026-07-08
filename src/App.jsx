import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { ToastProvider } from './context/ToastContext';
import Loading from './components/Loading';
import './App.css';

// Lazy loading de componentes
const Login = lazy(() => import('./components/Login'));
const Layout = lazy(() => import('./components/Layout/Layout'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const Reporteria = lazy(() => import('./components/Reporteria'));
const Configuracion = lazy(() => import('./components/Configuracion'));
const Contactos = lazy(() => import('./components/Contactos'));
const Agendas = lazy(() => import('./components/Agendas'));
const Hablaphone = lazy(() => import('./components/Hablaphone'));
const ImpersonateEntry = lazy(() => import('./components/Impersonate/ImpersonateEntry'));
const OperadoraIA = lazy(() => import('./components/OperadoraIA'));

// Componente temporal para páginas en desarrollo
const PlaceholderPage = ({ title }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    color: '#64748b'
  }}>
    <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#0f172a' }}>{title}</h2>
    <p>Esta sección está en desarrollo</p>
  </div>
);

// Componente de rutas protegidas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading mensaje="Verificando sesión..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Componente de ruta pública (login)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading mensaje="Verificando sesión..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Componente principal de rutas
const AppRoutes = () => {
  return (
    <LoadingProvider>
      <Suspense fallback={<Loading mensaje="Cargando..." />}>
        <Routes>
          {/* Ruta de Login */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* Entrada de sesión de soporte (impersonación desde el backoffice) */}
          <Route path="/impersonate" element={<ImpersonateEntry />} />

          {/* Rutas protegidas con Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="hablaphone" element={<Hablaphone />} />
            <Route path="reportes" element={<Reporteria />} />
            <Route path="agendas" element={<Agendas />} />
            <Route path="contactos" element={<Contactos />} />
            <Route path="ia-operadora" element={<OperadoraIA />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>

          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </LoadingProvider>
  );
};

function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;

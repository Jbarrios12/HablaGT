import { createContext, useContext, useState } from 'react';
import Loading from '../components/Loading';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading debe usarse dentro de LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState('Cargando...');

  const showLoading = (msg = 'Cargando...') => {
    setMensaje(msg);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  // Loading con duración automática
  const showLoadingFor = (ms = 1500, msg = 'Cargando...') => {
    setMensaje(msg);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, ms);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading, showLoadingFor }}>
      {isLoading && <Loading mensaje={mensaje} />}
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingContext;

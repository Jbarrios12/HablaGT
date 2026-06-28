import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tokenStorage } from '../lib/tokenStorage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingChallenge, setPendingChallenge] = useState(null);

  useEffect(() => {
    const savedUser = tokenStorage.getUser();
    const access = tokenStorage.getAccess();
    if (savedUser && access) {
      setUser(savedUser);
      setIsAuthenticated(true);
      authService
        .me()
        .then((res) => {
          if (res) {
            const u = {
              id: res.id,
              email: res.email,
              nombre: res.full_name || res.fullName,
              rol: res.role,
              tenant: res.tenant,
              extension: res.extension,
            };
            setUser(u);
            tokenStorage.setUser(u);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (usuario, password) => {
    try {
      const res = await authService.login(usuario, password);
      if (res.token_type === 'Bearer-2FA-Challenge') {
        setPendingChallenge({ token: res.access_token, user: res.user });
        return { success: true, requires2FA: true };
      }
      authService.persistSession(res);
      const u = res.user
        ? {
            id: res.user.id,
            email: res.user.email,
            nombre: res.user.full_name || res.user.fullName,
            rol: res.user.role,
            tenant: res.user.tenant,
            extension: res.user.extension,
          }
        : { usuario };
      setUser(u);
      setIsAuthenticated(true);
      tokenStorage.setUser(u);
      return { success: true };
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Credenciales incorrectas';
      return { success: false, error: msg };
    }
  };

  const verify2FA = async (code) => {
    if (!pendingChallenge) {
      return { success: false, error: 'No hay challenge pendiente' };
    }
    try {
      const res = await authService.verify2FA(pendingChallenge.token, code);
      authService.persistSession(res);
      const u = res.user
        ? {
            id: res.user.id,
            email: res.user.email,
            nombre: res.user.full_name || res.user.fullName,
            rol: res.user.role,
            tenant: res.user.tenant,
            extension: res.user.extension,
          }
        : { ...pendingChallenge.user };
      setUser(u);
      setIsAuthenticated(true);
      tokenStorage.setUser(u);
      setPendingChallenge(null);
      return { success: true };
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Código inválido';
      return { success: false, error: msg };
    }
  };

  const cancel2FA = () => setPendingChallenge(null);

  const logout = async () => {
    const refresh = tokenStorage.getRefresh();
    try {
      if (refresh) await authService.logout(refresh);
    } catch (err) {
      // ignore network errors on logout
    }
    tokenStorage.clear();
    tokenStorage.clearUser();
    setUser(null);
    setIsAuthenticated(false);
    setPendingChallenge(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        pendingChallenge,
        login,
        verify2FA,
        cancel2FA,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

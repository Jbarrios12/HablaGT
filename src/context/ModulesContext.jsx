import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { moduleService } from '../services';

// Módulos opcionales de la empresa (p. ej. "citas"). Mientras cargan, o si
// el backend no responde, todo se muestra: el backend igual rechaza lo que
// la empresa no tiene.
const ModulesContext = createContext({
  modules: {}, businessType: '', catalog: [], businessTypes: [], templates: {},
  loaded: false, has: () => true, reload: () => {},
});

export function ModulesProvider({ children }) {
  const [state, setState] = useState({ modules: {}, businessType: '', catalog: [], businessTypes: [], templates: {}, loaded: false });

  const reload = useCallback(async () => {
    try {
      const d = await moduleService.get();
      setState({
        modules: d?.modules || {},
        businessType: d?.business_type || '',
        catalog: d?.catalog || [],
        businessTypes: d?.business_types || [],
        templates: d?.templates || {},
        loaded: true,
      });
    } catch {
      setState((s) => ({ ...s, loaded: true }));
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const has = useCallback((key) => state.modules[key] !== false, [state.modules]);

  return (
    <ModulesContext.Provider value={{ ...state, has, reload }}>
      {children}
    </ModulesContext.Provider>
  );
}

export const useModules = () => useContext(ModulesContext);

// RequireModule muestra la página solo si la empresa tiene el módulo.
export function RequireModule({ module, children }) {
  const { has, loaded } = useModules();
  if (loaded && !has(module)) return <Navigate to="/dashboard" replace />;
  return children;
}

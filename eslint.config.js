import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // El no-unused-vars base no ve los usos en JSX: <Componente /> (de ahí
      // la mayúscula), <motion.div> de framer-motion y los componentes que
      // llegan como parámetro ({ icon: Icon }).
      'no-unused-vars': ['error', { varsIgnorePattern: '^([A-Z_]|motion$)', argsIgnorePattern: '^[A-Z_]' }],
      // Advertencias, no errores: marcan patrones válidos que se usan a
      // propósito (copiar datos al formulario al abrir un modal, cerrar el
      // menú al navegar, leer la sesión al arrancar, contexto + su hook en
      // el mismo archivo). Así un error de ESLint es siempre un problema real.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
])

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prefixSelector from 'postcss-prefix-selector'

// Form.io dibuja sus formularios con clases de Bootstrap 5. Bootstrap trae
// reglas globales (.btn, .card, .modal, body, :root...) que chocarían con
// los estilos de la app, así que su CSS se reescribe para aplicar solo
// dentro de los contenedores de Form.io:
//  - .formio-scope  → wrapper que ponemos alrededor del builder / formulario
//  - .formio-dialog → modal de edición de componentes (Form.io lo monta en <body>)
//  - .gu-mirror     → elemento fantasma al arrastrar componentes en el builder
const FORMIO_SCOPES = ['.formio-scope', '.formio-dialog', '.gu-mirror']

const scopeBootstrap = prefixSelector({
  prefix: FORMIO_SCOPES[0],
  includeFiles: [/node_modules[\\/]bootstrap[\\/]/],
  transform(_prefix, selector) {
    const root = selector.match(/^(:root|html|body)(.*)$/)
    if (root) return FORMIO_SCOPES.map((s) => `${s}${root[2]}`).join(', ')
    return FORMIO_SCOPES.map((s) => `${s} ${selector}`).join(', ')
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: { plugins: [scopeBootstrap] },
  },
})

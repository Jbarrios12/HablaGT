# HablaGT — Frontend

SPA del portal de HablaGT (PBX / contact center) construida con **React 19 + Vite**.
Consume la API del backend en Go (ver `../HablaGT-Backend`).

## Stack

- **React 19** + **Vite 7** (HMR, build)
- **react-router-dom 7** — ruteo + rutas protegidas
- **axios** — cliente HTTP con interceptores (Bearer + refresh token automático)
- **framer-motion** — animaciones
- **react-icons** — iconografía

## Requisitos

- Node.js 18+ (recomendado 20+)
- El backend corriendo (por defecto en `http://localhost:8080`)

## Cómo correrlo

```bash
npm install
cp .env .env.local        # o edita .env directamente
npm run dev               # arranca Vite en http://localhost:5173
```

Otros scripts:

```bash
npm run build             # build de producción → dist/
npm run preview           # sirve el build localmente
npm run lint              # ESLint
```

### Credenciales de desarrollo (tenant seed del backend)

- **Usuario:** `admin`
- **Password:** `admin123`
- **Tenant:** `demo`

## Variables de entorno

Vite expone las variables con prefijo `VITE_` (archivo `.env`):

| Variable | Default | Descripción |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8080/api/v1` | Base URL de la API del backend |
| `VITE_TENANT_SLUG` | `demo` | Slug del tenant; se envía como header `X-Tenant-Slug` en cada request |

## Arquitectura

```
src/
├── main.jsx                 # Entry point (StrictMode + App)
├── App.jsx                  # Router + providers (Toast → Auth → rutas) + lazy routes
├── context/
│   ├── AuthContext.jsx      # Sesión, login, 2FA, logout
│   ├── LoadingContext.jsx   # Overlay de carga global
│   └── ToastContext.jsx     # Notificaciones toast (success/error/info/warning)
├── hooks/
│   ├── useRealtimeAudio.js  # Audio del bridge call-AI (WebSocket PCM)
│   └── useRealtimeEvents.js # Suscripción al stream SSE del backend
├── lib/
│   ├── api.js               # Instancia axios + interceptores (refresh 401)
│   ├── sseClient.js         # Cliente SSE basado en fetch + ReadableStream
│   ├── tokenStorage.js      # Persistencia de tokens/usuario en localStorage
│   └── realtimeAudio.js     # Helpers de audio
├── services/                # Una capa por dominio (auth, cdr, contacts, ...)
└── components/              # Vistas: Login, Dashboard, Reporteria, Contactos,
                             # Agendas, Configuracion, Hablaphone, Softphone, Layout
```

### Autenticación

`lib/api.js` añade el `Authorization: Bearer <access>` y el header `X-Tenant-Slug`
a cada request. Ante un `401` intenta una sola vez refrescar el token con
`/auth/refresh`; si falla, limpia la sesión y redirige a `/login`.

El flujo de **recuperación de contraseña** vive en `components/Login/Login.jsx`
(vistas `forgot` → `reset`), conectado a `POST /auth/forgot-password` y
`POST /auth/reset-password`. En desarrollo el backend devuelve el token en la
respuesta para poder completar el reseteo sin servidor de correo.

### Notificaciones (toasts)

`ToastProvider` (en `App.jsx`) expone el hook `useToast()`:

```jsx
const toast = useToast();
toast.success('Guardado');
toast.error('Algo falló');
toast.info('Llamada entrante de 5551234');
toast.warning('Sin grabación');
```

Reemplaza los `alert()` nativos en toda la app.

### Tiempo real (SSE)

`useRealtimeEvents(onEvent)` abre el stream `GET /api/v1/events/stream` con
`fetch` (para poder enviar el `Authorization`, que `EventSource` no permite),
parsea los frames SSE y entrega eventos `call.update`. El **Dashboard** y la
**Reportería** lo usan para refrescarse en vivo (con *debounce*) cuando entra
una llamada, y el Dashboard muestra un toast en llamadas entrantes nuevas.

## Notas

- ESLint usa el flat config de `eslint.config.js`. El proyecto no incluye
  `eslint-plugin-react`, por lo que componentes en JSX en minúscula (p. ej.
  `motion`) se reportan como "unused" — es ruido conocido del config, no afecta
  el build.

 # XnovaEvolution

Juego de estrategia espacial en el navegador: minas, edificios, investigación,
naves, defensas, mercado, expediciones y pase VIP.

## Cómo está hecho

| Parte | Dónde | Qué es |
|---|---|---|
| Juego | `public/forja-astral.html` | Un solo HTML con JavaScript simple. Toda la lógica del juego. |
| App contenedora | `src/routes/` | React + TanStack Start. `/` muestra el juego a pantalla completa. |
| Servidor | `src/api/handle.ts`, llamado desde `src/server.ts` para `/api/*` | Cuentas, sesiones, saldo TOKEN, VIP, expediciones, panel. |
| Base de datos | D1 `xnova-evolution`, binding `DB` | Esquema en `db/schema.sql`. |
| Panel | `public/admin.html` | 13 secciones. Requiere rol admin + contraseña del panel. |
| Swap (demo) | `public/swap.html` | Precios ficticios. No mueve dinero real. |
| Imágenes | `public/assets/` | WebP, rutas locales `/assets/...`. |
| Economía | `docs/` | Niveles, VIP, token, swap, fases. |

## Ejecutar y desplegar

Local:

    npm install
    npm run dev

Producción (automático desde GitHub, rama `main`):

- Build: `bun run build` (Vite + Nitro)
- Deploy: `npx wrangler deploy`
- Carpeta publicada: `.output/public` (Nitro copia ahí el contenido de `public/`)
- Worker: `spec-driven-html-refresh`
- URL: https://spec-driven-html-refresh.space-gamexnova.workers.dev

No hay `wrangler.jsonc` en el repo: Nitro genera `.output/server/wrangler.json`
en cada build. Cualquier binding nuevo se declara en la configuración de Nitro.

## Estado de las fases

| Fase | Estado |
|---|---|
| 0. Limpieza del swap | Completada (texto de términos provisional) |
| 1. Modo prueba | Aplicada; el botón se quita antes del lanzamiento |
| 2. Niveles de cuenta | Aplicada |
| 3. Puntos, batallas y VIP | Parcial (ver `docs/`) |
| 4. Verificación de cuentas | Al final, cuando exista la base real |
| 5. Base de datos y servidor | Parte 1 aplicada (etapa B1). Pendiente etapa B2 |
| 6. Economía real y pagos | Pendiente |
| 7. Pruebas y lanzamiento | Pendiente |
| 8. Tiempos de producción | Pendiente |

Detalle de lo aplicado y lo pendiente de cada fase: `docs/`.

## Documentos

- `AGENTS.md` — reglas de trabajo (leer antes de tocar código).
- `docs/economia-niveles-puntos.md`
- `docs/progresion-lenta-y-vip.md`
- `docs/flujo-token-mercado-retiros.md`
- `docs/reglas-swap-y-staking.md`
- `docs/fases-jugabilidad.md`

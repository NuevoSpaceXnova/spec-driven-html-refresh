# XnovaEvolution

Juego de estrategia espacial para el navegador. Construyes tu imperio: levantas minas y edificios, investigas tecnologías, fabricas naves y defensas, y compites por conquistar el universo.

## Cómo está organizado

El proyecto tiene dos partes:

- **El juego.** Vive en un solo archivo HTML, `public/forja-astral.html`, escrito con JavaScript simple. La partida se guarda en el navegador (localStorage). Las imágenes de edificios, naves y minas están en `public/assets/` y se cargan con rutas locales.
- **La aplicación contenedora.** Está hecha con React y TanStack Start. La ruta `/` solo muestra el juego a pantalla completa dentro de un `iframe`. Las rutas están en `src/routes/`.

Además hay un prototipo de **swap y staking** de criptomonedas en `public/swap.html`. Por ahora funciona en **modo demo**, con precios y saldos ficticios; no mueve tokens reales. Sus reglas (comisiones, bloqueos, penalizaciones e intereses) están documentadas en `docs/reglas-swap-y-staking.md`.

## Estructura principal

```
public/
  forja-astral.html    Juego principal
  swap.html            Demo de swap y staking
  assets/              Imágenes del juego
src/
  routes/              Rutas de la aplicación (/ muestra el juego)
  components/ui/       Componentes de interfaz
  lib/                 Utilidades y captura de errores
docs/                  Reglas del swap y del staking
AGENTS.md              Reglas del proyecto para asistentes y colaboradores
```

## Requisitos

- Node.js y npm. Si necesitas instalarlos, usa [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

## Desarrollo local

```sh
git clone https://github.com/NuevoSpaceXnova/spec-driven-html-refresh.git
cd spec-driven-html-refresh
npm install
npm run dev
```

Otros comandos disponibles:

- `npm run build`: genera la versión de producción.
- `npm run preview`: sirve la versión construida.
- `npm run test`: ejecuta las pruebas con Vitest.
- `npm run lint`: revisa el código con ESLint.

## Reglas para editar el proyecto

Antes de hacer cambios, lee `AGENTS.md`. Resume las reglas principales:

- Las imágenes del juego van en `public/assets/` con rutas locales, nunca con URLs de Lovable ni imágenes en base64 dentro del HTML.
- No reescribas el historial de commits que ya se publicaron, porque el proyecto está conectado a Lovable.
- No edites a mano las migraciones de base de datos ni los archivos generados automáticamente.
- No incluyas secretos en el repositorio.

## Desarrollo con Lovable

Este proyecto se creó con [Lovable](https://lovable.dev) y está conectado a su editor. Los cambios hechos allí se guardan como commits en este repositorio, y los que se suben a `main` se sincronizan de vuelta con Lovable.

# XnovaEvolution

Juego de estrategia espacial para el navegador. Construyes tu imperio: levantas minas y edificios, investigas tecnologías, fabricas naves y defensas, y compites por conquistar el universo.

## Instrucciones para Lovable y para cualquier asistente de código

Antes de cambiar cualquier cosa, lee estos documentos en este orden:

1. `AGENTS.md`: reglas generales del proyecto.
2. `docs/economia-niveles-puntos.md`: niveles, puntos, comisiones, verificación de cuentas y control del precio del TOKEN.
3. `docs/progresion-lenta-y-vip.md`: beneficios del pase VIP y reglas de progresión lenta.
4. `docs/flujo-token-mercado-retiros.md`: flujo del TOKEN, distribución de comisiones, pools y retiros.
5. `docs/reglas-swap-y-staking.md`: reglas del swap.
6. `docs/fases-jugabilidad.md`: fases del juego y tiempos.

**Reglas de trabajo:**

- Implementa solo lo que está marcado como **decidido**. Lo que dice **Pendiente** o **Propuesta** no se implementa hasta que el dueño del proyecto lo apruebe.
- Si algo no está claro o falta una decisión, **no la tomes**. Haz una propuesta escrita y espera la aprobación.
- No tomes decisiones legales ni redactes términos y condiciones. Eso lo revisa el abogado del cliente.
- No ocultes al jugador información sobre su dinero, como el estado de sus retiros o si el pago es manual.
- No reescribas archivos grandes completos (`public/forja-astral.html` y `public/swap.html`) para cambiar una línea. Usa cambios puntuales.
- Mantén los documentos de `docs/` alineados con el código. Si cambias una regla, actualiza el documento correspondiente en el mismo cambio.

## Orden de trabajo acordado

0. **Limpieza del swap:** precio inicial del TOKEN en 0,000152, comisión `FEE` en 0,03, quitar el código del staking demo y añadir el check de términos antes de cada swap.
1. **Modo prueba:** separar la velocidad de prueba (x100) en un interruptor claro, y preparar la investigación con tiempo real y cola.
2. **Niveles de cuenta:** Grumete a Almirante, comisiones de retiro por nivel y reinicio de temporada.
3. **Puntos y batallas:** ganancia y pérdida de puntos, efecto del pase VIP, margen 1:3.
4. **Verificación de cuentas:** Telegram, límite de 3 cuentas por IP y antigüedad. Requiere servidor.
5. **Base de datos y servidor:** cuentas, saldos, niveles, puntos, registro de transacciones y panel administrativo protegido.
6. **Economía real y pagos:** contrato del TOKEN en BNB Chain, precios reales, flujo de compra y retiro, y auditoría antes de activar dinero real.
7. **Pruebas y lanzamiento:** pruebas controladas y ajuste de equilibrio.
8. **Tiempos de producción:** calibrar tiempos reales, factores de crecimiento y producción de recursos. Se hace al final.

Antes de la fase 2 hay decisiones pendientes en `docs/economia-niveles-puntos.md`, sección 13.

## Cómo está organizado el proyecto

El proyecto tiene dos partes:

- **El juego.** Vive en un solo archivo HTML, `public/forja-astral.html`, escrito con JavaScript simple. La partida se guarda en el navegador (localStorage). Las imágenes están en `public/assets/`.
- **La aplicación contenedora.** Está hecha con React y TanStack Start. La ruta `/` muestra el juego a pantalla completa dentro de un `iframe`. Las rutas están en `src/routes/`.

Además hay un prototipo de **swap** en `public/swap.html`. Por ahora funciona en **modo demo**, con precios y saldos ficticios; no mueve tokens reales.

## Estructura principal

```
public/
  forja-astral.html    Juego principal
  swap.html            Demo del swap
  assets/              Imágenes del juego
src/
  routes/              Rutas de la aplicación (/ muestra el juego)
  components/ui/       Componentes de interfaz
  lib/                 Utilidades y captura de errores
docs/                  Reglas de economía, progresión, flujo del token, swap y fases
AGENTS.md              Reglas generales del proyecto
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

## Desarrollo con Lovable

Este proyecto se creó con [Lovable](https://lovable.dev) y está conectado a su editor. Los cambios hechos allí se guardan como commits en este repositorio, y los que se suben a `main` se sincronizan de vuelta con Lovable.

# XnovaEvolution

Juego de estrategia espacial para el navegador. Construyes tu imperio: levantas minas y edificios, investigas tecnologías, fabricas naves y defensas, y compites por conquistar el universo.

## Instrucción principal para la IA que trabaje en este proyecto

Antes de cualquier acción, lee esta sección completa y los documentos de la sección siguiente. Luego crea las fases de trabajo a partir del orden acordado.

### Reglas de decisión

- **No tomes decisiones sin el consentimiento del dueño del proyecto.** Si falta un dato, un valor o una regla, propón una opción por escrito y espera.
- **Pregunta siempre antes de implementar y espera la aprobación.** No empieces a cambiar código ni documentos hasta recibir un sí explícito.
- Implementa solo lo que está marcado como **decidido** en los documentos. Lo que dice **Pendiente** o **Propuesta** no se implementa.
- No tomes decisiones legales ni redactes términos y condiciones. Eso lo revisa el abogado del cliente.
- No decidas qué mensajes ve el jugador. Si dudas si un mensaje se mantiene o se quita, pregunta.

### Forma de comunicarte

- Háblale en lenguaje claro, sin términos de programación. Si es imprescindible mencionar un archivo o una línea, hazlo en una frase corta.
- No des explicaciones largas. Responde con lo necesario.
- **No digas en qué estás trabajando ni en qué vas a trabajar.** Solo informa de lo que se pidió, de lo que se hizo y de lo que se necesita del dueño.

### Flujo de trabajo para cada tarea

1. **Revisión quirúrgica y focalizada:** mira solo lo necesario para la tarea aprobada. No revises todo el proyecto.
2. **Implementación quirúrgica:** cambia lo mínimo indispensable. No reescribas archivos completos ni toques partes que no estén en la tarea.
3. **Resumen de lo implementado:** en pocas frases, en lenguaje claro, qué quedó hecho.
4. **Prueba en el juego:** verifica que el cambio funciona en el juego antes de darlo por terminado.
5. **Cierre de la implementación:** confirma al dueño que la tarea está cerrada y espera la siguiente aprobación.

## Fases de trabajo acordadas

Crea a partir de esta lista las fases de trabajo, y propón al dueño el orden antes de empezar:

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

## Documentos que debes leer

1. `AGENTS.md`: reglas generales del proyecto.
2. `docs/economia-niveles-puntos.md`: niveles, puntos, comisiones, verificación de cuentas y control del precio del TOKEN.
3. `docs/progresion-lenta-y-vip.md`: beneficios del pase VIP y reglas de progresión lenta.
4. `docs/flujo-token-mercado-retiros.md`: flujo del TOKEN, distribución de comisiones, pools y retiros.
5. `docs/reglas-swap-y-staking.md`: reglas del swap.
6. `docs/fases-jugabilidad.md`: fases del juego y tiempos.

Si un documento y el código no coinciden, avisa al dueño y espera su decisión. No corrijas el código para que coincida sin aprobación.

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

## Edición

El proyecto puede editarse con cualquier editor o asistente de código. Los cambios se registran como commits en el repositorio, y la rama `main` es la fuente de verdad.

# XnovaEvolution

Juego de estrategia espacial para el navegador. Construyes tu imperio: levantas minas y edificios, investigas tecnologías, fabricas naves y defensas, y compites por conquistar el universo.

## Instrucción principal para la IA que trabaje en este proyecto

Antes de cualquier acción, lee esta sección completa y los documentos de la sección siguiente. Luego crea las fases de trabajo a partir del orden acordado.

### Reglas que debes cumplir siempre

1. No tomes decisiones sin mi consentimiento. Si falta un dato, un valor o una regla, propón una opción por escrito y espera mi respuesta.
2. Pregúntame siempre antes de implementar algo y espera mi aprobación explícita. No cambies código ni documentos sin ese sí.
3. Implementa solo lo que los documentos marcan como "decidido". Lo que dice "Pendiente" o "Propuesta" no se implementa.
4. No tomes decisiones legales ni redactes términos y condiciones. Eso lo revisa el abogado del cliente.
5. No decidas qué mensajes ve el jugador. Si dudas si un mensaje se mantiene o se quita, pregúntame.
6. Háblame en lenguaje claro, sin términos de programación. No des explicaciones largas. No me digas en qué estás trabajando ni en qué vas a trabajar.
7. Si un documento y el código no coinciden, avísame y espera mi decisión. No corrijas el código por tu cuenta.

### Forma de trabajo para cada tarea aprobada

1. **Revisión quirúrgica y focalizada:** mira solo lo necesario para la tarea aprobada. No revises todo el proyecto.
2. **Implementación quirúrgica:** cambia lo mínimo indispensable. No reescribas archivos completos ni toques partes que no estén en la tarea.
3. **Resumen de lo implementado:** en pocas frases, en lenguaje claro, qué quedó hecho.
4. **Prueba en el juego:** verifica que el cambio funciona en el juego antes de darlo por terminado.
5. **Cierre de la implementación:** confirma que la tarea está cerrada y espera la siguiente aprobación.

### Reglas de trabajo con el repositorio

1. Todo se trabaja directamente en la rama `main`. No se usan ramas de prueba.
2. Cada fase o actualización terminada se guarda con un commit y se sube con push a `main`. Al final se informa el nombre del commit.
3. Cada vez que se complete una fase o se actualice el juego, se actualizan las reglas y la información de este README, de `AGENTS.md` y de los documentos de `docs/` que correspondan (estado de las fases y decisiones), para mantener el orden.

### Primer paso

Lee el README y los documentos indicados, y responde solo con:

- (a) confirmación de que los leíste,
- (b) la lista de fases que propones, en el orden de abajo, para que yo la apruebe o la cambie,
- (c) las preguntas que necesites que yo responda antes de la fase 1.

No empieces a implementar nada hasta que yo apruebe la lista de fases.

## Fases de trabajo acordadas

Crea a partir de esta lista las fases de trabajo, y propón al dueño el orden antes de empezar:

0. **Limpieza del swap:** precio inicial del TOKEN en 0,000152, comisión `FEE` en 0,03, quitar el código del staking demo y añadir el check de términos antes de cada swap. **Estado: completada** (check de términos con texto provisional, pendiente del abogado).
1. **Modo prueba:** separar la velocidad de prueba (x100) en un interruptor claro. La investigación con tiempo real y cola está **pendiente de aprobación** (fórmula y si la cola es por planeta o por cuenta); no se implementa hasta que se apruebe. **Estado: aplicada** (botón "Activar modo prueba" en ajustes, velocidad normal x1). **Regla:** el botón de modo prueba y el selector de velocidad se quitan antes del lanzamiento oficial.
2. **Niveles de cuenta:** de Aspirante a Almirante, comisiones de retiro por nivel y reinicio de temporada. **Estado: aplicada** (siete niveles, comisiones 70 a 5 %, temporada de 30 días reales; los puntos llegan en la fase 3).
3. **Puntos y batallas:** ganancia y pérdida de puntos, efecto del pase VIP, margen 1:3. **Estado: parcial.** Aplicado: puntos para subir de nivel (1.000 a 60.000), barra de progreso en Perfil (pestaña "Nivel y temporada"), puntos por batalla (+50, −30 % por ataque perdido, −20 % por defensa perdida) también para los rivales simulados, bajada de nivel, reinicio de puntos por temporada y reemplazo de los rangos antiguos por los niveles. Aplicado también: pase VIP con la pérdida de puntos reducida a la mitad, insignia VIP/FREE junto al botón Swap, compra del VIP en ventana (98.684 TOKEN, 30 días reales desde la activación), producción +50 %, construcción e investigación +50 % y venta de naves en P2P solo para VIP. Pendiente: comisión P2P VIP del 5 % (falta decidir la base y el momento del cobro, sección 7.2 de economía). Pendiente: guerra de alianzas (se decide con el equipo) y aumento de ganancia con VIP.
4. **Verificación de cuentas:** Telegram, límite de 3 cuentas por IP y antigüedad. Requiere servidor. **Decisión: esta fase se hace al final de todo**, cuando empiece la base de datos real, porque el bot de Telegram y las IP aún no están listos.
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

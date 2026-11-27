# Economía, niveles y puntos · XnovaEvolution

Este documento registra las decisiones tomadas sobre la economía y la progresión del juego, y las decisiones que todavía están pendientes. Las secciones marcadas como **Pendiente** no deben implementarse hasta confirmarse. Las secciones marcadas como **Propuesta** esperan aprobación.

Complementa a `docs/progresion-lenta-y-vip.md` (beneficios VIP), `docs/fases-jugabilidad.md` (fases y tiempos) y `docs/flujo-token-mercado-retiros.md` (flujo del token, pools y retiros).

---

## 0. Estado del proyecto

- El juego corre en modo prueba, sin jugadores reales. Todo (partida, saldos demo) se guarda en el navegador.
- Las funciones que requieren servidor y base de datos se implementan en la fase real, cuando el juego esté listo o al menos al 90 %.
- Los fondos de los jugadores se resguardan en un **saldo de respaldo (guarda wallet)**. El detalle queda pendiente hasta la fase real.

## 1. Orden de implementación

1. **Sistema de niveles de cuenta** (primero).
2. **Sistema de puntos**: cuántos puntos se ganan y pierden, con los valores de cada acción.
3. **Verificación de cuentas y antigüedad** (sección 10). **Decisión: se hace al final de todo**, cuando empiece la base de datos real, porque el bot de Telegram y las IP aún no están listos.
4. **Control del precio del TOKEN y comisión variable del swap** (sección 11).
5. **Token interno, swap y retiros** en su versión real.
6. **Pase VIP, pool interna y resto de ingresos** (sección 12).

## 2. Niveles de cuenta

### 2.1 Reglas decididas

- Hay **siete niveles**: Aspirante (nivel 1), Cadete, Marinero, Cabo, Teniente, Capitán y Almirante (nivel 7).
- El nivel inicial es **Aspirante (nivel 1)**.
- La progresión es difícil a propósito: subir de nivel requiere puntos y no basta con acumularlos rápido.
- La comisión de retiro **baja gradualmente** al subir de nivel:

| Nivel | Comisión de retiro |
|---|---|
| Aspirante | 70 % |
| Cadete | 60 % |
| Marinero | 50 % |
| Cabo | 40 % |
| Teniente | 30 % |
| Capitán | 15 % |
| Almirante | 5 % |

- **Tiempo mínimo en cada nivel: 3 días** (decisión provisional). Se aplicará cuando existan los puntos (fase 3) y se revisará después de las pruebas.

### 2.2 Temporada

- Cada temporada dura **30 días reales** desde que se activa.
- Si el jugador **alcanzó el nivel Teniente** durante la temporada, conserva su nivel al terminar.
- Si **no alcanzó Teniente**, vuelve a **Aspirante (nivel 1)** al terminar.
- El botón para iniciar una temporada nueva irá en el panel administrativo (fase 5).

### 2.3 Puntos para subir de nivel (fase 3, aplicado)

| De nivel | A nivel | Puntos para subir | Puntos acumulados |
|---|---|---|---|
| Aspirante | Cadete | 1.000 | 1.000 |
| Cadete | Marinero | 2.000 | 3.000 |
| Marinero | Cabo | 5.000 | 8.000 |
| Cabo | Teniente | 10.000 | 18.000 |
| Teniente | Capitán | 25.000 | 43.000 |
| Capitán | Almirante | 60.000 | 103.000 |

- La barra de progreso de Perfil, pestaña "Nivel y temporada", muestra los puntos del nivel actual. Al subir de nivel, la barra vuelve a 0 % y la comisión cambia.
- Al terminar la temporada, los puntos vuelven a 0. Si el jugador conserva su nivel (Teniente o superior), la barra empieza en 0 % en ese nivel.
- Se sube de nivel solo si pasaron **3 días** en el nivel actual (provisional, revisar después de las pruebas).

### 2.4 Pendiente

- Cómo se ganan los puntos (se define en una pestaña dentro de Perfil, después de la fase 3).
- Revisión del tiempo mínimo de 3 días después de las pruebas.

## 3. Ataques entre jugadores

### 3.1 Reglas decididas

- Un jugador **de menor nivel no puede atacar** a un jugador de mayor nivel.
- Un jugador **nuevo no puede ser atacado** por un jugador de nivel mayor.
- Debe existir un **margen 1:3** en los ataques para mantener el equilibrio.
- Un jugador **puede tener varias cuentas**, pero **no puede atacar a sus propias cuentas**. La detección se hace por dirección IP.

### 3.2 Pendiente

- Qué mide el margen 1:3: diferencia de niveles, diferencia de puntos o relación de poder militar.
- Qué significa "jugador nuevo": cuántos días, cuántos puntos o qué nivel.
- Tratamiento de IP compartidas (hogares, redes móviles con IP común), para no bloquear a jugadores legítimos.

## 4. Resolución de batallas

### 4.1 Reglas decididas

- Las defensas del jugador (por ejemplo lanzamisiles) protegen su territorio.
- Si la **defensa es más fuerte que el ataque recibido**, el defensor gana la batalla:
  - El defensor **gana puntos**.
  - El atacante **pierde puntos**.
- Si el ataque vence, ocurre lo contrario: el atacante gana puntos y el defensor pierde.
- La pérdida de puntos es un **porcentaje**, no un monto fijo.

### 4.2 Valores aplicados (fase 3)

- Ganar un ataque o una defensa exitosa: **+50 puntos**.
- Perder un ataque: **−30 %** de tus puntos.
- Perder una defensa (tu defensa pierde contra un ataque): **−20 %** de tus puntos.
- Quién gana la batalla lo decide la simulación de combate que ya existía en el juego, según las defensas de la cuenta (láseres, lanzamisiles, etc.).
- Si los puntos bajan del mínimo de un nivel, el jugador **baja de nivel**. Nadie baja de Aspirante ni cae por debajo de cero.
- **Lado del rival (demo):** los rivales simulados aplican las mismas reglas:
  - Si un rival te ataca y **gana**: el rival gana +50 y **tú** pierdes el 20 % de tus puntos. Tú puedes bajar de nivel.
  - Si un rival te ataca y **pierde** contra tu defensa: el rival pierde el 30 % y puede bajar de nivel.
  - Si tú atacas a un rival y **ganas**: el rival pierde el 20 % y puede bajar de nivel.
  - Si tú atacas a un rival y **pierdes**: el rival gana +50.
  Con jugadores reales en otros dispositivos, se requiere el servidor (fase 5).

### 4.3 Pendiente

- Guerra de alianzas: cómo funciona y cuántos puntos da (tema pendiente).
- Efecto del pase VIP en estas cifras (sección 5.2).

## 5. Pase VIP

### 5.1 Reglas decididas

- **Precio:** 15 USD, fijo en USD.
- **Forma de pago:** el jugador paga en TOKEN. La cantidad de TOKEN es el equivalente de 15 USD al precio vigente del TOKEN en el momento de la compra. Si el precio del TOKEN sube, la cantidad a pagar cambia.
- **Compra previa:** el jugador primero compra TOKEN en el swap y después activa el VIP dentro del juego.
- **Duración:** 30 días reales desde la activación. *Aplicado en el juego (modo prueba): compra en ventana con 98.684 TOKEN al precio actual.*
- **Renovación:** manual. El jugador debe renovar el VIP cuando venza.
- **Reparto del pago:**
  - 40 % para el dueño del juego.
  - 40 % para la reserva de los jugadores.
  - 10 % para la pool de jugadores free, que se reparte en misiones limitadas por día.
  - 10 % como respaldo, sin asignar, para eventos o premios imprevistos.
- **Efectos:**
  - Activar el pase VIP **reduce a la mitad (−50 %) los puntos que se pierden** en una derrota: ataque perdido 30 % pasa a 15 %, defensa perdida 20 % pasa a 10 %.
  - El pase VIP **no cambia los puntos ganados** en una victoria.
  - Otros beneficios (producción, mejora, comisión P2P y venta de naves) están en `docs/progresion-lenta-y-vip.md`.

### 5.2 Pendiente

- Si el pase VIP cambia la comisión de retiro o solo afecta los puntos y los beneficios de la sección 3 de `docs/progresion-lenta-y-vip.md`.
- Qué pasa con los días restantes si el jugador renueva antes de vencer.

## 6. Token interno, swap y comisiones

### 6.1 Reglas decididas

- **Dentro del juego solo se comercia y se gana TOKEN.** USDT y BNB solo sirven para depositar y para retirar.
- **El swap es la página que se abre al hacer clic en "swap".** Ahí se cambia TOKEN por USDT o BNB.
- La comisión del **swap es variable**, entre un **mínimo de 3 %** y un **máximo de 12 %**. El valor vigente depende de la presión de compras y ventas (sección 11).
- **Destino de la comisión del swap:** 100 % a la reserva de los jugadores.
- El valor vigente de la comisión se muestra al jugador en el resumen antes de confirmar cada operación.
- Antes de cada swap, el jugador debe marcar un **check verde ✅** que acepta los términos y condiciones. Sin ese check, el swap no se ejecuta. Se pide en cada operación.
- El **retiro a wallet** tiene una comisión de **70 %** para el nivel inicial (sección 2).
- El USDT y el BNB que se pagan a los jugadores salen de una **reserva**.

### 6.2 Pendiente

- Texto final de los términos y condiciones. La redacción la revisa el abogado del cliente.
- Mecanismo exacto de la comisión variable (sección 11.2).
- Si la comisión de retiro aplica también a las ventas en el swap.

## 7. Mercado P2P de recursos

### 7.1 Reglas decididas

- **El mercado P2P y el mercado de recursos son el mismo mercado.**
- El comprador **no paga comisión**. El vendedor la paga en TOKEN al publicar el aviso de venta.
- **Comisión free: 15 %**, repartida así:
  - 7,5 % para la **reserva de los jugadores**.
  - 7,5 % para el **dueño del juego**.
- **Comisión VIP: 5 %**, repartida así:
  - 2,5 % para la **reserva de los jugadores**.
  - 2,5 % para el **dueño del juego**.
- La parte del dueño se acumula en TOKEN en el saldo de retiro de la administración (sección 12.1).

### 7.2 Pendiente

- Comisión P2P de recursos: **aplicada** sobre el precio total de la venta, cobrada en TOKEN al publicar el aviso (free 15 %, VIP 5 %). Pendiente: si la venta de naves también paga comisión.

## 8. Interés de los jugadores: eliminado

- **Se elimina el staking interno del juego.** No habrá pools, bloqueos, penalizaciones por retiro anticipado ni interés pagado en TOKEN a los jugadores.
- La motivación es reducir complejidad y no prometer rendimientos que dependan de ingresos variables.

## 9. Cambios aplicados al swap demo (fase 0)

- Se quitó el código del staking demo de `public/swap.html`.
- El precio inicial del TOKEN en la demo es **0,000152 USD** (sección 11).
- La comisión `FEE` en la demo es **0,03** (mínimo de la comisión variable decidida).
- El check de términos antes de cada swap está aplicado, con texto provisional pendiente del abogado.
- Commit: `d64ae00`.

## 10. Verificación de cuentas

### 10.1 Reglas decididas

- **Verificación por Telegram** mediante un bot. Una cuenta de Telegram solo puede estar vinculada a **una cuenta del juego**. Si ya está vinculada a otra, no se puede usar.
- La verificación de Telegram es **requisito** para:
  - comerciar en el mercado de recursos (P2P),
  - operar en el swap,
  - retirar a wallet.
- Se **permiten varias cuentas por jugador**, con un **máximo de 3 cuentas por dirección IP**.
- Un jugador **no puede atacar a sus propias cuentas**. La detección se hace por IP.
- No habrá verificación de identidad documental.
- **Objetivo:** mitigar las multicuentas, no eliminarlas. Telegram único, límite por IP, antigüedad y la regla de no atacar cuentas propias hacen que tener muchas cuentas sea costoso y poco rentable.

### 10.2 Antigüedad mínima (pendiente de decisión)

**Propuesta:** 7 días. Es suficiente para frenar las cuentas creadas solo para retirar, sin castigar demasiado a un jugador nuevo.

Alternativa: 15 días. Protege más, pero puede desmotivar a los jugadores nuevos antes de llegar a la primera progresión.

Propuesta de alcance: la antigüedad aplica a los **retiros** y al **comercio** (mercado de recursos, P2P y swap). El ataque y la progresión de niveles no dependen de ella.

### 10.3 Pendiente

- Proceso de apelación para jugadores que compartan IP sin ser la misma persona (redes móviles, oficinas, universidades).
- Medidas adicionales contra la evasión por cambio de red o VPN, si el cliente lo requiere.

## 11. Control del precio del TOKEN y comisión variable

### 11.1 Reglas decididas

- **Valor inicial del TOKEN: 0,000152 USD.**
- **Moderación del precio a mano:** el precio sube y baja por decisión de la administración. No se usa una curva automática, porque una curva predecible puede ser manipulada por los jugadores.
- **Comisión variable del swap** entre 3 % (mínimo) y 12 % (máximo), que sube y baja según la presión de compras y ventas.
- **Límites por cuenta y por temporada:** máximo de TOKEN que se puede comprar o vender por día, por temporada o por nivel.
- **Liberación gradual de liquidez:** lo que compra un jugador grande no se puede retirar de inmediato, sino que se libera en tramos.
- **Piso de precio respaldado por la reserva:** el proyecto se compromete a recomprar a un precio mínimo. Esto solo se activa si la reserva tiene USDT y BNB suficientes.

### 11.2 Pendiente

- **Criterios internos de la administración** para mover el precio: qué señales usa, con qué frecuencia y con qué límite por movimiento.
- **Mecanismo de la comisión variable:** qué mide la presión de compras y ventas, cada cuánto se recalcula y cómo se pasa del 3 % al 12 %.
- **Límites exactos** por día, temporada y nivel.
- **Duración y tramos** de la liberación gradual.
- **Monto del piso de precio** y cuánta reserva se destina a sostenerlo.
- **Regla de reserva mínima:** qué pasa cuando la reserva se acerca a cero.

## 12. Destinos de ingresos

### 12.1 Acumulación en la administración

- Toda la parte del dueño se acumula en **TOKEN** en un **saldo de retiro de la administración**.
- Ese saldo incluye:
  - 50 % de las comisiones del mercado P2P (la mitad del 15 % free y la mitad del 5 % VIP, es decir 7,5 % y 2,5 %).
  - 40 % del pase VIP.
- Desde ese saldo, el dueño decide en su wallet cuánto se destina a staking externo y cuánto se queda para él.
- **Solo esa mitad de las comisiones del mercado y el 40 % del VIP son retirables por el dueño.**

### 12.2 Tabla de destinos

| Ingreso | Reserva de jugadores | Dueño (saldo de retiro) | Otro |
|---|---|---|---|
| Pase VIP (15 USD) | 40 % | 40 % | 10 % pool free, 10 % respaldo |
| Comisión P2P free (15 %) | 7,5 % | 7,5 % | — |
| Comisión P2P VIP (5 %) | 2,5 % | 2,5 % | — |
| Comisión del swap (3 % a 12 %) | 100 % | — | — |
| Venta de artículos y naves de temporada | Pendiente | Pendiente | Pendiente |

### 12.3 Pendiente

- Destino de la venta de artículos y naves de temporada (sección 12.2).
- Si el 10 % de respaldo del VIP tiene un tope o una regla de uso (`docs/flujo-token-mercado-retiros.md`, sección 3.3).

## 13. Decisiones pendientes (lista completa)

Esta lista reúne todas las decisiones pendientes de los documentos de `docs/`. Cuando se aprueba una, se pasa a la sección correspondiente como decidida y se quita de aquí.

### 13.1 Niveles y puntos
1. Resuelto en fase 2: siete niveles, con nombres (sección 2.1).
2. Resuelto en fase 2: comisión de retiro de cada nivel (sección 2.1).
3. Resuelto en fase 3: puntos requeridos para subir a cada nivel (sección 2.3). Pendiente: cómo se ganan los puntos (sección 2.4).
4. Resuelto en fase 2 como provisional: 3 días mínimos en cada nivel. Revisar después de las pruebas (sección 2.3).
5. Significado exacto del margen 1:3 (sección 3.2).
6. Definición de "jugador nuevo" (sección 3.2).
7. Tratamiento de IP compartidas (sección 3.2).
8. Resuelto en fase 3: pérdida de 30 % (ataque) y 20 % (defensa) (sección 4.2).
9. Resuelto en fase 3: +50 puntos por victoria o defensa exitosa (sección 4.2).
10. Resuelto en fase 3: la simulación de combate existente decide (sección 4.2).
11. Resuelto en fase 3: no se baja de Aspirante ni de cero (sección 4.2).

### 13.2 Pase VIP
12. Resuelto en fase 3: pérdida con VIP reducida a la mitad. Decidido: el pase VIP no aumenta los puntos ganados (sección 5.2).
13. Si el VIP cambia la comisión de retiro o solo afecta puntos y beneficios (sección 5.2).
14. Qué pasa con los días restantes al renovar antes de vencer (sección 5.2).

### 13.3 Swap, retiros y comisiones
15. Texto final de los términos y condiciones del swap. Lo revisa el abogado del cliente (sección 6.2).
16. Mecanismo de la comisión variable del swap (secciones 6.2 y 11.2).
17. Si la comisión de retiro aplica también a las ventas en el swap (sección 6.2).
18. Base de la comisión P2P: precio total o cantidad, y momento de cobro (sección 7.2).
19. Equivalente en USD del TOKEN para el umbral de retiro de 10 USD (`docs/flujo-token-mercado-retiros.md`, sección 4.1).
20. Base de la comisión de retiro por nivel: sobre TOKEN o sobre USDT/BNB (`docs/flujo-token-mercado-retiros.md`, sección 4.1).
21. Qué pasa con las solicitudes de retiro recibidas fuera de horario (`docs/flujo-token-mercado-retiros.md`, sección 5.4).
22. Trazabilidad de cada pago en el panel administrativo (`docs/flujo-token-mercado-retiros.md`, sección 5.4).
23. Aprobación de la comunicación al jugador sobre el estado del retiro (`docs/flujo-token-mercado-retiros.md`, sección 5.3).
24. Texto final de los estados y de las preguntas frecuentes del retiro (`docs/flujo-token-mercado-retiros.md`, sección 5.4).
25. Qué pasa si el vendedor cancela un aviso de venta después de pagar la comisión (`docs/flujo-token-mercado-retiros.md`, sección 2.1).
26. Lista de criptos disponibles en el swap. La lista actual viene del prototipo y no está aprobada (`docs/reglas-swap-y-staking.md`, sección 1).

### 13.4 Precio del TOKEN, control y conexión con redes reales
27. Criterios internos de la administración para mover el precio (sección 11.2).
28. Límites exactos por día, temporada y nivel (sección 11.2).
29. Duración y tramos de la liberación gradual (sección 11.2).
30. Monto del piso de precio y reserva destinada a sostenerlo (sección 11.2).
31. Regla de reserva mínima cuando la reserva se acerca a cero (sección 11.2).
32. Direcciones de contrato de las criptos de referencia en BNB Chain. El TOKEN no tiene contrato (`docs/reglas-swap-y-staking.md`, sección 7).
33. Fuente de precios de las criptos para la fase real: API o contrato oráculo (`docs/reglas-swap-y-staking.md`, secciones 2 y 7).
34. Router de intercambio y flujo de aprobación de tokens (`docs/reglas-swap-y-staking.md`, sección 7).
35. Auditoría de seguridad del servidor de saldos y de los retiros antes de activar dinero real (`docs/reglas-swap-y-staking.md`, sección 7).

### 13.5 Pool free, respaldo y otros ingresos
36. Límite diario de las misiones de la pool free, en TOKEN por día y por jugador (`docs/flujo-token-mercado-retiros.md`, sección 3.3).
37. Regla de uso del respaldo de 10 %: quién lo autoriza y en qué casos (sección 12.3).
38. Destino de la venta de artículos y naves de temporada (sección 12.2).

### 13.6 Cuentas y verificación
39. Antigüedad mínima: 7 días (propuesta) o 15 días (sección 10.2).
40. Proceso de apelación para IP compartidas (sección 10.3).
41. Medidas contra evasión por VPN o cambio de red, si el cliente lo requiere (sección 10.3).
42. Saldo de respaldo (guarda wallet): detalle de funcionamiento hasta la fase real (sección 0).

### 13.7 Progresión y beneficios VIP (`docs/progresion-lenta-y-vip.md`)
43. Factores de crecimiento de costo y tiempo por edificio, investigación, nave y defensa (sección 2.1).
44. Requisitos exactos de cada desbloqueo por fase (sección 2.1).
45. Duración esperada de cada fase para un jugador gratuito (sección 2.1).
46. ~~Si el beneficio de velocidad aplica a la cola de naves~~ **Resuelto:** sí, el VIP da +50 % también a la construcción de naves (`docs/progresion-lenta-y-vip.md`, sección 3).
47. Compensación para jugadores free frente al VIP (riesgo 2).
48. Vigilancia de la presión de oferta de la producción VIP sobre el precio (riesgo 1).

### 13.8 Tiempos y fases (`docs/fases-jugabilidad.md`)
49. Fórmula de tiempo de investigaciones (propuesta en `docs/fases-jugabilidad.md`, sección 3.2).
50. Si la cola de investigación es por planeta o por cuenta (sección 3.2).
51. Revisión del tiempo de construcción de naves por fase (sección 3.3).
52. Lista completa de edificios, investigaciones y naves con costo, tiempo y requisito (`docs/fases-jugabilidad.md`, sección 5).
53. Consumo de energía en la recuperación de minas (`docs/fases-jugabilidad.md`, sección 5).
54. ~~Número de colas de construcción por fase~~ **Resuelto en el juego (modo prueba):** 1 orden para cuentas free y hasta 4 para VIP (`docs/progresion-lenta-y-vip.md`, sección 3).
55. Requisitos exactos de nivel de edificio para cada fase (`docs/fases-jugabilidad.md`, sección 5).
56. Quitar las configuraciones de prueba antes del lanzamiento (`docs/fases-jugabilidad.md`, sección 1).

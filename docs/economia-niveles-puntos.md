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
3. **Verificación de cuentas y antigüedad** (sección 10).
4. **Control del precio del TOKEN y comisión variable del swap** (sección 11).
5. **Token interno, swap y retiros** en su versión real.
6. **Pase VIP, pool interna y resto de ingresos**.

## 2. Niveles de cuenta

### 2.1 Reglas decididas

- El nivel inicial es **Grumete (nivel 1)**.
- La progresión es difícil a propósito: subir de nivel requiere puntos y no basta con acumularlos rápido.
- La comisión de retiro **baja gradualmente** al subir de nivel. El nivel inicial paga **70 %** y el máximo paga **5 %**.

### 2.2 Reinicio por temporada

- Los puntos se reinician cada mes (temporada).
- Si el jugador **alcanzó el nivel Teniente** durante la temporada, conserva su nivel al reiniciarse.
- Si **no alcanzó Teniente**, vuelve a **Grumete (nivel 1)** al reiniciarse.

### 2.3 Pendiente

- Nombre y cantidad de niveles entre Grumete y el nivel máximo.
- Comisión de retiro de cada nivel intermedio (solo están fijados 70 % al inicio y 5 % al final).
- Puntos necesarios para subir a cada nivel.
- Tiempo mínimo en un nivel antes de poder subir (si se aplica).

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

### 4.2 Pendiente

- Porcentaje de puntos que se pierde en cada derrota.
- Cantidad de puntos que se gana en cada victoria o defensa exitosa.
- Fórmula exacta para decidir quién gana la batalla.
- Si existe un mínimo de puntos para no caer por debajo de cero.

## 5. Pase VIP

### 5.1 Reglas decididas

- **Precio:** 15 USD.
- **Duración:** 30 días.
- **Forma de activarlo:** el jugador primero compra TOKEN en el swap y después activa el VIP dentro del juego pagando con ese TOKEN.
- **Reparto del pago:**
  - 40 % para el dueño del juego.
  - 40 % para la reserva de los jugadores.
  - 10 % para la pool de jugadores free, que se reparte en misiones limitadas por día.
  - 10 % como respaldo, sin asignar, para eventos o premios imprevistos.
- **Efectos:**
  - Activar el pase VIP **reduce el porcentaje de puntos que se pierde** en una derrota.
  - El pase VIP **aumenta los puntos ganados** en una victoria.
  - Otros beneficios (producción, mejora, comisión P2P y venta de naves) están en `docs/progresion-lenta-y-vip.md`.

### 5.2 Pendiente

- Si el precio de 15 USD se mantiene fijo en USD o se convierte a TOKEN según el precio vigente. Con el precio inicial del TOKEN (sección 11), 15 USD equivalen a unos 98.684 TOKEN.
- Qué pasa al vencer el pase: renovación manual, automática o solo bajo aviso.
- Porcentaje exacto de reducción de pérdida y de aumento de ganancia de puntos.
- Si el pase VIP cambia la comisión de retiro o solo afecta los puntos y los beneficios de la sección 3 de `docs/progresion-lenta-y-vip.md`.

## 6. Token interno, swap y comisiones

### 6.1 Reglas decididas

- La comisión del **swap es variable**, entre un **mínimo de 3 %** y un **máximo de 12 %**. El valor vigente depende de la presión de compras y ventas (sección 11).
- El valor vigente de la comisión se muestra al jugador en el resumen antes de confirmar cada operación.
- Antes de cada swap, el jugador debe marcar un **check verde ✅** que acepta los términos y condiciones. Sin ese check, el swap no se ejecuta. Se pide en cada operación.
- El **retiro a wallet** tiene una comisión de **70 %** para el nivel inicial (sección 2).
- El USDT y el BNB que se pagan a los jugadores salen de una **reserva**.

### 6.2 Pendiente

- Texto final de los términos y condiciones. La redacción la revisa el abogado del cliente.
- Mecanismo exacto de la comisión variable (sección 11.2).
- Si la comisión de retiro aplica también a las ventas en el swap.

## 7. Otros ingresos del proyecto

Para más adelante:

- Comisión de **5 %** en el mercado P2P, ya definida en `docs/progresion-lenta-y-vip.md` (15 % free, 5 % VIP).
- Venta de artículos o naves de temporada.

Su distribución está en `docs/flujo-token-mercado-retiros.md`, sección 3.2.

## 8. Inconsistencias con documentos existentes

- `public/swap.html` usa un precio inicial de **0,80** para el TOKEN en la demo. El precio inicial decidido es **0,000152 USD** (sección 11). Hay que cambiarlo en la fase real.
- `public/swap.html` tiene la constante `FEE` en `0.003` (0,3 %). Debe cambiarse a `0.03`, que es el mínimo de la comisión variable decidida.
- El documento de swap describe un reloj de juego y saldos demo en el navegador. Esto sigue vigente mientras el proyecto esté en modo prueba.

## 9. Decisiones pendientes (resumen)

1. Cantidad y nombres de niveles, y comisión de cada uno.
2. Puntos requeridos para cada nivel y tiempo mínimo por nivel.
3. Significado exacto del margen 1:3 en ataques.
4. Definición de "jugador nuevo".
5. Porcentajes y montos de puntos ganados y perdidos en batalla.
6. Fórmula de resolución de batallas.
7. Precio del VIP en USD fijo o en TOKEN, y renovación al vencer (sección 5.2).
8. Porcentajes exactos de ventaja VIP en puntos.
9. Si la comisión de retiro aplica al swap.
10. Detalles del saldo de respaldo (guarda wallet).
11. Ingresos adicionales: naves y artículos de temporada.
12. Antigüedad mínima de cuenta: 7 o 15 días (sección 10).
13. Tratamiento de IP compartidas (sección 3.2).
14. Mecanismo de la comisión variable del swap y de la moderación del precio (sección 11.2).
15. Parámetros de control de precio (sección 11.2).
16. Texto final de los términos y condiciones del swap (sección 6.2).

## 10. Verificación de cuentas

### 10.1 Reglas decididas

- **Verificación por Telegram** mediante un bot. Una cuenta de Telegram solo puede estar vinculada a **una cuenta del juego**. Si ya está vinculada a otra, no se puede usar.
- La verificación de Telegram es **requisito** para:
  - comerciar en el mercado de recursos,
  - comerciar en el P2P,
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
- **Moderación del precio:** el precio sube y baja desde la administración, que modera su evolución.
- **Comisión variable del swap** entre 3 % (mínimo) y 12 % (máximo), que sube y baja según la presión de compras y ventas.
- **Límites por cuenta y por temporada:** máximo de TOKEN que se puede comprar o vender por día, por temporada o por nivel.
- **Liberación gradual de liquidez:** lo que compra un jugador grande no se puede retirar de inmediato, sino que se libera en tramos.
- **Piso de precio respaldado por la reserva:** el proyecto se compromete a recomprar a un precio mínimo. Esto solo se activa si la reserva tiene USDT y BNB suficientes.

### 11.2 Pendiente

- **Mecanismo de moderación del precio:** si la administración lo mueve manualmente cada vez, o si lo hace una regla con límites. Esta decisión cambia la regla de curva de precio que se había propuesto antes, por lo que hay que confirmarla.
- **Mecanismo de la comisión variable:** qué mide la presión de compras y ventas, cada cuánto se recalcula y cómo se pasa del 3 % al 12 %.
- **Parámetros de la curva o regla de precio:** cuánto puede subir o bajar el precio por día, por operación o por temporada.
- **Límites exactos** por día, temporada y nivel.
- **Duración y tramos** de la liberación gradual.
- **Monto del piso de precio** y cuánta reserva se destina a sostenerlo.
- **Regla de reserva mínima:** qué pasa cuando la reserva se acerca a cero.

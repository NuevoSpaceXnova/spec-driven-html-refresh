# Economía, niveles y puntos · XnovaEvolution

Este documento registra las decisiones tomadas hasta hoy sobre la economía y la progresión del juego, y las decisiones que todavía están pendientes. Las secciones marcadas como **Pendiente** no deben implementarse hasta que se cierren.

---

## 0. Estado del proyecto

- El juego corre sin base de datos. Todo (partida, saldos demo) se guarda en el navegador para probarlo.
- La base de datos real se incorpora cuando el juego esté listo, o al menos al 90 %. Desde ese momento los saldos, niveles, puntos y retiros se validan en el servidor.
- Los fondos de los jugadores se resguardan en un **saldo de respaldo (guarda wallet)**. El detalle de cómo funciona queda pendiente hasta la fase de base de datos.

## 1. Orden de implementación

1. **Sistema de niveles de cuenta** (primero).
2. **Sistema de puntos**: cuántos puntos se ganan y pierden, con los valores de cada acción. Se define después de tener los niveles funcionando.
3. **Token interno, swap y retiros** en su versión real, con base de datos.
4. **Pase VIP, pool interna y resto de ingresos**, cuando se construya la base de datos real.

## 2. Niveles de cuenta

### 2.1 Reglas decididas

- El nivel inicial es **Grumete (nivel 1)**.
- La progresión es difícil a propósito: subir de nivel requiere puntos y no basta con acumularlos rápido.
- La comisión de retiro **baja gradualmente** al subir de nivel. El nivel inicial paga **70 %** y el máximo paga **5 %**.

### 2.2 Reinicio por temporada

- Los puntos se reinician cada mes (temporada).
- Si el jugador **alcanzó el nivel Teniente** durante la temporada, conserva su nivel al reiniciarse.
- Si **no alcanzó Teniente**, vuelve a **Grumete (nivel 1)** al reiniciarse.

Esta regla busca que el jugador se esfuerce por subir de nivel en cada temporada.

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

### 3.2 Pendiente

- Qué mide el margen 1:3: diferencia de niveles, diferencia de puntos o relación de poder militar. Esto cambia por completo la regla, así que hay que definirlo con precisión.
- Qué significa "jugador nuevo": cuántos días, cuántos puntos o qué nivel.

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
- Fórmula exacta para decidir quién gana la batalla (cómo se compara la fuerza de ataque con la de defensa).
- Si existe un mínimo de puntos para no caer por debajo de cero.

## 5. Pase VIP

### 5.1 Reglas decididas

- Activar el pase VIP **reduce el porcentaje de puntos que se pierde** en una derrota.
- El pase VIP **aumenta los puntos ganados** en una victoria.
- El precio del pase VIP se divide: **50 % para el dueño del proyecto** y **50 % para la reserva**.

### 5.2 Pendiente

- Porcentaje exacto de reducción de pérdida y de aumento de ganancia.
- Precio del pase VIP y duración.
- Si el pase VIP cambia la comisión de retiro o solo afecta los puntos.

## 6. Token interno, swap y comisiones

### 6.1 Reglas decididas

- La comisión del **swap es fija de 3 % para cualquier monto**.
- El **retiro a wallet** tiene una comisión de **70 %** para el nivel inicial (ver sección 2).
- El USDT y el BNB que se pagan a los jugadores salen de una **reserva**.

### 6.2 Pendiente

- Destino de las comisiones del swap y de los retiros (cómo se distribuyen en la pool interna).
- Cómo se distribuye la pool interna del juego.
- Si la comisión de retiro aplica también a las ventas en el swap (hoy solo está definida para retiros a wallet).

## 7. Otros ingresos del proyecto

Para más adelante, al construir la base de datos real:

- Comisión de **5 %** en el mercado P2P.
- Venta de artículos o naves de temporada.

Todos sus valores y reglas están pendientes.

## 8. Inconsistencias con documentos existentes

- `docs/reglas-swap-y-staking.md` indica una comisión de swap de **0,3 %**. Esta decisión nueva fija el swap en **3 %**. El documento de swap debe actualizarse cuando se confirme esta decisión.
- El mismo documento de swap describe un reloj de juego y saldos demo en el navegador. Esto sigue vigente mientras el proyecto no tenga base de datos.

## 9. Decisiones pendientes (resumen)

1. Cantidad y nombres de niveles, y comisión de cada uno.
2. Puntos requeridos para cada nivel y tiempo mínimo por nivel.
3. Significado exacto del margen 1:3 en ataques.
4. Definición de "jugador nuevo".
5. Porcentajes y montos de puntos ganados y perdidos en batalla.
6. Fórmula de resolución de batallas.
7. Efecto exacto del pase VIP y su precio.
8. Destino de las comisiones y distribución de la pool interna.
9. Si la comisión de retiro aplica al swap.
10. Detalles del saldo de respaldo (guarda wallet).
11. Ingresos adicionales: P2P, artículos y naves de temporada.

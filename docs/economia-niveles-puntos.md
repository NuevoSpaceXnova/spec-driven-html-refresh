# Economía, niveles y puntos · XnovaEvolution

Este documento registra las decisiones tomadas hasta hoy sobre la economía y la progresión del juego, y las decisiones que todavía están pendientes. Las secciones marcadas como **Pendiente** no deben implementarse hasta que se cierren.

---

## 0. Estado del proyecto

- El juego corre en modo prueba, sin jugadores reales. Todo (partida, saldos demo) se guarda en el navegador.
- Las funciones que requieren servidor y base de datos se implementan en la fase real, cuando el juego esté listo o al menos al 90 %.
- Los fondos de los jugadores se resguardan en un **saldo de respaldo (guarda wallet)**. El detalle queda pendiente hasta la fase real.

## 1. Orden de implementación

1. **Sistema de niveles de cuenta** (primero).
2. **Sistema de puntos**: cuántos puntos se ganan y pierden, con los valores de cada acción. Se define después de tener los niveles funcionando.
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

- Activar el pase VIP **reduce el porcentaje de puntos que se pierde** en una derrota.
- El pase VIP **aumenta los puntos ganados** en una victoria.
- El precio del pase VIP se divide: **50 % para el dueño del proyecto** y **50 % para la reserva**.

### 5.2 Pendiente

- Porcentaje exacto de reducción de pérdida y de aumento de ganancia.
- Precio del pase VIP y duración.
- Si el pase VIP cambia la comisión de retiro o solo afecta los puntos.

## 6. Token interno, swap y comisiones

### 6.1 Reglas decididas

- La comisión del **swap es variable**, entre un **mínimo de 3 %** y un **máximo de 12 %**. El valor vigente depende de la presión de compras y ventas (ver sección 11).
- El valor vigente de la comisión se muestra al jugador en el resumen antes de confirmar cada operación.
- El **retiro a wallet** tiene una comisión de **70 %** para el nivel inicial (ver sección 2).
- El USDT y el BNB que se pagan a los jugadores salen de una **reserva**.

### 6.2 Aceptación de términos en cada swap

- En el swap habrá **términos y condiciones** que describen la comisión variable, su rango de 3 % a 12 % y cómo se calcula.
- Antes de cada operación, el jugador debe marcar un **check verde ✅** que confirme que acepta esos términos. Sin ese check, el swap no se ejecuta.
- La aceptación se pide **en cada swap**, no una sola vez.

### 6.3 Pendiente

- Texto final de los términos y condiciones. La redacción la revisa el abogado del cliente.
- Destino de las comisiones del swap y de los retiros (cómo se distribuyen en la pool interna).
- Cómo se distribuye la pool interna del juego.
- Si la comisión de retiro aplica también a las ventas en el swap.

## 7. Otros ingresos del proyecto

Para más adelante:

- Comisión de **5 %** en el mercado P2P.
- Venta de artículos o naves de temporada.

Todos sus valores y reglas están pendientes.

## 8. Inconsistencias con documentos existentes

- `docs/reglas-swap-y-staking.md` dice todavía que la comisión del swap es **fija** de 3 %. Debe actualizarse para reflejar el rango de 3 % a 12 % de la sección 6.
- El valor en el código (`FEE` en `public/swap.html`) está en `0.003` y debe cambiarse al mínimo de `0.03`. Además, el swap de la demo necesita el check de aceptación de la sección 6.2 y el mecanismo de comisión variable, que se implementan en la fase real.
- El documento de swap describe un reloj de juego y saldos demo en el navegador. Esto sigue vigente mientras el proyecto esté en modo prueba.

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
11. Ingresos adicionales: P2P 5 %, naves y artículos de temporada.
12. Antigüedad mínima de cuenta: 7 o 15 días (sección 10).
13. Tratamiento de IP compartidas en la restricción de cuentas y ataques (sección 10).
14. Mecanismo de la comisión variable del swap (sección 11).
15. Parámetros de control de precio (sección 11).
16. Texto final de los términos y condiciones del swap (sección 6.3).

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
- **Objetivo:** el proyecto reconoce que no puede eliminar por completo las multicuentas. Las medidas de Telegram, IP y antigüedad buscan **mitigarlas**, haciendo que sea costoso y poco rentable.

### 10.2 Antigüedad mínima (pendiente de confirmar)

Recomendación: **7 días**. Es suficiente para frenar las cuentas creadas solo para retirar, sin castigar demasiado a un jugador nuevo que quiere probar el juego.

Un plazo de **15 días** protege más, pero es probable que desmotive a los jugadores nuevos antes de llegar a la primera progresión. Queda pendiente decidir entre ambos.

Se recomienda que la antigüedad aplique a los **retiros** y al **comercio** (mercado de recursos, P2P y swap). El ataque y la progresión de niveles no deberían depender de ella.

### 10.3 Pendiente

- Proceso de apelación para jugadores que compartan IP sin ser la misma persona (redes móviles, oficinas, universidades).
- Medidas adicionales contra la evasión por cambio de red o VPN, si el cliente lo requiere.

## 11. Control del precio del TOKEN y comisión variable

El precio del TOKEN lo fija el proyecto, no un mercado externo. Por eso el proyecto debe controlar el precio y la reserva en conjunto.

### 11.1 Reglas decididas

- **Comisión variable del swap** entre 3 % (mínimo) y 12 % (máximo), que sube y baja según la presión de compras y ventas. Se muestra al jugador antes de confirmar y requiere su aceptación (sección 6.2).
- **Fórmula de precio con profundidad conocida**: el precio sube al comprar TOKEN y baja al venderlo, con una curva predecible definida por el proyecto.
- **Límites por cuenta y por temporada**: máximo de TOKEN que se puede comprar o vender por día, por temporada o por nivel.
- **Liberación gradual de liquidez**: lo que compra un jugador grande no se puede retirar de inmediato, sino que se libera en tramos.
- **Piso de precio respaldado por la reserva**: el proyecto se compromete a recomprar a un precio mínimo. Esto solo se activa si la reserva tiene USDT y BNB suficientes.

### 11.2 Pendiente

- Mecanismo exacto de la comisión variable: qué mide la presión de ventas, cada cuánto se recalcula y cómo se llega del 3 % al 12 %.
- Parámetros de la curva de precio: cuánto sube o baja por cada unidad comprada o vendida.
- Límites exactos por día, temporada y nivel.
- Duración y tramos de la liberación gradual.
- Monto del piso de precio y cuánta reserva se destina a sostenerlo.
- Regla de reserva mínima: qué pasa cuando la reserva se acerca a cero.

# Flujo del token: mercado, comisiones, pools y retiros · XnovaEvolution

Este documento describe cómo entra, circula y sale el TOKEN en el juego. Complementa a `docs/economia-niveles-puntos.md` (comisiones, control de precio y reglas de niveles) y a `docs/progresion-lenta-y-vip.md` (beneficios VIP).

Las secciones marcadas como **Pendiente** no deben implementarse hasta confirmarse.

---

## 1. Principio general

- **La venta de recursos es entre jugadores (P2P).** El comprador paga en TOKEN y el vendedor recibe TOKEN.
- **El TOKEN entra al juego solo por el swap**, cambiando USDT o BNB.
- **El VIP no afecta la producción de TOKEN.** Afecta metal, cristal, deuterio y la velocidad de mejoras e investigaciones. El precio del TOKEN no depende de la producción de los jugadores.

## 2. Flujo completo

1. **Depósito:** el jugador deposita USDT en el swap.
2. **Compra de TOKEN:** el swap convierte USDT a TOKEN al precio vigente y el saldo interno del jugador se actualiza.
3. **Compra de recursos:** el comprador va al mercado P2P y compra recursos pagando TOKEN.
   - Ejemplo: compra 1.000 de cristal a 100 TOKEN.
   - El comprador **no paga comisión**.
   - El comprador recibe los 1.000 de cristal.
4. **Venta de recursos:** el vendedor recibe 100 TOKEN.
   - El vendedor **paga la comisión al publicar el aviso de venta**: 15 % si es free y 5 % si es VIP.
   - Para publicar, el vendedor debe **tener saldo de TOKEN suficiente para cubrir la comisión**. Esta regla también mitiga las multicuentas.
5. **Retiro:** el jugador cambia su TOKEN a USDT o BNB en el swap y solicita el pago a su wallet (sección 5).

### 2.1 Pendiente

- Si la comisión del 15 % o 5 % se calcula sobre el precio total de la venta o sobre la cantidad de recursos.
- Si la comisión se cobra al publicar o al completarse la venta. La regla actual es al publicar.
- Qué pasa si el vendedor cancela el aviso después de pagar la comisión.

## 3. Pools y distribución

Propuesta de distribución de ingresos:

| Destino | Porcentaje propuesto |
|---|---|
| Dueño del juego | 40 % |
| Pool de jugadores free | 10 % |
| Reserva general del juego | 40 % |

Ingresos que alimentan la reserva general:

- Comisiones del swap (variable de 3 % a 12 %).
- Comisiones del mercado P2P.
- Venta de artículos y naves de temporada.

### 3.1 Observaciones que deben resolverse

- **La suma es 90 %, no 100 %.** Falta un 10 % que debe asignarse a algún destino.
- **Origen de la pool.** Hay que definir de qué ingresos sale cada parte. En particular, la pool de jugadores free debe tener una fuente clara, porque ya existe un reparto de los ingresos VIP (50 % al dueño y 50 % a la reserva, definido en `docs/economia-niveles-puntos.md`, sección 5). Hay que confirmar si este reparto VIP sigue vigente o si pasa a la nueva distribución.
- **Pool de jugadores free:** definir cómo se reparte (misiones, ranking, sorteos u otro criterio).

### 3.2 Pendiente

- Confirmar la suma de 100 % y el destino del porcentaje restante.
- Origen de cada pool y criterio de reparto para la pool free.
- Relación entre la pool nueva y el reparto VIP vigente.

## 4. Umbral y valor del retiro

- **Umbral mínimo de retiro: 10 USD.** Como el TOKEN tiene precio variable, el umbral debe calcularse con el precio vigente en el momento de solicitar el retiro.
- Además del umbral, el retiro requiere cumplir las condiciones de antigüedad y verificación por Telegram (`docs/economia-niveles-puntos.md`, sección 10).
- Se aplica la comisión de retiro según el nivel de cuenta (70 % al inicio, bajando hasta 5 %).

### 4.1 Pendiente

- Cómo se calcula el equivalente en USD del TOKEN para el umbral.
- Si la comisión de retiro por nivel se aplica sobre el monto en TOKEN o sobre el monto en USDT o BNB.

## 5. Pagos y retiros

### 5.1 Modelo operativo

- **Todos los pagos son manuales.** El administrador (el cliente) los revisa y aprueba desde un panel administrativo protegido con contraseña.
- **Auditoría manual.** Cada pago se verifica antes de enviarse.
- **Ventana horaria de pago.** Los pagos se procesan solo dentro de un horario definido. Hay que confirmar el horario: el texto dice "de 9am a 6am", que son 21 horas y no es una ventana típica de operación.

### 5.2 Mensaje al jugador: punto que debe revisarse

El planteamiento actual dice que el jugador **no debe saber** que el pago es manual y que debe ver "pendiente de confirmaciones de red", con una nota de "1 hora a 48 horas según congestionamiento".

**Recomendación: no usar ese mensaje tal como está.** Razones:

- Si el pago es manual, decir que depende de la red induce al jugador a creer que el retraso es técnico y automático, lo que puede generar desconfianza cuando se descubra.
- Un jugador que no entiende el proceso y ve un plazo de hasta 48 horas sin explicación es más propenso a escribir al soporte, a dejar reseñas negativas o a abandonar el juego.
- Un mensaje honesto y tranquilo evita esas consecuencias y se puede escribir sin revelar detalles internos.

Propuesta de texto alternativo para la decisión:

> "Tu solicitud de retiro fue recibida y está en revisión. Te notificaremos cuando se procese. Los pagos se confirman en horarios de atención."

La decisión final sobre el texto y el nivel de detalle es del cliente y debe revisarse con su abogado.

### 5.3 Pendiente

- Horario exacto de atención de pagos.
- Texto final del mensaje al jugador (sección 5.2).
- Plazo estimado que se muestra al jugador, si se muestra alguno.
- Cómo se registra la trazabilidad de cada pago en el panel administrativo.

## 6. Panel administrativo

- Acceso protegido con contraseña, solo para el administrador.
- Funciones mínimas: ver solicitudes de retiro, aprobar o rechazar, ver saldo de la reserva y registrar el pago.
- Este panel requiere base de datos y servidor. Se implementa en la fase real del proyecto (`docs/economia-niveles-puntos.md`, sección 1).

## 7. Pendiente (resumen)

1. Confirmar la distribución de ingresos al 100 % y el destino del 10 % restante (sección 3.1).
2. Origen de cada pool y criterio de reparto de la pool free.
3. Relación entre la nueva distribución y el reparto VIP 50/50 vigente.
4. Base de la comisión P2P: precio total o cantidad, y momento de cobro.
5. Cálculo del equivalente en USD del TOKEN para el umbral de 10 USD.
6. Base de la comisión de retiro por nivel: TOKEN o USDT/BNB.
7. Horario exacto de pagos (sección 5.1).
8. Texto final del mensaje al jugador en espera de pago (sección 5.2).

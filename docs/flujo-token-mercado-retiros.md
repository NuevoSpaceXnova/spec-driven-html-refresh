# Flujo del token: mercado, comisiones, pools y retiros · XnovaEvolución

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
- Qué pasa si el vendedor cancela el aviso después de pagar la comisión.

## 3. Distribución de ingresos

### 3.1 Distribución del pase VIP (decidida)

| Destino | Porcentaje |
|---|---|
| Dueño del juego | 40 % |
| Reserva de los jugadores | 40 % |
| Pool de jugadores free | 10 % |
| Respaldo | 10 % |

- La **pool de jugadores free** se reparte en **misiones limitadas por día**.
- El **respaldo (10 %) no se asigna**. Queda reservado para cubrir eventos o premios imprevistos.

### 3.2 Distribución de otros ingresos (pendiente)

Ingresos que alimentan la reserva general:

- Comisiones del swap (variable de 3 % a 12 %).
- Comisiones del mercado P2P.
- Venta de artículos y naves de temporada.

Estos ingresos se distribuyen según la misma lógica del VIP o según otra regla. **Pendiente:** confirmar el reparto de estos ingresos.

### 3.3 Pendiente

- Límite diario de las misiones de la pool free (cantidad de TOKEN por día y por jugador).
- Regla de uso del respaldo: quién lo autoriza y en qué casos.
- Reparto de comisiones del swap, mercado y temporada entre dueño, reserva y respaldo.

## 4. Umbral y valor del retiro

- **Umbral mínimo de retiro: 10 USD.** Como el TOKEN tiene precio variable, el umbral debe calcularse con el precio vigente en el momento de solicitar el retiro.
- Además del umbral, el retiro requiere cumplir las condiciones de antigüedad y verificación por Telegram (`docs/economia-niveles-puntos.md`, sección 10).
- Se aplica la comisión de retiro según el nivel de cuenta (70 % al inicio, bajando hasta 5 %).

### 4.1 Pendiente

- Cómo se calcula el equivalente en USD del TOKEN para el umbral.
- Si la comisión de retiro por nivel se aplica sobre el monto en TOKEN o sobre el monto en USDT o BNB.

## 5. Pagos y retiros

### 5.1 Modelo operativo (decidido)

- **Todos los pagos son manuales.** El administrador (el cliente) los revisa y aprueba desde un panel administrativo protegido con contraseña.
- **Auditoría manual.** Cada pago se verifica antes de enviarse.
- **Horario de pagos: de 9 am a 6 pm.**

### 5.2 Comunicación con el jugador (decisión pendiente)

**Decisión tomada:** no se mostrará al jugador un mensaje que atribuya la demora a la red o a la congestión cuando el pago depende de una aprobación manual. Ese mensaje sería engañoso sobre su propio dinero y, si se descubre, generaría más desconfianza y más presión en soporte que la que quiere evitarse.

Para reducir la presión en soporte sin engañar, se propone:

- **Estado visible del retiro:** "Recibido", "En revisión", "Aprobado", "Enviado", con la hora de cada cambio.
- **Ventana de procesamiento clara:** "Los retiros se procesan de 9 am a 6 pm. Tu solicitud recibida después de las 6 pm se procesa al día siguiente."
- **Explicación general en preguntas frecuentes:** "Revisamos cada retiro manualmente para proteger tu cuenta y tu saldo." Esto es verdadero y no revela procesos internos.
- **Respuesta automática de soporte** que repita la ventana y el estado del retiro, para que el jugador no tenga que escribir para saberlo.
- **Plazo estimado solo si es real:** mostrar un plazo únicamente cuando el equipo pueda cumplirlo.

Con esto, el jugador sabe cuándo esperar y qué significa cada estado, y el equipo de soporte recibe menos consultas.

### 5.3 Pendiente

- Texto final de los estados y de la explicación en preguntas frecuentes.
- Tratamiento de solicitudes fuera de horario.
- Cómo se registra la trazabilidad de cada pago en el panel administrativo.
- Revisión legal de la comunicación con el jugador, a cargo del abogado del cliente.

## 6. Panel administrativo

- Acceso protegido con contraseña, solo para el administrador.
- Funciones mínimas: ver solicitudes de retiro, aprobar o rechazar, ver saldos de la reserva y del respaldo, y registrar cada pago.
- Este panel requiere base de datos y servidor. Se implementa en la fase real del proyecto.

## 7. Pendiente (resumen)

1. Base de la comisión P2P: precio total o cantidad, y momento de cobro (sección 2.1).
2. Límite diario de las misiones de la pool free (sección 3.3).
3. Regla de uso del respaldo de 10 % (sección 3.3).
4. Reparto de comisiones de swap, mercado y temporada (sección 3.2).
5. Cálculo del equivalente en USD del TOKEN para el umbral de 10 USD (sección 4.1).
6. Base de la comisión de retiro por nivel: TOKEN o USDT/BNB (sección 4.1).
7. Textos finales de estados y preguntas frecuentes del retiro (sección 5.3).

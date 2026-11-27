# Flujo del token: mercado, comisiones, pools y retiros · XnovaEvolution

Este documento describe cómo entra, circula y sale el TOKEN en el juego. Complementa a `docs/economia-niveles-puntos.md` (comisiones, control de precio y reglas de niveles) y a `docs/progresion-lenta-y-vip.md` (beneficios VIP).

Las secciones marcadas como **Pendiente** no deben implementarse hasta confirmarse. Las secciones marcadas como **Propuesta** esperan aprobación.

---

## 1. Principio general

- **La venta de recursos es entre jugadores (P2P).** El comprador paga en TOKEN y el vendedor recibe TOKEN.
- **El TOKEN entra al juego solo por el swap**, cambiando USDT o BNB.
- **Dentro del juego solo se comercia y se gana TOKEN.** USDT y BNB solo sirven para depositar y para retirar.
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

### 2.1 Aplicado

- La comisión se calcula sobre el precio total de la venta y se cobra en TOKEN al publicar el aviso.
- **Saldo TOKEN de la cuenta (modo prueba):** hay un solo saldo de TOKEN por cuenta, no por planeta. El swap y el juego leen y escriben ese mismo saldo. Si el jugador cambia USDT por TOKEN en el swap, el juego muestra el nuevo saldo al momento. Si gasta TOKEN en el juego, el swap lo muestra al momento. USDT queda solo en el swap (libro demo). La sincronización funciona dentro del mismo navegador; entre dispositivos llegará con la base de datos (fase 5).

### 2.1b Precio por unidad (aplicado en modo prueba)

- El vendedor escribe el valor por unidad en TOKEN y el juego calcula el total (cantidad × valor por unidad).
- Mínimo por unidad: el valor de la última oferta publicada de ese recurso. Si no hay ninguna, 0,10 metal, 0,20 cristal y 0,50 deuterio. Las ofertas vendidas o canceladas cuentan.
- Sin máximo.

### 2.2 Pendiente

- Si la venta de naves también paga la comisión de publicación (hoy solo se cobra en recursos).
- Qué pasa si el vendedor cancela el aviso después de pagar la comisión.

## 3. Distribución de ingresos

### 3.1 Distribución del pase VIP (decidida)

| Destino | Porcentaje |
|---|---|
| Dueño del juego (saldo de retiro de la administración) | 40 % |
| Reserva de los jugadores | 40 % |
| Pool de jugadores free | 10 % |
| Respaldo | 10 % |

- La **pool de jugadores free** se reparte en **misiones limitadas por día**.
- El **respaldo (10 %) no se asigna**. Queda reservado para cubrir eventos o premios imprevistos.

### 3.2 Distribución de comisiones (decidida)

| Ingreso | Reserva de jugadores | Dueño (saldo de retiro) |
|---|---|---|
| Comisión del swap (3 % a 12 %) | 100 % | — |
| Comisión P2P free (15 %) | 7,5 % | 7,5 % |
| Comisión P2P VIP (5 %) | 2,5 % | 2,5 % |

- Toda la parte del dueño se acumula en **TOKEN** en un **saldo de retiro de la administración**. Desde ahí el dueño decide cuánto va a staking externo y cuánto retira.
- Solo son retirables por el dueño la mitad de las comisiones del mercado y el 40 % del VIP.

### 3.3 Pendiente

- Destino de la venta de artículos y naves de temporada.
- Límite diario de las misiones de la pool free (cantidad de TOKEN por día y por jugador).
- Regla de uso del respaldo de 10 %: quién lo autoriza y en qué casos.

## 4. Umbral y valor del retiro

- **Umbral mínimo de retiro: 10 USD.** Como el TOKEN tiene precio variable, el umbral debe calcularse con el precio vigente en el momento de solicitar el retiro.
- Además del umbral, el retiro requiere cumplir las condiciones de antigüedad y verificación por Telegram (`docs/economia-niveles-puntos.md`, sección 10).
- Se aplica la comisión de retiro según el nivel de cuenta (70 % al inicio, bajando hasta 5 %).

### 4.1 Pendiente

- Cómo se calcula el equivalente en USD del TOKEN para el umbral.
- Si la comisión de retiro por nivel se aplica sobre el monto en TOKEN o sobre el monto en USDT o BNB.

## 5. Pagos y retiros

### 5.1 Modelo operativo (decidido)

- **Todos los pagos son manuales.** El administrador revisa y aprueba cada pago desde un panel administrativo protegido con contraseña.
- **Auditoría manual.** Cada pago se verifica antes de enviarse.
- **Horario de pagos: de 9 am a 6 pm.**

### 5.2 Estados del retiro (decidido)

El jugador ve solo dos estados:

- **Processing** (rojo): la solicitud fue recibida y todavía no se ha pagado.
- **Processed** (verde): el pago fue enviado.

### 5.3 Propuesta pendiente de aprobación: comunicación adicional

Estas ideas son propuestas. No están aprobadas:

- Mostrar la ventana de procesamiento: "Los retiros se procesan de 9 am a 6 pm."
- Respuesta automática de soporte que repita la ventana y el estado del retiro.
- Texto en preguntas frecuentes que explique de forma general que cada retiro se revisa antes de pagarse.

**Nota:** antes se propuso un mensaje que atribuía la demora a la red. No se recomienda, porque sería engañoso sobre el proceso de pago y, si el jugador lo descubre, la desconfianza sería mayor que la presión que se quiere evitar.

### 5.4 Pendiente

- Tratamiento de solicitudes recibidas fuera de horario.
- Cómo se registra la trazabilidad de cada pago en el panel administrativo.
- Aprobación de las propuestas de la sección 5.3.

## 6. Panel administrativo

- Acceso protegido con contraseña, solo para el administrador.
- **Estado (parte 1 aplicada en modo prueba):** la cuenta de administración y la cuenta de ayudante ven el botón Panel en el juego. La ayudante la asigna la administración por la ruta de roles. Aplicado también: estructura del panel con seis secciones (Retiros, Trazabilidad de pagos, Saldos, Precio del TOKEN, Temporadas, Herramientas de prueba). Las secciones están vacías y sin lógica todavía; la lógica se configura en la siguiente parte. Aplicado también: permisos por sección para ayudantes; sin permisos al inicio; la administración los da o los quita desde la sección Ayudantes. Aplicado también: contraseña propia del panel, guardada como secreto de Cloudflare (`PANEL_PASSWORD`). Se pide al entrar y vuelve a pedirse al pulsar Salir del panel. Botón Cerrar sesión. Aplicado también: el inicio de sesión del juego usa correo y contraseña del servidor (la partida sigue guardada en el navegador por correo). Se quitó el acceso rápido de prueba. Pendiente: horario de retiros fuera de la ventana de 9 am a 6 pm.
- Funciones mínimas: ver solicitudes de retiro, aprobar o rechazar, ver saldos de la reserva, del respaldo y del saldo de retiro de la administración, y registrar cada pago.
- Este panel requiere base de datos y servidor. Se implementa en la fase real del proyecto.

## 7. Pendiente (resumen)

1. Base de la comisión P2P: precio total o cantidad, y momento de cobro (sección 2.1).
2. Destino de la venta de artículos y naves de temporada (sección 3.3).
3. Límite diario de las misiones de la pool free (sección 3.3).
4. Regla de uso del respaldo de 10 % (sección 3.3).
5. Cálculo del equivalente en USD del TOKEN para el umbral de 10 USD (sección 4.1).
6. Base de la comisión de retiro por nivel: TOKEN o USDT/BNB (sección 4.1).
7. Solicitudes fuera de horario y trazabilidad de pagos (sección 5.4).
8. Aprobación de las propuestas de comunicación (sección 5.3).

## 6. Materia oscura y cajas (aprobado por el cliente, modo prueba)

### 6.1 Aplicado en el juego

- Saldo de **materia oscura** junto a metal (primera caja de la barra superior).
- Dentro de **Mercado**, pestaña **Materia Oscura** con seis cajas, cada una con su imagen y nombre: Frasco de Materia Oscura (1 USD), Frasco Evolucionado (5 USD), Cilindro de Contención (10 USD), Tanque Blindado (25 USD), Núcleo de Contención (50 USD) y Cofre de Materia Oscura (100 USD). Se compran a la administración con TOKEN (precio en USD convertido a TOKEN). No se venden ni se compran entre jugadores.

| Caja | Materia oscura | Por dólar |
|---|---|---|
| 1 USD | 10 | 10 |
| 5 USD | 55 | 11 |
| 10 USD | 120 | 12 |
| 25 USD | 325 | 13 |
| 50 USD | 700 | 14 |
| 100 USD | 1.500 | 15 |

- **Subida de nivel:** desde el nivel 6, cada subida cuesta 10 más que la anterior (5→6 = 10, 6→7 = 20, 7→8 = 30...). Se aplica a edificios de recursos, instalaciones y lunas, e investigaciones.
- La materia oscura se **gasta** al subir o al encolar la construcción. Si se cancela una construcción, se devuelve.
- Cada tarjeta muestra una fila "Materia oscura" con el saldo y lo que pide la siguiente subida.

### 6.2 Naves de ataque (aprobado, aplicado en modo prueba)

- Se desbloquea **una sola vez por tipo de nave** con materia oscura. Si una nave se destruye en combate, no se paga de nuevo.
- Nave de Batalla: 5. Acorazado: 12. Bombardero: 7. Destructor: 30. Estrella de la Muerte: 150.

### 6.2b Defensas planetarias (aprobado, aplicado en modo prueba)

- Solo las defensas más poderosas piden materia oscura, una sola vez por tipo: Cañón Gauss 10, Cañón de Plasma 40, Cúpula Grande 25. Las defensas básicas no piden materia oscura.

### 6.3 Decidido por el cliente (pendiente de aplicar)

- El TOKEN de cada venta de caja se reparte **50 % al dueño** y **50 % a la reserva**.

### 6.4 Pendiente

- Defensas planetarias: cuáles y con qué costo (propuesta: ×3). Hoy no existen en el juego como ítems de nivel.
- Desde qué nivel exacto se pide materia oscura en naves y defensas (hoy se pide solo por desbloqueo único).

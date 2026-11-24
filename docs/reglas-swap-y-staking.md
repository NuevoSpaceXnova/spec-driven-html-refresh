# Reglas del Swap y del Staking · XnovaEvolution

Este documento describe cómo funcionan el swap y el staking de la página `public/swap.html`.
Hoy todo corre en **modo demo** con datos ficticios. Cuando se configure la economía real,
estas reglas son el punto de partida. Los valores que cambian están marcados en la sección 7.

---

## 1. Activos

| Activo | Descripción | Red |
|---|---|---|
| TOKEN | Token del juego. Se usa en swap y staking. | BNB Smart Chain (pendiente de listar) |
| USDT, USDC, BNB, BTCB, ETH, CAKE, XRP, ADA, DOGE, LINK, DOT, LTC, TRX, UNI, MATIC | Criptos de referencia para el intercambio | BNB Smart Chain |

- Los **recursos del juego** (metal, cristal, deuterio) **no** entran en el swap. Solo se venden en el mercado P2P interno.
- **SOL** no se incluye porque no corre en BNB Chain.
- Las direcciones de contrato están en blanco hasta verificarlas en una fuente oficial (BscScan o equivalente).

## 2. Precios

- Cada activo tiene un precio de referencia en USDT.
- En la demo, los precios se generan en el navegador con datos ficticios.
- En la economía real, los precios deben venir de una fuente de precios definida (API o contrato oráculo). Esa fuente aún no está elegida.
- Cualquier intercambio entre dos activos usa la relación de sus precios en USDT:
  `salida = cantidad × precio(origen) / precio(destino) × (1 − comisión)`

## 3. Swap

- **Comisión:** 0,3 % sobre el monto recibido.
- **Cantidades de TOKEN:** siempre enteras. Cualquier fracción se redondea hacia abajo.
- **Redondeo de la salida:** TOKEN como salida se redondea hacia abajo. Las criptos conservan hasta 6 decimales.
- **Mínimo:** la salida debe ser mayor que cero. Si no, la operación se rechaza.
- **Confirmación:** antes de ejecutar, la página muestra un resumen (pagas, recibes, mínimo, comisión e impacto) y el jugador confirma.
- **Tolerancia de precio:** el jugador elige 0,5 %, 1 % o 2 %. Si al confirmar la salida queda por debajo del mínimo calculado con esa tolerancia, la operación no se ejecuta.
- **Impacto estimado:** `impacto = monto × precio(origen) / liquidez ficticia de 250.000 USDT`. Solo es un aviso (más de 1 % muestra advertencia); la demo no mueve el precio.
- **Saldos:**
  - TOKEN: sale de la partida guardada del juego.
  - Criptos: en la demo, saldos ficticios (500 USDT al inicio). En la economía real, saldos de la billetera conectada.
- **Historial:** cada swap queda registrado. Si participa TOKEN, también aparece en las operaciones del juego.
- **Billeteras:** se detectan MetaMask y otras extensiones EVM (EIP-6963), Ronin y Solflare/Phantom. Las conexiones EVM cambian la red a BNB Chain (chainId 56). Ronin usa su propia red. Solana no es BNB Chain.
- **Transacciones on-chain:** pendientes. Hoy el swap no mueve tokens reales.

## 4. Staking

### 4.1 Pools
- Cada pool es un par **TOKEN / X**, donde X es una cripto de la lista.
- La tasa anual (APY) depende del pool.
- Al bloquear TOKEN, el pool queda fijo para esa operación. Si cambia la tasa después, la operación conserva la tasa original.

### 4.2 Tasas (demo)

| Pool | APY |
|---|---|
| TOKEN / USDT | 12 % |
| TOKEN / USDC | 12 % |
| TOKEN / BNB | 9 % |
| TOKEN / BTCB | 6 % |
| TOKEN / ETH | 7 % |
| TOKEN / CAKE | 10 % |
| Resto (XRP, ADA, DOGE, LINK, DOT, LTC, TRX, UNI, MATIC) | 8 % |

### 4.3 Bloqueo
- El bloqueo es de **15 días**.
- Durante el bloqueo el TOKEN no se puede usar en swap.
- El retiro normal y el re-bloqueo se habilitan al completar 15 días.
- **Retiro anticipado:** antes de los 15 días se puede retirar el capital menos una penalización del **5 %**. Se pierde el interés. La penalización pasa a la reserva.

### 4.4 Cálculo del interés
- Interés **simple**, calculado por **días completos**:
  `interés = monto × APY × días completos / 365`
- Se redondea hacia abajo a TOKEN entero.
- El interés solo se paga al retirar. No hay pagos parciales durante el bloqueo.

### 4.5 Retiro
- Se devuelve el **capital** y el **interés**.
- El capital siempre sale de la operación.
- El interés sale de la **reserva de intereses**.
- Si la reserva no alcanza, se paga lo disponible y el juego informa el monto pagado.
- **Re-bloquear con interés:** al cumplir los 15 días, el capital más el interés vuelven a bloquearse otros 15 días en el mismo pool y con el mismo APY. El interés sale de la reserva igual que en el retiro.

### 4.6 Reserva de intereses
- **Demo:** reserva ficticia de 100.000 TOKEN.
- **Economía real:** la reserva debe tener una fuente definida (reserva fija, emisión controlada o ingresos del juego). Esa decisión no está tomada.
- Cada retiro descuenta de la reserva.

### 4.7 Tiempo
- Los días se miden con el **reloj del juego** (campo `simSec` de la partida), no con el reloj real.
- En la demo, el botón “+1 día” adelanta el inicio del bloqueo para probar. **Ese botón no existe en producción.**

### 4.8 Registro
- Cada bloqueo y retiro queda en el historial de transacciones del juego.
- El staking vive en el libro de la página de swap. El juego solo ve el cambio de saldo de TOKEN.

## 5. Datos de la demo

| Dato | Valor demo | Dónde está |
|---|---|---|
| Precios de criptos | Ficticios, generados en el navegador | `swap.html`, función `genPath` |
| Saldos de criptos | 500 USDT iniciales | Libro demo en el navegador |
| Reserva de intereses | 100.000 TOKEN | `STAKE.reserveStart` |
| Tiempo | Reloj del juego | `simSec` en la partida |

## 6. Limitaciones conocidas de la demo
- Los almacenes del juego no limitan el swap ni el staking.
- Los saldos demo de criptos se guardan por navegador, no por cuenta del servidor.
- No hay contratos inteligentes ni transacciones reales.

## 7. Qué cambiar al pasar a economía real

1. **Contrato del token en BNB Chain:** completar `TOKEN.contract` y `CRYPTOS[].contract`.
2. **Precios reales:** reemplazar `genPath` por una fuente de precios.
3. **Saldos reales:** leer balances de la billetera conectada.
4. **Ejecución on-chain:** definir el router de intercambio y el flujo de aprobación de tokens.
5. **Staking real:** contrato de staking con los mismos parámetros de la sección 4.
6. **Reserva de intereses:** definir de dónde sale el dinero y cómo se controla su límite.
7. **Revisión de seguridad:** auditoría de contratos antes de activar dinero real.
8. **Parámetros:** `FEE`, `LIQ_USD`, `EARLY_PENALTY`, `STAKE.lockDays`, `STAKE.apy` y `STAKE.reserveStart` se cambian en `public/swap.html`.

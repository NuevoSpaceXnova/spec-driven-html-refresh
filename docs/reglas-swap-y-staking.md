# Reglas del Swap · XnovaEvolution

Este documento describe cómo funciona el swap de TOKEN por USDT y BNB en `public/swap.html`.

**Cambio de diseño:** el staking interno del juego fue eliminado (ver `docs/economia-niveles-puntos.md`, sección 8). Las reglas de pools, bloqueos, penalización por retiro anticipado e interés que existían en versiones anteriores de este documento ya no aplican. El código demo del staking fue quitado de `public/swap.html` en la fase 0 (commit `d64ae00`).

Hoy todo corre en **modo demo** con datos ficticios. Cuando se configure la economía real, estas reglas son el punto de partida. Los valores que cambian están marcados en la sección 6.

---

## 1. Activos

| Activo | Descripción | Red |
|---|---|---|
| TOKEN | Token interno del juego. Se usa en el mercado, en el swap y en el pase VIP. No tiene contrato. | No aplica (interno) |
| USDT, USDC, BNB, BTCB, ETH, CAKE, XRP, ADA, DOGE, LINK, DOT, LTC, TRX, UNI, MATIC | Criptos de referencia para el intercambio | BNB Smart Chain |

- Los **recursos del juego** (metal, cristal, deuterio) **no** entran en el swap. Solo se venden en el mercado P2P interno, pagando TOKEN.
- **SOL** no se incluye porque no corre en BNB Chain.
- Las direcciones de contrato están en blanco hasta verificarlas en una fuente oficial (BscScan o equivalente).

## 2. Precios

- Cada activo tiene un precio de referencia en USDT.
- En la demo, los precios se generan en el navegador con datos ficticios.
- **Precio inicial del TOKEN: 0,000152 USD.** El precio se mueve a mano por la administración (`docs/economia-niveles-puntos.md`, sección 11).
- En la economía real, los precios de las demás criptos deben venir de una fuente de precios definida (API o contrato oráculo). Esa fuente aún no está elegida.
- Cualquier intercambio entre dos activos usa la relación de sus precios en USDT:
  `salida = cantidad × precio(origen) / precio(destino) × (1 − comisión)`

## 3. Swap

- **Comisión:** variable, entre **3 % (mínimo)** y **12 % (máximo)**. El valor vigente depende de la presión de compras y ventas. Se muestra al jugador antes de confirmar.
- **Destino de la comisión:** 100 % a la reserva de los jugadores.
- **Términos y condiciones:** antes de cada swap, el jugador debe marcar un **check verde ✅** que acepta los términos, que describen la comisión variable y su rango. Sin ese check, el swap no se ejecuta. Se pide en cada operación.
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

## 4. Staking: eliminado

- Se eliminan los pools TOKEN/X, el bloqueo de 15 días, el interés simple, la penalización por retiro anticipado y la reserva de intereses.
- El código demo del staking fue quitado de `public/swap.html` en la fase 0.
- La decisión y su motivo están en `docs/economia-niveles-puntos.md`, sección 8.

## 5. Datos de la demo

| Dato | Valor actual en la demo | Valor decidido | Dónde está |
|---|---|---|---|
| Precio inicial del TOKEN | **0,000152 USD** (aplicado) | **0,000152 USD** | `swap.html`, constante `TOKEN` (`start`) |
| Comisión del swap | **3 %** (aplicado, mínimo) | **3 % a 12 %** (mínimo 3 %) | `swap.html`, constante `FEE` (`0.03`) |
| Precios de criptos | Ficticios, generados en el navegador | — | `swap.html`, función `genPath` |
| Saldos de criptos | 500 USDT iniciales | — | Libro demo en el navegador |
| Check de términos | **Aplicado**, con texto provisional pendiente del abogado | **Obligatorio en cada swap** | `swap.html`, diálogo de confirmación (`termsChk`) |

## 6. Limitaciones conocidas de la demo

- Los almacenes del juego no limitan el swap.
- Los saldos demo de criptos se guardan por navegador, no por cuenta del servidor.
- No hay contratos inteligentes ni transacciones reales.

## 7. Qué cambiar al pasar a economía real

1. **Contrato del TOKEN:** no aplica. El TOKEN es interno del juego y no tiene contrato. Las direcciones de las criptos de referencia (`CRYPTOS[].contract`) siguen pendientes.
2. **Precios reales:** reemplazar `genPath` por una fuente de precios para las criptos. El precio del TOKEN lo mueve la administración.
3. **Saldos reales:** leer balances de la billetera conectada.
4. **Ejecución on-chain:** definir el router de intercambio y el flujo de aprobación de tokens.
5. **Comisión variable:** implementar el mecanismo de presión de compras y ventas entre 3 % y 12 % (`docs/economia-niveles-puntos.md`, sección 11.2).
6. **Revisión de seguridad:** auditoría del servidor de saldos y de los retiros antes de activar dinero real.
7. **Parámetros:** `FEE`, `LIQ_USD` y `TOKEN.start` se cambian en `public/swap.html`.

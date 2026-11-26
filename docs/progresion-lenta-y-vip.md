# Progresión lenta y beneficios VIP · XnovaEvolution

Este documento registra la decisión de diseño de que el juego se juegue con progresión lenta y segura, y los beneficios del pase VIP que motivan la inversión. Los valores numéricos están marcados como **Pendiente**.

Complementa a `docs/economia-niveles-puntos.md` (niveles, comisiones, puntos y control de precio), `docs/fases-jugabilidad.md` (fases y tiempos) y `docs/flujo-token-mercado-retiros.md` (flujo del token, pools y retiros).

---

## 1. Objetivo

El juego debe premiar jugar, no exprimir el sistema. Por eso la progresión es lenta y segura en todos los aspectos:

- Subir de nivel de cuenta.
- Subir de nivel edificios, minas e instalaciones.
- Desbloquear investigaciones.
- Desbloquear naves.
- Desbloquear defensas.

Cada desbloqueo requiere más tiempo, más recursos y más requisitos previos que la versión actual del juego.

## 2. Principios de la progresión lenta

1. **Desbloqueos difíciles.** Investigaciones, naves y defensas tienen requisitos encadenados más exigentes (laboratorio, astillero y tecnologías previas).
2. **Subida de nivel lenta.** Los edificios y minas cuestan más y tardan más en cada nivel, con los tiempos reales de `docs/fases-jugabilidad.md`.
3. **Nivel de cuenta exigente.** Subir de rango requiere más puntos y tiempo mínimo en cada nivel (ver `docs/economia-niveles-puntos.md`, sección 2).
4. **Jugar debe seguir siendo viable sin pagar.** La progresión lenta no debe volver el juego imposible para jugadores gratuitos. Los jugadores free deben poder avanzar a Teniente con dedicación constante.

### 2.1 Pendiente

- Factores de crecimiento de costo y tiempo por edificio, investigación, nave y defensa.
- Requisitos exactos de cada desbloqueo por fase.
- Duración esperada de cada fase para un jugador gratuito, para validar que sea lenta pero alcanzable.

## 3. Beneficios del pase VIP

El pase VIP da ventajas de velocidad y de mercado. Lo que se decide aquí:

| Beneficio | Free | VIP |
|---|---|---|
| Velocidad de producción de recursos | Base | **+50 %** |
| Velocidad de mejora (construcciones e investigaciones) | Base | **+50 %** |
| Comisión en el mercado P2P de recursos | **15 %** | **5 %** |
| Vender naves en el mercado P2P | No | **Sí (solo VIP)** |
| Puntos perdidos en derrota | Base | Reducidos (ver economía, sección 5) |
| Puntos ganados en victoria | Base | Aumentados (ver economía, sección 5) |

### 3.1 Notas sobre cada beneficio

- **Producción +50 %:** aumenta los recursos que produce cada mina. No cambia el costo de construir ni los requisitos.
- **Mejora +50 %:** reduce el tiempo de construcción e investigación. No reduce el costo en recursos.
- **Comisión P2P:** solo aplica al mercado de recursos. **No aplica al swap**, cuya comisión es variable de 3 % a 12 % (economía, sección 6).
- **Naves en P2P:** solo cuentas VIP pueden publicar naves a la venta en el mercado.
- **Destino de la comisión P2P:** la comisión se reparte entre la reserva de jugadores y el dueño según `docs/economia-niveles-puntos.md`, sección 7.

### 3.2 Estado de aplicación (modo prueba)

- Aplicado: producción +50 %, construcción e investigación +50 %, venta de naves en P2P solo para VIP, insignia VIP/FREE y compra del pase.
- Pendiente: la comisión P2P VIP del 5 % (base y momento del cobro, `docs/economia-niveles-puntos.md`, sección 7.2).

### 3.3 Pendiente

- Precio del pase VIP y duración: **decidido** en `docs/economia-niveles-puntos.md`, sección 5. Queda pendiente el porcentaje exacto de ventaja en puntos.
- Si el beneficio de velocidad aplica también a la cola de naves.
- Cómo se comparan los beneficios VIP con la regla de puntos de la economía (sección 4).

## 4. Riesgos que hay que vigilar

Estas decisiones tienen efectos que deben revisarse antes de implementarse:

1. **Origen del TOKEN de los compradores.** Ya está definido que el TOKEN entra al juego solo por el swap (`docs/flujo-token-mercado-retiros.md`, sección 1). Queda pendiente vigilar que la mayor producción del VIP no presione el precio ni la reserva, porque la producción aumenta la oferta de recursos que se venden por TOKEN.
2. **Riesgo de sensación de pagar para ganar.** Si el VIP ofrece más producción, más velocidad, menor comisión y exclusividad en naves, los jugadores free pueden sentir que no compiten. Para evitarlo, el camino gratuito necesita recompensas claras, como misiones diarias y expediciones, y la diferencia debe ser de velocidad, no de posibilidad.
3. **Efecto combinado con el control de precio.** El control de precio (`docs/economia-niveles-puntos.md`, sección 11) debe considerar que los VIP pueden vender más rápido que los free.

## 5. Pendiente (resumen)

1. Porcentaje exacto de ventaja VIP en puntos (sección 3.2).
2. Factores de crecimiento y requisitos de cada desbloqueo (sección 2.1).
3. Duración de fases para un jugador gratuito.
4. Alcance del beneficio de velocidad: producción, mejora y cola de naves (sección 3.2).
5. Compensación para jugadores free (riesgo 2).
6. Vigilancia de la presión de oferta de la producción VIP sobre el precio (riesgo 1).

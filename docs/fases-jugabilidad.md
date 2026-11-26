# Fases y equilibrio de jugabilidad · XnovaEvolution

Este documento define las fases del juego y los principios para que la progresión sea más exigente. Los valores numéricos (costos, tiempos, requisitos) están marcados como **Pendiente** hasta revisar los datos actuales de `public/forja-astral.html`.

---

## 1. Diagnóstico

Hoy la progresión es demasiado rápida: subir de nivel de minas, investigar y desbloquear naves se consigue en poco tiempo. Eso tiene dos problemas:

- El jugador llega a las mecánicas de competencia (PvP, mercado, retiros) sin haber construido una base sólida.
- Como el TOKEN se gana vendiendo recursos, una progresión rápida permite acumular producción y vender antes de que el juego haya puesto obstáculos.

Referencia: falcoxnova.com y su blog no publican niveles, costos ni tiempos. No sirven como base numérica.

## 2. Fases del juego

### Fase 1 · Inicio (Grumete)
- Objetivo: aprender la producción de recursos y el mercado básico.
- Edificios iniciales de costo bajo, con una construcción activa a la vez.
- Sin PvP y sin mercado P2P hasta cumplir la antigüedad mínima (sección 10 de economía).
- Sin naves de combate.

### Fase 2 · Expansión (Cadete → Marinero)
- Objetivo: construir la base económica y desbloquear las primeras tecnologías.
- Investigaciones con requisito de laboratorio.
- Primeras naves, desbloqueadas por tecnología y astillero.
- Expediciones y misiones.
- Primer acceso al mercado P2P.

### Fase 3 · Competencia (Cabo → Teniente)
- Objetivo: entrar al PvP con margen 1:3 y proteger la base.
- Defensas (lanzamisiles y similares).
- Alianzas y colaboración.
- Se conserva el nivel al reiniciar temporada si se llega a Teniente.

### Fase 4 · Dominio (Capitán → Almirante)
- Objetivo: tecnologías avanzadas y naves de alto costo.
- Mayor exigencia de tiempo y recursos por cada mejora.
- Acceso a la comisión de retiro más baja.

## 3. Principios de equilibrio

1. **Costos que crecen más rápido que la producción.** Cada nivel de edificio cuesta más que el anterior, con un factor de crecimiento definido. Así, la producción adicional nunca compensa el costo indefinidamente.
2. **Tiempos de construcción reales.** Las mejoras tardan más en niveles altos. Con cola de construcción limitada en las primeras fases.
3. **Requisitos encadenados.** Una tecnología necesita un nivel de laboratorio. Una nave necesita tecnología y astillero. Nada se desbloquea solo con tiempo.
4. **Rendimiento decreciente en las minas.** Cada mina extra produce menos que la anterior en niveles altos, para que el crecimiento no sea lineal.
5. **Las mejoras son el camino principal de progresión.** La puntuación y el nivel de cuenta deben depender de construir y defender, no solo de acumular recursos.
6. **Límites de cola por fase.** Más colas activas solo en fases avanzadas, para no acelerar artificialmente la progresión.

## 4. Pendiente

- Lista de edificios, con costo base, factor de crecimiento y tiempo de construcción por nivel.
- Lista de investigaciones, con requisitos de laboratorio, costo y tiempo.
- Lista de naves, con tecnología requerida, astillero requerido y costo.
- Número de colas de construcción por fase.
- Rendimiento de minas por nivel y regla de rendimiento decreciente.
- Requisitos exactos de nivel de edificio para cada fase.
- Revisión de los valores actuales en `public/forja-astral.html`.

## 5. Cómo se calibrará

1. Copiar los valores actuales del juego (costos, tiempos y producciones).
2. Calcular cuánto tarda un jugador típico en llegar a cada fase con los valores actuales.
3. Definir el tiempo objetivo por fase (por ejemplo, días o semanas).
4. Ajustar factores de crecimiento y tiempos hasta que el tiempo estimado coincida con el objetivo.
5. Validar con pruebas de juego antes de fijar los valores.

# Fases y equilibrio de jugabilidad · XnovaEvolution

Este documento define las fases del juego, los tiempos reales de producción y la lista de configuraciones de prueba que deben quitarse antes de lanzar. Los valores marcados como **Pendiente** no deben implementarse hasta confirmarse.

---

## 1. Modo prueba y modo producción

Algunas configuraciones del juego existen solo para probar. Se quitarán antes del lanzamiento. El diseño final debe funcionar con los tiempos reales, no con los de prueba.

| Configuración de prueba | Dónde está (`public/forja-astral.html`) | Qué hace hoy | Valor final |
|---|---|---|---|
| Velocidad de simulación | Línea 1072: `speed:100` | El tiempo del juego corre 100 veces más rápido que el real | `1` |
| Selector de velocidad | Líneas 2463 y 4049: opciones x1, x10, x100, x1000 | Permite al jugador acelerar el tiempo | Quitar en producción |
| Investigación instantánea | Línea 2586: rama `if (it.view === 'research')` | Las investigaciones se completan sin cola ni tiempo | Cola con tiempo real (sección 3.2) |

Mientras existan estas configuraciones, cualquier prueba de progresión debe hacerse sabiendo que los tiempos no son los reales.

## 2. Fases del juego

### Fase 1 · Inicio (Grumete)
- Objetivo: aprender la producción de recursos y el mercado básico.
- Edificios iniciales de costo bajo, con una construcción activa a la vez.
- Sin PvP y sin mercado P2P hasta cumplir la antigüedad mínima (economía, sección 10).
- Sin naves de combate.

### Fase 2 · Expansión (Cadete → Marinero)
- Objetivo: construir la base económica y desbloquear las primeras tecnologías.
- Investigaciones con requisito de laboratorio y con tiempo real.
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

## 3. Tiempos reales (velocidad x1)

### 3.1 Edificios (vigente en el código)

Fórmula: `(metal + cristal) / (2500 × (1 + nivel Fábrica de Robots)) horas`, luego se multiplica por `0,5` por cada nivel de Fábrica de Nanobots y por `(1 − 0,02 × nivel Gravitón)`. Mínimo 5 segundos.

| Construcción | Costo (metal + cristal) | Tiempo a x1 |
|---|---|---|
| Mina de metal, nivel 1 | 75 | ~2 min |
| Mina de metal, nivel 10 | 2.882 | ~69 min |
| Mina de metal, nivel 15 | 21.893 | ~8,8 h |
| Mina de metal, nivel 20 | 166.262 | ~40 h |
| Laboratorio, nivel 1 | 600 | ~14 min |
| Fábrica de Robots, nivel 1 | 520 | ~12,5 min |
| Astillero Naval, nivel 1 | 600 | ~14 min |

### 3.2 Investigaciones (propuesta, pendiente de confirmar)

Hoy son instantáneas. Propuesta:

- **Tiempo** = costo total (metal + cristal + deuterio) / (2500 × (1 + nivel del Laboratorio de Investigación)) horas. Igual que los edificios, pero con el laboratorio como divisor.
- **Cola:** una investigación a la vez por cuenta. **Pendiente:** confirmar si la cola es por planeta o por cuenta.

Ejemplos con laboratorio nivel 1:

| Investigación | Costo total | Tiempo |
|---|---|---|
| Tecnología de Energía, nivel 1 | 1.200 | ~14 min |
| Tecnología de Armas, nivel 1 | 1.000 | ~12 min |
| Astrofísica, nivel 1 | 16.000 | ~3,2 h |

### 3.3 Naves (vigente en el código, pendiente de revisión)

Fórmula: `(metal + cristal) / (0,7 × (1 + 0,5 × (nivel Astillero − 1)))` segundos por unidad, mínimo 10 segundos. Cada orden se encola después de la anterior.

Ejemplo: Cazador Ligero con astillero nivel 1 tarda unas 1,6 h por unidad. Revisar si este tiempo es adecuado para cada fase, porque hoy parte de la progresión depende de él.

## 4. Principios de equilibrio

1. **Costos que crecen más rápido que la producción.** Cada nivel de edificio cuesta más que el anterior. Así, la producción adicional nunca compensa el costo indefinidamente.
2. **Tiempos reales en todo.** Las mejoras, investigaciones y naves tardan lo que indica la tabla de la sección 3, sin aceleraciones en producción.
3. **Requisitos encadenados.** Una tecnología necesita un nivel de laboratorio. Una nave necesita tecnología y astillero. Nada se desbloquea solo con tiempo.
4. **Rendimiento decreciente en las minas.** Cada mina extra produce menos que la anterior en niveles altos.
5. **La progresión depende de construir y defender.** La puntuación y el nivel de cuenta deben depender de acciones dentro del juego, no solo de acumular recursos.
6. **Colas limitadas en fases tempranas.** Más colas activas solo en fases avanzadas.

## 5. Pendiente

- Confirmar la fórmula de tiempo de investigaciones (sección 3.2) y si la cola es por planeta o por cuenta.
- Revisar el tiempo de construcción de naves (sección 3.3) por fase.
- Lista completa de edificios, investigaciones y naves con sus valores de costo, tiempo y requisito.
- Incluir el consumo de energía en la recuperación de minas. Hoy la cifra de recuperación no lo incluye.
- Número de colas de construcción por fase.
- Requisitos exactos de nivel de edificio para cada fase.
- Quitar las configuraciones de prueba de la sección 1 antes del lanzamiento.

## 6. Cómo se calibrará

1. Fijar los tiempos reales (sección 3) con velocidad x1.
2. Medir cuánto tarda un jugador típico en llegar a cada fase con esos tiempos, usando pruebas con la velocidad de prueba de la sección 1.
3. Ajustar factores de crecimiento y tiempos hasta que el tiempo estimado coincida con el objetivo de cada fase.
4. Validar con pruebas de juego antes de fijar los valores.

 <!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

# Reglas de trabajo

- Todo se trabaja en `main`. Sin ramas de prueba.
- Cada tarea terminada: commit y push a `main`. Informa el nombre del commit.
- Al cerrar una fase, actualiza `README.md`, este archivo y los `docs/` afectados.
- Nunca reescribas historial ya publicado (nada de force push, rebase ni squash).
- Ningún secreto en el repo. `PANEL_PASSWORD` vive como secreto de Cloudflare.

# Qué puedes decidir solo y qué necesita aprobación

| Hazlo sin preguntar | Pide aprobación |
|---|---|
| Corregir un fallo que rompe el juego | Cambiar precios, probabilidades, comisiones o cualquier regla de economía |
| Añadir validaciones de seguridad en el servidor | Añadir o quitar funciones del juego |
| Refactorizar sin cambiar comportamiento | Cambiar textos o mensajes que ve el jugador |
| Actualizar documentación para reflejar lo ya hecho | Cambiar el esquema de la base de datos |
| Corregir una contradicción entre docs y código, avisando en el resumen | Retiros, pagos, dinero real, términos y condiciones |

Si puedes avanzar con una suposición razonable, avanza y dilo en el resumen.
No te detengas a preguntar por detalles que el código ya responde.

# Cómo responder

- Una sola pregunta por turno, y solo si bloquea el trabajo.
- No repitas el plan antes de trabajar. Empieza.
- Al terminar: 3 a 5 líneas con qué cambió, qué probaste y el nombre del commit.
- Si un documento contradice el código, sigue el código y avísalo en el resumen.
- Lenguaje claro, sin jerga. Sin explicaciones largas.

# Datos del proyecto (no los redescubras)

- Despliegue: GitHub `main` → `bun run build` → `npx wrangler deploy`. Se publica `.output/public`.
- No existe `wrangler.jsonc` en el repo: lo genera Nitro en `.output/server/wrangler.json`.
- Base de datos: D1 `xnova-evolution`, binding `DB`. Tablas: `users`, `wallets`,
  `wallet_moves`, `saves`, `sessions`, `assistant_permissions`, `vip`, `reserves`.
- API: `src/api/handle.ts`, rutas `/api/*` desde `src/server.ts`.
- El juego también responde directo en `/forja-astral.html`; `/` es la app que lo enmarca.
- La copia del navegador (`localStorage`) es solo caché: la partida vive en `saves`.
- Local se usa `npm`; el despliegue usa `bun`. Los dos funcionan.

# Reglas del juego ya decididas (no cambiar sin aprobación)

- Costos: edificios, almacenes, instalaciones e investigación ×10; naves y defensas ×5.
  El tiempo de construcción sigue el costo.
- Cola de construcción: 1 orden gratis, hasta 4 con VIP.
- VIP: 98.684 TOKEN por 30 días, +50 % producción, construcción, naves y cola.
- Comisión al publicar oferta: 15 % gratis, 5 % VIP, en TOKEN.
- USDT: 0,000152 por TOKEN hasta la fase de economía real.
- Materia oscura: seis cajas (1 a 100 USD). Mejoras desde nivel 6: 10 × (nivel − 5).
  Desbloqueo único: Nave de Batalla 5, Acorazado 12, Bombardero 7, Destructor 30,
  Estrella de la Muerte 150, Cañón Gauss 10, Cañón de Plasma 40, Cúpula Grande 25.
- Mercado: precio por unidad; mínimo la última oferta publicada de ese recurso,
  o 0,10 metal / 0,20 cristal / 0,50 deuterio. Sin máximo.
- Expediciones: TOKEN 3 % y materia oscura 1 % por expedición (+50 % con VIP),
  tirados en el servidor y pagados desde `reserves` (`token` y `dark`).
- El saldo de TOKEN es por cuenta, no por planeta. Toda cuenta nueva empieza en 0.
- Los recursos (metal, cristal, deuterio) todavía se calculan en el navegador (etapa B2 pendiente).

# Problemas de seguridad conocidos (no los "descubras" de nuevo)

- `/api/save` ya valida estructura, progresión, tiempos, gasto y crecimiento de flota.
  Limitación conocida hasta B2: el máximo histórico de naves nunca baja; por tanto,
  un jugador puede recuperar gratis una flota destruida en combate. Se cierra en B2,
  cuando las flotas vivan en el servidor.
- `/api/expedition/roll` no tiene enfriamiento ni exige una expedición real: se puede
  repetir en bucle y vaciar la reserva. Pendiente de arreglo.
- `/api/wallet/spend` deja que el cliente fije el importe. Pendiente: precios en el servidor.
- El bloqueo temporal de `/api/login` por correo permite que alguien bloquee durante 15 minutos la cuenta de otra persona provocando 10 fallos consecutivos. Limitación aceptada mientras no haya jugadores; revisar antes de abrir el juego a jugadores reales.

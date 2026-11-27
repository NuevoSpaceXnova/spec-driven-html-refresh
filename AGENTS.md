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

## Project rules
- The game is a single self-contained HTML file at `public/forja-astral.html` (vanilla JS, localStorage saves); the `/` route only frames it full-screen. Why: keeps the original game logic intact while the app shell stays TanStack.
- Game scene images (mines, buildings, ships) live as local files under `public/assets/` referenced by `/assets/...` paths inside the HTML, never Lovable `/__l5e/` URLs or inline base64. Why: the user runs the repo from Codespaces, where only local paths load, and the HTML stays light.
- Shipyard ship images live as optimized WebP files in `public/assets/<shipId>.webp` (user-uploaded via the repo; PNG originals kept). Why: the user edits the repo from Codespaces, so local paths work outside Lovable.
- All work is done directly on `main`. Do not use test branches.
- Every finished phase or update gets a commit and a push to `main`. Report the commit name to the user.
- Decided rules currently in the game (test mode): the building queue allows 1 order for free accounts and up to 4 for VIP; VIP gives +50 % to production, building, ship construction and queue speed; publishing a resource offer charges the seller 15 % (free) or 5 % (VIP) of the total price in TOKEN; the USDT balance uses 0.000152 USDT per TOKEN until the real economy phase.
- The market is called "Mercado" (not "Mercado P2P"). Its "Materia Oscura" tab holds six boxes sold only by the administration (10, 55, 120, 325, 700 and 1.500 dark matter for 1, 5, 10, 25, 50 and 100 USD). Upgrading buildings and research from level 6 costs 10 × (target level − 5) dark matter. Attack ships and the strongest planetary defenses unlock once per type with dark matter: Nave de Batalla 5, Acorazado 12, Bombardero 7, Destructor 30, Estrella de la Muerte 150, Cañón Gauss 10, Cañón de Plasma 40, Cúpula Grande 25. Basic defenses do not use dark matter.
- The test-mode button, the speed selector and the "Activar VIP (prueba)" button in `public/forja-astral.html` are temporary. Remove them before the official launch. The VIP purchase and the wallet equivalent (0,000152 USD per TOKEN) are simulated until the real economy phase.
- Every time the game is updated or a phase is completed, update the rules and status in `README.md`, in this file, and in the affected documents in `docs/`, so the order of the work is kept.

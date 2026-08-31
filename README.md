# MTG Tabletop — Cloudflare Pages

This build is ready for Cloudflare Pages with Git integration.

## Structure
- `index.html` — MTG tabletop frontend
- `style.css` — responsive tabletop styles
- `app.js` — game interactions and deck import client
- `functions/api/import-moxfield.js` — same-origin Moxfield importer
- `_routes.json` — routes `/api/*` through Pages Functions
- `wrangler.toml` — Cloudflare project configuration

## Cloudflare Pages setup
1. In Cloudflare, open **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select `OhNosferatu/-mtg-tabletop-cloudflare`.
3. Production branch: `main`.
4. Framework preset: `None`.
5. Build command: leave blank.
6. Build output directory: `.`.
7. Deploy.

The frontend calls `/api/import-moxfield`, so the game and API use the same Cloudflare domain. Future pushes to `main` redeploy automatically.

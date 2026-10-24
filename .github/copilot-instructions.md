# Instructions for AI coding assistants

You are building **Planner App**, a Vue 3 + TypeScript + Supabase PWA (mobile-first, 390 × 844).

- The full spec is `docs/SPEC.md`. Read it before writing code and follow it exactly. It wins over anything else.
- Decisions made before development (and any later ones) are in `docs/DECISIONS.md`. Where it differs from the spec, it wins.
- Design reference: `design/mockups/*.dc.html` (interactive mockup source; read for exact layout, sizes, colors and interactions — they do not open standalone in a browser) and `design/screens/` (screenshots, if present).
- Design tokens are in `src/styles/tokens.css`. Use the CSS variables; do not invent new colors.
- Database: run `supabase/schema.sql`. Do not change table names without updating the spec.
- All UI text goes through vue-i18n (`src/locales/zh-TW.json`, `src/locales/en.json`). Keep both files with identical keys. Language is switched only on the Settings page.
- All cross-module sync rules live in `src/services/sync.ts` (spec section 6). Pages call the service; no sync logic in components.
- Flat design everywhere. Only the cake (Today page) uses gradients and shadows.
- No UI component libraries. Only add well-known packages; keep `package-lock.json`.
- Work one phase at a time (spec section 9). After each phase, make sure `npm run build` and `npm run test:unit` pass, then stop and summarize what changed.
- Reply to the user in Traditional Chinese. Code, identifiers and commit messages in English.

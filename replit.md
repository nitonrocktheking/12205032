# France Royal

A Clash Royale-style browser arena game where French political personalities battle on a vertical mobile-style arena. Solo vs AI and 1v1 online multiplayer over WebSockets.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server + WebSocket (port from $PORT)
- `pnpm --filter @workspace/france-royal run dev` — game web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, Clerk vars (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`) — auto-provisioned

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + WebSocket (`ws`)
- DB: PostgreSQL + Drizzle ORM
- Auth: Replit-managed Clerk (email/password + Google + GitHub/Apple/X)
- Frontend: React + Vite + Tailwind v4 + shadcn/ui + @clerk/react

## Where things live

- Game engine — `artifacts/france-royal/src/game/engine.ts` (deterministic, seeded for MP)
- Card defs — `artifacts/france-royal/src/game/cards.ts`
- Backend card catalog (IDs only) — `artifacts/api-server/src/lib/cardsCatalog.ts` (`ALL_CARDS`, `STARTER_CARDS`, `ADMIN_ONLY_CARDS`, `UNLOCKABLE_CARDS = ALL − STARTER − ADMIN_ONLY`)
- WebSocket rooms (MP relay) — `artifacts/api-server/src/ws/rooms.ts`
- DB schemas — `lib/db/src/schema/{userProfiles,userCards,userDecks}.ts`
- Auth + API routes — `artifacts/api-server/src/{app.ts,routes/me.ts}`
- Frontend auth wiring — `artifacts/france-royal/src/App.tsx`
- Hooks for user data — `artifacts/france-royal/src/hooks/useMe.ts`
- Pages — Menu, Game, Lobby, Results, SignInPage, SignUpPage, Collection, DeckEditor

## Product

- Account system (Clerk) — both pseudo+password and Google sign-in.
- Card collection (14 personalities). New players get 8 starter cards; 6 unlockable.
- Deck editor with 3 deck slots; the active deck is used in Solo matches.
- Solo (vs AI) and Multiplayer (1v1, WebSocket, 4-letter room codes).
- Match rewards: XP + gold every match; winning unlocks a random new card until full collection.
- Pseudo-3D "Clash" feel via CSS (gradients, drop shadows, raised buttons with active-press effect).

## Architecture decisions

- Game state lives in a ref, advanced at ~60Hz; React re-renders only at `RENDER_RATE`.
- `createInitialState(seed?, playerDeckIds?, enemyDeckIds?)` — solo passes the player's selected deck; MP uses default deck for both for now (deck sync deferred).
- JIT user provisioning on first `/api/me` call: profile row + starter cards + slot-0 deck.
- Match reward endpoint trusts the client `{result}` — acceptable for casual MVP, not anti-cheat.
- Backend stores only card IDs; full card definitions remain client-side.

## User preferences

- App languages: French (default/canonical), English, Spanish. Browser language auto-detected on first visit; otherwise a language picker is shown. Persistent switcher in the Menu UserBar, signed-out panel, and UsernameSetup.
- Translation dicts: `src/locales/{fr,en,es}.ts` (FR is canonical — missing keys in EN/ES fall back to FR via `translate()` in `src/lib/i18n.ts`). Access via `const { t } = useT()` from `src/hooks/useT.ts`. Use `*_html` keys + the local `<Html>` helper for strings with `<b>`/`<br/>`.
- Card NAMES stay French (real political personalities are proper nouns). Admin panel is intentionally French-only (moderator-only).
- Both email/password AND Google login required (Clerk handles both natively).
- Pseudo-3D style via CSS, not Three.js.

## Admin panel

- Page `/admin` (Clerk-bypassed, password-gated only) — see `pages/Admin.tsx`. Default creds `admin` / `sd73james`; override via `ADMIN_PASSWORD` (and optional `ADMIN_USERNAME`) env. A startup warning is logged if `ADMIN_PASSWORD` is unset.
- Endpoints: `POST /api/admin/login`, `GET /api/admin/users`, `POST /api/admin/grant-card` (`target`: userId or `"all"`, `cardId`). All require `x-admin-password` header (except `login`). Single-target grant validates the user exists.
- Boss/admin-only cards: declared in `ADMIN_ONLY_CARDS`. Currently `urssaf` only.

## URSSAF (boss spell)

- `urssaf` is a global spell, cost 9, `spawnCount: 0`, `special: 'urssaf'`. Never appears in random unlocks.
- On play: sets `state.urssafEffect = { casterFaction, startTime }`, no unit spawn, replay while active returns `false`.
- Per tick: opponent units → `transformedAsInvoice=true`, `speedMult=0`, `damage=0`, 40 dps DOT. Opponent towers take 18 dps. Caster's side untouched.
- Rendering: `Arena.tsx` hides the caster's towers from the opponent's viewport. `Unit.tsx` early-returns an "URSSAF NON PAYÉE" paper visual for transformed units (memo comparator includes `transformedAsInvoice`).
- Solo AI pool filters out `special === 'urssaf'` and `spawnCount === 0` so the AI never wastes elixir on a spell it can't cast via `spawnUnit`.

## Gotchas

- Clerk's `<SignIn path>` / `<SignUp path>` need the **full** path including base path (`${basePath}/sign-in`). Route paths in wouter remain base-relative with `/sign-in/*?` (optional wildcard required for OAuth sub-paths).
- `tailwindcss({ optimize: false })` in `vite.config.ts` is required so `@clerk/themes/shadcn.css` `@layer` imports work in prod.
- After adding/changing tables in `lib/db/src/schema/`, run `pnpm run typecheck:libs` so other packages see the new exports.
- Engine's `enemyHand`/`enemyDeck` is local and assumed identical between MP peers — both sides must use the same deck definition; that's why MP currently uses the default deck on both sides.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for the canonical auth wiring (cookie-based on web, do NOT add Bearer tokens)

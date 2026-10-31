# Radon website

Public, responsive Next.js site for Radon. The website is independently installed and deployed from `web/`; it never imports the bot runtime, connects to the bot database, or requires bot credentials.

## Develop

From `web/`, with Bun installed:

```sh
bun install --frozen-lockfile
bun run dev
```

The UI uses shadcn/ui with Radix primitives, Tailwind CSS 4, Lucide icons, and locally bundled Next.js fonts. `components.json` is the shadcn configuration. Custom visual styles live in `app/globals.css`.

## Check

```sh
bun run lint
bun run typecheck
bun run build
bunx playwright install chromium
bun run test:e2e
```

Browser checks run against the production build on port 4173 and cover desktop and mobile layouts, command search and dialogs, the demo interaction, navigation, legal/guide routes, share assets, and automated WCAG A/AA checks. They also check widths from 320px to 1920px. For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its path. In restricted environments, use `NEXT_TELEMETRY_DISABLED=1` for Next.js commands.

Browser test files use `*.pw.ts` so the bot's root `bun test` does not discover them. They make no live bot, voting, moderation, or redemption requests. Test outputs are ignored by `web/.gitignore`.

## Content

- `/`: features, interactive illustrative preview, supported games, searchable command examples, optional voting perks, and FAQ.
- `/guide`: setup, account management, all three supported games, Supporter Pass behavior, opt-in alerts, staff posting, and troubleshooting.
- `/terms-of-service` and `/privacy-policy`: legal and data-handling information.
- `/opengraph-image` and `/icon.svg`: self-contained social preview and favicon.

`lib/site.ts` centralizes public links, game display data, command examples, and FAQs. The guide and privacy copy reflect the multi-game and vote-reward behavior documented in PR #591 (`docs/player-guide.md`). Copy deliberately avoids live server-count claims, uptime guarantees, valid-coupon claims, or automatic redemption promises. The preview CLAIM button changes local demo state only.

Future feature changes should update public copy here in the same PR. Keep the public website independent of runtime game modules and credentials; a static site cannot infer new bot behavior automatically.

## Vercel

Use the existing Vercel project, with **Root Directory: `web`**, framework Next.js, install command `bun install --frozen-lockfile`, and build command `bun run build`. No environment variables or backend services are required. Keep Next.js's platform-provided tracing root: Vercel packages this app relative to the repository root and needs the `web/` prefix in the build manifest. Forcing `outputFileTracingRoot` to `web/` removes that prefix and can make packaging look for `.next` manifests in the repository root. Leave `turbopack.root` unset so both roots follow the hosting platform’s layout. This does not change which bot files run; the website still imports no bot runtime code. The existing project URL is centralized in `lib/site.ts` for social metadata; update it if the primary domain changes.

This redesign is stacked on `codex/game-rewards` (PR #591). Merge the website PR into that branch first, then merge #591 into `main` when game testing is complete. Keep production on the current branch until then; use the Vercel branch preview to review the redesign.

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

Browser checks run against the production build on port 4173 and cover desktop and mobile layouts, command search and dialogs, the demo interaction, navigation, legal/guide/update routes, share assets, and automated WCAG A/AA checks. They check widths from 320px to 1920px, back-navigation separation from titles, longer back labels, reduced motion, and unique metadata/discovery files. For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its path. In restricted environments, use `NEXT_TELEMETRY_DISABLED=1` for Next.js commands. GitHub CI builds the website and runs these browser checks for pull requests.

Browser test files use `*.pw.ts` so the bot's root `bun test` does not discover them. They make no live bot, voting, moderation, or redemption requests. Test outputs are ignored by `web/.gitignore`.

## Content

- `/`: features, interactive illustrative preview, supported games, searchable command examples, optional voting perks, and FAQ.
- `/guide`: setup, account management, all three supported games, Supporter Pass behavior, opt-in alerts, staff posting, and troubleshooting.
- `/guide/server`: visual server handbook with a situation picker, real command examples, warnings and severity, direct moderation, cases and logs, reports, AutoMod, locks, utilities, and troubleshooting. All examples are illustrative; nothing invokes Discord. Guide topic links connect both handbooks.
- `/updates`: a dated, linkable history shared with the bot's `/updates` command. The home page shows the newest entry.
- `/terms-of-service` and `/privacy-policy`: legal and data-handling information.
- `/opengraph-image` and `/icon.svg`: self-contained social preview and favicon.
- `/robots.txt` and `/sitemap.xml`: discovery for all six public content routes.

`lib/site.ts` centralizes public links, game display data, command examples, and FAQs. The guide and privacy copy reflect the multi-game and vote-reward behavior documented in PR #591 (`docs/player-guide.md`). Copy deliberately avoids live server-count claims, uptime guarantees, valid-coupon claims, or automatic redemption promises. The preview CLAIM button changes local demo state only.

Future feature changes should update public copy here in the same PR. Add public release notes to `../shared/updates.json`, newest first, following `docs/updates.md` in the repository root. Both website views and the bot command read that static file. It contains only public text; the site still imports no bot runtime or credentials.

`components/document-heading.tsx` keeps back navigation in a separate row above the eyebrow, title, and description for guide, legal, and update pages. Motion uses CSS transforms and progressive scroll-animation support; all content stays visible without JavaScript, and reduced-motion preferences disable entrance and decorative animations. The existing brand mark and favicon are unchanged.

## SEO verification

Each page has its own title, description, canonical URL, and matching OpenGraph/Twitter metadata. The home page includes factual WebSite and SoftwareApplication JSON-LD; no ratings or review counts are fabricated. The canonical origin stays centralized in `lib/site.ts`.

To measure a local production build independently, start `bun run start --port 4174`, then run:

```sh
bunx lighthouse@13.0.1 http://localhost:4174 --only-categories=seo --output=json --output-path=/tmp/radon-seo.json
```

Repeat for `/guide`, `/updates`, `/terms-of-service`, and `/privacy-policy`. Chromium must be installed; set `CHROME_PATH` if needed. Lighthouse is a technical audit of that build, not a guarantee of search ranking or production performance. Check the deployed site's headers and canonical domain after a domain change.

The October 31, 2026 local production audit scored **100/100 for SEO on all five routes** using Lighthouse 13.0.1 and Chromium. Browser regressions additionally check social image tags, which Lighthouse's SEO category does not cover.

## Vercel

Use the existing Vercel project, with **Root Directory: `web`**, framework Next.js, install command `bun install --frozen-lockfile`, and build command `bun run build`. Enable **Include source files outside of the Root Directory in the Build Step** in the project's Root Directory settings so `../shared/updates.json` is available. No environment variables or backend services are required. Keep Next.js's platform-provided tracing root: Vercel packages this app relative to the repository root and needs the `web/` prefix in the build manifest. Forcing `outputFileTracingRoot` to `web/` removes that prefix and can make packaging look for `.next` manifests in the repository root. Leave `turbopack.root` unset so both roots follow the hosting platform’s layout. This does not change which bot files run; the website still imports no bot runtime code. The existing project URL is centralized in `lib/site.ts` for social metadata; update it if the primary domain changes.

The bug-reporting, updates, and website follow-up PR targets `codex/game-rewards` (PR #591). Review and manually test its branch preview before merging it into that branch; merge #591 into `main` only after acceptance. No production deployment is part of these checks.

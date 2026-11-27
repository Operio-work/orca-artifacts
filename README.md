# ORCA Artifacts

**Your live pages and dashboards in one installable app.** ORCA Artifacts lists, organizes and shows the
pages, trackers and dashboards your team (or your AI agents) keep up to date. It installs on phone and desktop,
works offline, and every screen is in English and Spanish.

[Español](README.es.md) · MIT · works alone or with [ORCA](https://github.com/Operio-work/orca)

- **One home for everything:** search (`/`), a Ctrl/⌘+K palette, pins per person, shared collections and tags.
- **Dashboards from a JSON file:** stats, bars, trend lines and tables with filters and click-to-filter. Build
  them in the app (`/d/new`) or write the file. See [docs/dashboards.md](docs/dashboards.md).
- **Live pages:** any folder with an `index.html` is served as is, with its own card.
- **Installable PWA:** install prompt, offline reading of the last pages you opened, app shortcuts.
- **Yours to brand:** name, logo, note links and colours come from one config file.

## Quick start

```sh
git clone https://github.com/Operio-work/orca-artifacts.git
cd orca-artifacts
pnpm install
pnpm dev            # http://localhost:5199 with the demo library
```

Production:

```sh
pnpm build
ARTIFACTS_LIBRARY=/path/to/your/library PORT=5199 ORIGIN=https://artifacts.example.com node build
```

`ecosystem.config.cjs` is a PM2 example. Put a reverse proxy with HTTPS in front: install and offline need
HTTPS (or `localhost`).

## Your library

The app shows one folder, the **library**. The demo is in `demo-library/`; copy it to `library/` to start.

```
library/
  orca-artifacts.config.json   name, logo, time zone, note links (all optional)
  site/<slug>/index.html       live pages (served as files); meta.json = card title, description, tags
  site/assets/                 shared CSS for your pages
  dashboards/<slug>.json       dashboards; dashboards/data/*.json = their data
  state/organize.json          collections and tags (written by the app)
  var/                         pins per person (written by the app; keep it out of git)
```

`orca-artifacts.config.json`:

```json
{
  "name": "ORCA Artifacts",
  "org": "Acme",
  "logo": "/assets/logo.svg",
  "timeZone": "America/New_York",
  "theme": "/assets/theme.css",
  "source": "git: acme/artifacts",
  "notes": { "label": "Wiki", "url": "https://wiki.example.com/page/{id}", "home": "https://wiki.example.com/" }
}
```

`notes` links each artifact to its write-up in your notes tool (Trilium, Obsidian publish, Notion, a wiki…):
put `"note": "<id>"` in a page's `meta.json` or a dashboard, or a full URL. `theme` is a stylesheet loaded after
the default tokens, for your colours.

## Settings

| Variable | Default | |
|---|---|---|
| `ARTIFACTS_LIBRARY` | `./library`, else `./demo-library` | the library folder |
| `ARTIFACTS_AUTH` | `none` | who is viewing: `none` (one shared set of pins), `tailscale` (Tailscale Serve identity headers), `header` (any proxy) |
| `ARTIFACTS_USER_HEADER` | `x-forwarded-user` | with `header`: the login header your proxy sets |
| `ARTIFACTS_USER_NAME_HEADER` | — | with `header`: display name header |
| `ARTIFACTS_STORAGE` | `folder` | `git` commits the app's saves after 20 s of quiet |
| `ARTIFACTS_GIT_PUSH` | `0` | `1` pushes after each commit |
| `ARTIFACTS_PUBLISH_TOKEN` | — | turns on `POST /api/publish` for ORCA and scripts (24+ characters) |
| `ARTIFACTS_PUBLISH_DIRECT` | `0` | `1` lets a publisher skip approval |
| `ARTIFACTS_TZ` | config `timeZone`, else `UTC` | calendar days in dashboards |

The app has **no login of its own**. Keep it on `localhost`, a private network (Tailscale works well), or behind
a proxy that signs people in. Anyone who can open it can edit dashboards and collections.

## With ORCA

[ORCA](https://github.com/Operio-work/orca) runs your AI agents; ORCA Artifacts is where their work shows up.
Agents publish pages and dashboards with `operio-orca artifact publish`; they arrive as **drafts** under
**To approve** (with a count on the app icon) and nobody sees them on the list until a person approves.
Routines refresh numbers with `operio-orca artifact data`. Turn it on with `ARTIFACTS_PUBLISH_TOKEN`; details in
[docs/publishing.md](docs/publishing.md).

**ORCA Managed by Operio** hosts both for you, with team roles, share links, alerts, backups, and dashboards
built for your business: [make.operio.work](https://make.operio.work).

## Develop

```sh
pnpm check && pnpm test && pnpm build
node scripts/check-public.mjs   # no private addresses or keys in tracked files
```

SvelteKit + shadcn-svelte + Tailwind. UI strings live in `src/lib/i18n.svelte.ts` (es + en).

## License

MIT © Operio

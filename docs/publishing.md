# Publishing from ORCA or a script

Agents and scripts send pages, dashboards and data to ORCA Artifacts over HTTP. New pages and dashboards
arrive as **drafts**: they show under **To approve** (with a count on the app icon) and stay off the list until a
person taps **Approve**. **Reject** hides them; the files stay in the library (and in git history).

## Turn it on

```sh
ARTIFACTS_PUBLISH_TOKEN=$(openssl rand -hex 24)   # at least 24 characters; unset = publishing off
# ARTIFACTS_PUBLISH_DIRECT=1                      # let a publisher skip approval with "draft": false
```

From ORCA: `operio-orca artifact setup <app URL> <token>`, then `operio-orca artifact publish …`.

## API

`POST /api/publish` with `Authorization: Bearer <token>` and a JSON body. `GET /api/publish` checks the token.

| `kind` | body | result |
|---|---|---|
| `dashboard` | `spec` (see [dashboards.md](dashboards.md)), `by` | `dashboards/<slug>.json`, draft |
| `page` | `slug`, `files` `{ "index.html": { "text": "…" }, "logo.png": { "base64": "…" } }`, `by` | `site/<slug>/…`, draft; `meta.json` (yours, merged) gets `status` and `by` |
| `data` | `name` + `json` → `dashboards/data/<name>.json`, or `page` + `json` → `site/<page>/data.json` | written at once (numbers for something already approved) |

Limits: 40 files, 5 MB per call; file names are letters, digits, `.`, `_`, `-` in up to 4 folders; types html, css,
js, json, svg, png, jpg, webp, gif, txt, md, pdf, woff2. Re-publishing a page or dashboard makes it a draft again.

Answer: `{ "ok": true, "key": "page:report", "status": "draft", "url": "/report/" }`, or `422` with `problems`.

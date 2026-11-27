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
`url` is the path inside the app (add your base path if you set `ARTIFACTS_BASE`).

New drafts send a push alert to everyone who turned alerts on and may approve. Set `BODY_SIZE_LIMIT=8M` on the
app so 5 MB calls fit (the Node adapter's default is 512 KB).

## Sign-in from ORCA

With `ARTIFACTS_AUTH=orca` the app trusts a person signed by ORCA (format: ORCA's `lib/identity.js`):
`v1.<base64url JSON {u, n, r, t}>.<base64url HMAC-SHA256(secret, "v1." + payload)>`, at most 5 minutes old,
role `r` one of `operio_admin`, `operio_ops`, `client_admin`, `client_viewer`. It arrives as the `X-Orca-User`
header (a proxy such as ORCA Host) or once as `/auth/orca?ticket=…&return=/path` (then a 30-day cookie).
The secret is `ARTIFACTS_ORCA_SECRET`, or `base64url(HMAC-SHA256(publish token, "orca-artifacts/sso/v1"))`.

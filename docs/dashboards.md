# Dashboards

One file per dashboard: `dashboards/<slug>.json`, shown at `/d/<slug>`.
The file name must equal `slug`. Data comes from JSON files in `site/` (any page's `data.json`) or `dashboards/data/`.
Nothing else can be read (no URLs, no files outside those two folders).

```jsonc
{
  "version": 1,
  "slug": "reviews",                 // 2–60: a-z 0-9 -
  "title": { "es": "…", "en": "…" },            // both required
  "description": { "es": "…", "en": "…" },      // optional
  "tags": ["reviews"],               // optional, lowercase
  "note": "abc123",                             // optional: note id (via notes.url) or full URL
  "range": true,                                // optional: 7/30/90/all picker on sources with dateField
  "sources": {                                  // name: a-z 0-9 _
    "reviews": { "file": "dashboards/data/reviews.json", "path": "items", "dateField": "date" },
    "inline": { "rows": [{ "k": "a", "v": 1 }] }
  },
  "filters": [                                  // dropdowns above the widgets (multi-select)
    { "source": "reviews", "field": "status", "label": { "es": "Estado", "en": "Status" } }
  ],
  "labels": {                                   // optional: raw value → bilingual label, per field
    "status": { "live": { "es": "Publicada", "en": "Live" } }
  },
  "widgets": [ … ]
}
```

## Widgets

Every widget: `type`, optional `title` (`es`/`en`), `source`, `span` (1–4 columns of 4; phones: 1 = half, else full),
optional `where` (row filter, below).

| type | fields | shows |
|---|---|---|
| `stat` | `agg`, `field` (unless count), `format`, `hint` | one big number |
| `bar` | `groupBy`, `agg`, `field`, `limit` (default 10, the rest fold into "Other") | horizontal bars; **click a bar to filter the whole dashboard** |
| `line` | `x` (date field), `bucket` day/week/month, `agg`, `field`, `series` (≤ 6 lines) | trend with hover tooltip; empty days count as 0 |
| `table` | `columns` [{`field`, `label`, `format`}], `sort` (`field` or `-field`), `limit` | sortable, searchable table |
| `text` | `text` (`es`/`en`, blank line = new paragraph) | a note |

- `agg`: `count` · `sum` · `avg` · `min` · `max` · `distinct`
- `format`: `number` · `mxn` · `usd` · `percent` (value 0–100) · `date` · `link` (https only) · `pill` (status colour) · `text`
- `where`: `{ "status": "live" }` · `{ "status": ["live", "pending"] }` · `{ "members": { "gte": 1000 } }` ·
  ops `in`, `not`, `gte`, `lte`, `gt`, `lt`, `contains`, `exists`. Fields can be dotted (`owner.name`).
- Dates are grouped by calendar day in the library time zone (`timeZone` in the config, or `ARTIFACTS_TZ`). Missing values show as "—".

## Alerts

Push a phone alert when a stat crosses a line. Give the stat widget an `id`, then:

```json
"alerts": [
  { "widget": "leads-today", "op": "<", "value": 5, "message": { "es": "Hoy hay menos de 5 prospectos", "en": "Fewer than 5 leads today" } }
]
```

`op`: `<` `<=` `>` `>=` `=` `!=`. The stat is read over all its rows (its `where` applies; page filters and the
range picker don't). Checked every `ARTIFACTS_ALERT_MINUTES` (10) and right after new data arrives through
`/api/publish`. An alert pushes once when it turns on, and again only after it has been off. Drafts never alert.
People turn alerts on with the bell in the app bar (on iPhone, after adding the app to the Home Screen).

## Data that isn't in a page yet

Have any script (cron, an ORCA routine, CI) write
`dashboards/data/<name>.json` as `{ "updated": "<ISO>", "items": [ … ] }`, then point a source at it.
The app reads files on every request, so new data shows on reload — no restart.

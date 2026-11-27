export type Lang = 'es' | 'en';
export type L10n = { es: string; en: string };
export type Kind = 'page' | 'dashboard' | 'archive';

export interface CatalogItem {
	key: string; // `${kind}:${slug}`
	kind: Kind;
	slug: string;
	href: string;
	title: L10n;
	description: L10n;
	tags: string[]; // tags from the artifact itself (meta.json / spec)
	note?: string; // linked note: an id (resolved through the library's notes.url) or a full URL
	status?: 'draft'; // waiting for a person to approve it (rejected ones are not listed)
	by?: string; // who published it (an agent or a person)
	updated?: string; // ISO or YYYY-MM-DD
	origin?: string; // archive: html | claude-docs
}

export interface Collection {
	id: string;
	name: string;
	color?: string;
}

export interface OrganizeState {
	collections: Collection[];
	items: Record<string, { collection?: string; tags?: string[] }>;
}

/** What the home page receives: catalog item merged with shared organization + the viewer's pins. */
export interface ViewItem extends CatalogItem {
	collection?: string;
	allTags: string[];
	pinned: boolean;
}

// ---------- Dashboards ----------

export type Agg = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
export type Format = 'number' | 'mxn' | 'usd' | 'percent' | 'date' | 'link' | 'pill' | 'text';
export type Where = Record<string, unknown>;

export interface SourceSpec {
	file?: string; // repo-relative: site/**.json or dashboards/data/**.json
	path?: string; // dotted path to the array inside the file
	rows?: Record<string, unknown>[]; // inline rows
	dateField?: string;
	label?: L10n;
}

export interface FilterSpec {
	source: string;
	field: string;
	label?: L10n;
}

interface WidgetBase {
	id?: string;
	title?: L10n;
	span?: 1 | 2 | 3 | 4;
	source?: string;
	where?: Where;
}
export interface StatWidget extends WidgetBase {
	type: 'stat';
	agg: Agg;
	field?: string;
	format?: Format;
	hint?: L10n;
}
export interface BarWidget extends WidgetBase {
	type: 'bar';
	groupBy: string;
	agg: Agg;
	field?: string;
	limit?: number;
	format?: Format;
}
export interface LineWidget extends WidgetBase {
	type: 'line';
	x: string;
	bucket?: 'day' | 'week' | 'month';
	agg: Agg;
	field?: string;
	series?: string;
	format?: Format;
}
export interface TableColumn {
	field: string;
	label?: L10n;
	format?: Format;
}
export interface TableWidget extends WidgetBase {
	type: 'table';
	columns: TableColumn[];
	sort?: string; // "field" or "-field"
	limit?: number;
}
export interface TextWidget extends WidgetBase {
	type: 'text';
	text: L10n;
}
export type Widget = StatWidget | BarWidget | LineWidget | TableWidget | TextWidget;

export interface DashboardSpec {
	version: 1;
	slug: string;
	title: L10n;
	description?: L10n;
	tags?: string[];
	note?: string; // linked note id or URL (footer link)
	trilium?: string; // old name for note; still read
	status?: 'draft' | 'rejected'; // set by publish; removed on approval
	by?: string; // who published it
	range?: boolean; // show the 7/30/90/all picker (uses each source's dateField)
	sources: Record<string, SourceSpec>;
	filters?: FilterSpec[];
	labels?: Record<string, Record<string, L10n>>; // field -> raw value -> label
	widgets: Widget[];
	updated?: string;
}

export type Rows = Record<string, unknown>[];

/** Library branding + note links, from <library>/orca-artifacts.config.json. */
export interface Brand {
	name: string; // app name in the bar and the installed app
	org: string; // shown after the name ("ORCA Artifacts · Acme"); empty = none
	logo: string; // URL path (library site/ file or built-in /icons/…)
	timeZone: string; // IANA zone for calendar days in dashboards
	notes: { label: string; url: string; home: string } | null; // url has {id}
	theme: string; // extra stylesheet URL path loaded after the default tokens; empty = none
	source: string; // where the library lives, shown in footers ("git: acme/artifacts")
}

import { tz } from '#lib/tz.js';
import type { L10n, Lang } from '#lib/types.js';

const S = {
	app: { es: 'ORCA Artifacts', en: 'ORCA Artifacts' },
	search: { es: 'Buscar artifacts…', en: 'Search artifacts…' },
	all: { es: 'Todo', en: 'All' },
	pinned: { es: 'Fijados', en: 'Pinned' },
	page: { es: 'Páginas vivas', en: 'Live pages' },
	dashboard: { es: 'Tableros', en: 'Dashboards' },
	archive: { es: 'Archivo', en: 'Archive' },
	kind_page: { es: 'Página', en: 'Page' },
	kind_dashboard: { es: 'Tablero', en: 'Dashboard' },
	kind_archive: { es: 'Archivo', en: 'Archive' },
	collections: { es: 'Colecciones', en: 'Collections' },
	newCollection: { es: 'Nueva colección', en: 'New collection' },
	noCollection: { es: 'Sin colección', en: 'No collection' },
	tags: { es: 'Etiquetas', en: 'Tags' },
	newDashboard: { es: 'Nuevo tablero', en: 'New dashboard' },
	pin: { es: 'Fijar', en: 'Pin' },
	unpin: { es: 'Quitar de fijados', en: 'Unpin' },
	moveTo: { es: 'Mover a colección', en: 'Move to collection' },
	editTags: { es: 'Editar etiquetas', en: 'Edit tags' },
	drafts: { es: 'Por aprobar', en: 'To approve' },
	draft: { es: 'Borrador', en: 'Draft' },
	approve: { es: 'Aprobar', en: 'Approve' },
	reject: { es: 'Rechazar', en: 'Reject' },
	approved: { es: 'Aprobado: ya está en la lista.', en: 'Approved: it is now listed.' },
	rejected: { es: 'Rechazado: ya no se muestra.', en: 'Rejected: it is no longer shown.' },
	draftBanner: { es: 'Borrador: nadie lo ve en la lista hasta que lo apruebes.', en: 'Draft: it stays off the list until you approve it.' },
	noteField: { es: 'Nota (id o URL)', en: 'Note (id or URL)' },
	openNote: { es: 'Abrir nota', en: 'Open note' },
	install: { es: 'Instalar app', en: 'Install app' },
	alertsOn: { es: 'Alertas activadas', en: 'Alerts on' },
	alertsOff: { es: 'Activar alertas', en: 'Turn on alerts' },
	alertsTurnOff: { es: 'Desactivar alertas', en: 'Turn off alerts' },
	alertsBlocked: { es: 'Las notificaciones están bloqueadas en este navegador. Actívalas en los ajustes del sitio.', en: 'Notifications are blocked in this browser. Allow them in the site settings.' },
	alertsFailed: { es: 'No se pudieron activar las alertas.', en: 'Could not turn on alerts.' },
	alertsIos: { es: 'En iPhone, primero agrega la app a la pantalla de inicio.', en: 'On iPhone, add the app to the Home Screen first.' },
	shareTitle: { es: 'Guardar lo compartido', en: 'Save what you shared' },
	shareHint: { es: 'Se guarda como borrador. Aparece en «Por aprobar» hasta que alguien lo apruebe.', en: 'It is saved as a draft. It shows under “To approve” until someone approves it.' },
	shareName: { es: 'Título', en: 'Title' },
	shareText: { es: 'Texto', en: 'Text' },
	shareLink: { es: 'Enlace', en: 'Link' },
	shareFile: { es: 'Archivo', en: 'File' },
	shareSave: { es: 'Guardar borrador', en: 'Save draft' },
	shareSaved: { es: 'Guardado como borrador', en: 'Saved as a draft' },
	shareNothing: { es: 'No llegó nada. Comparte un enlace, texto, imagen o PDF desde otra app y elige ORCA Artifacts.', en: 'Nothing arrived. Share a link, text, image or PDF from another app and pick ORCA Artifacts.' },
	shareTooBig: { es: 'El archivo pesa más de 4 MB.', en: 'The file is over 4 MB.' },
	viewerOnly: { es: 'Tu acceso es de solo lectura.', en: 'You have view-only access.' },
	offline: { es: 'Sin conexión: se muestra lo último guardado.', en: 'Offline: showing what was saved last.' },
	copyLink: { es: 'Copiar enlace', en: 'Copy link' },
	copied: { es: 'Enlace copiado', en: 'Link copied' },
	edit: { es: 'Editar', en: 'Edit' },
	delete: { es: 'Eliminar', en: 'Delete' },
	rename: { es: 'Renombrar', en: 'Rename' },
	save: { es: 'Guardar', en: 'Save' },
	cancel: { es: 'Cancelar', en: 'Cancel' },
	create: { es: 'Crear', en: 'Create' },
	name: { es: 'Nombre', en: 'Name' },
	sortRecent: { es: 'Recientes', en: 'Recent' },
	sortName: { es: 'A–Z', en: 'A–Z' },
	grid: { es: 'Tarjetas', en: 'Cards' },
	list: { es: 'Lista', en: 'List' },
	results: { es: 'resultados', en: 'results' },
	empty: { es: 'Nada coincide. Prueba otra búsqueda o quita filtros.', en: 'Nothing matches. Try another search or clear filters.' },
	clear: { es: 'Limpiar', en: 'Clear' },
	tagsHint: { es: 'Separadas por comas', en: 'Comma separated' },
	deleteCollection: { es: '¿Eliminar la colección? Los artifacts quedan sin colección.', en: 'Delete the collection? Its artifacts become uncollected.' },
	goTo: { es: 'Ir a…', en: 'Go to…' },
	notes: { es: 'Notas:', en: 'Notes:' },
	source: { es: 'Fuente:', en: 'Source:' },
	updated: { es: 'Actualizado', en: 'Updated' },
	filters: { es: 'Filtros', en: 'Filters' },
	range: { es: 'Periodo', en: 'Period' },
	r7: { es: '7 días', en: '7 days' },
	r30: { es: '30 días', en: '30 days' },
	r90: { es: '90 días', en: '90 days' },
	rall: { es: 'Todo', en: 'All' },
	other: { es: 'Otros', en: 'Other' },
	rows: { es: 'filas', en: 'rows' },
	filterTable: { es: 'Filtrar tabla…', en: 'Filter table…' },
	noData: { es: 'Sin datos para estos filtros.', en: 'No data for these filters.' },
	clickToFilter: { es: 'Clic para filtrar', en: 'Click to filter' },
	back: { es: 'Todos los artifacts', en: 'All artifacts' },
	editor: { es: 'Editor de tablero', en: 'Dashboard editor' },
	basics: { es: 'Datos básicos', en: 'Basics' },
	sources: { es: 'Fuentes de datos', en: 'Data sources' },
	widgets: { es: 'Bloques', en: 'Widgets' },
	preview: { es: 'Vista previa', en: 'Preview' },
	json: { es: 'JSON', en: 'JSON' },
	apply: { es: 'Aplicar JSON', en: 'Apply JSON' },
	addSource: { es: 'Agregar fuente', en: 'Add source' },
	addFilter: { es: 'Agregar filtro', en: 'Add filter' },
	addWidget: { es: 'Agregar bloque', en: 'Add widget' },
	saved: { es: 'Tablero guardado', en: 'Dashboard saved' },
	deleted: { es: 'Tablero eliminado', en: 'Dashboard deleted' },
	confirmDelete: { es: '¿Eliminar este tablero? Queda en el historial de git.', en: 'Delete this dashboard? It stays in git history.' },
	problems: { es: 'Por corregir', en: 'To fix' },
	unsaved: { es: 'Cambios sin guardar', en: 'Unsaved changes' },
	viewData: { es: 'Ver tabla de datos', en: 'View data table' },
	errorSource: { es: 'Fuente con error', en: 'Source error' },
	seriesCapped: { es: 'Se muestran las 6 series mayores.', en: 'Showing the 6 largest series.' }
} satisfies Record<string, L10n>;

export type Key = keyof typeof S;

export const i18n = $state<{ lang: Lang }>({ lang: 'es' });

export const t = (k: Key) => S[k][i18n.lang];
export const tl = (v?: L10n | null, fb = '') => (v ? v[i18n.lang] || v.es || v.en : fb);

export function setLang(l: Lang) {
	i18n.lang = l;
	document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
	document.documentElement.lang = l;
	try { localStorage.setItem('orca-lang', l); } catch { /* private mode */ }
}

const locale = () => (i18n.lang === 'es' ? 'es-MX' : 'en-US');
export function fmtDate(v?: string) {
	if (!v) return '';
	const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T12:00:00') : new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	return d.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz.zone });
}
export function fmtNum(n: number, format?: string) {
	if (format === 'mxn') return n.toLocaleString(locale(), { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
	if (format === 'usd') return n.toLocaleString(locale(), { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
	if (format === 'percent') return (n / 100).toLocaleString(locale(), { style: 'percent', maximumFractionDigits: 1 });
	const abs = Math.abs(n);
	return n.toLocaleString(locale(), { maximumFractionDigits: abs >= 100 ? 0 : abs >= 10 ? 1 : 2 });
}
export const loc = locale;

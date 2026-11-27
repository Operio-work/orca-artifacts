import type { LayoutServerLoad } from './$types';
import { BRAND } from '#lib/server/config.js';
export const load: LayoutServerLoad = ({ locals }) => ({ lang: locals.lang, user: locals.user, userName: locals.userName, brand: BRAND });

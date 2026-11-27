import { redirect } from '@sveltejs/kit';
import { BASE } from '#lib/base.js';
export const GET = () => redirect(302, `${BASE}/?kind=dashboard`);

import type { Lang } from '#lib/types.js';

declare global {
	namespace App {
		interface Locals {
			user: string; // from the sign-in mode (ARTIFACTS_AUTH), or "local"
			userName: string;
			lang: Lang;
		}
	}
}
export {};

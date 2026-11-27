import type { Lang } from '#lib/types.js';

declare global {
	namespace App {
		interface Locals {
			user: string; // from the sign-in mode (ARTIFACTS_AUTH), or "local"
			userName: string;
			lang: Lang;
			role: import('#lib/server/identity.js').Role | 'admin'; // 'admin' outside ARTIFACTS_AUTH=orca
			canEdit: boolean; // may approve, organize and edit (viewers only look)
		}
	}
}
export {};

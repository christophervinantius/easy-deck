import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
	return json({ user: locals.user || null });
}

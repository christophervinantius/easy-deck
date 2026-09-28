import { json } from '@sveltejs/kit';
import { deleteSession } from '../../../../server/auth.js';

export async function POST({ cookies }) {
	const sessionId = cookies.get('session');
	if (sessionId) {
		await deleteSession(sessionId);
		cookies.delete('session', { path: '/' });
	}

	return json({ success: true });
}

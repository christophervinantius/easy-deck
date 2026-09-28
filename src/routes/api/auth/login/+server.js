import { json } from '@sveltejs/kit';
import { sql } from '../../../../server/db.js';
import { ensureAuthSchema, verifyPassword, createSession } from '../../../../server/auth.js';

export async function POST({ request, cookies }) {
	try {
		await ensureAuthSchema();
		const body = await request.json();
		const username = (body.username || body.email)?.trim();
		const password = body.password;

		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		// Support logging in with username (or email fallback)
		const users = await sql`
			SELECT id, username, email, password_hash FROM users
			WHERE LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${username})
			LIMIT 1
		`;

		if (users.length === 0) {
			return json({ error: 'Invalid username or password' }, { status: 401 });
		}

		const user = users[0];
		const isValid = await verifyPassword(password, user.password_hash);
		if (!isValid) {
			return json({ error: 'Invalid username or password' }, { status: 401 });
		}

		const { sessionId } = await createSession(user.id);

		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 30
		});

		return json({
			success: true,
			user: {
				id: user.id,
				email: user.email,
				username: user.username || user.email
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		return json({ error: error.message || 'Login failed' }, { status: 500 });
	}
}

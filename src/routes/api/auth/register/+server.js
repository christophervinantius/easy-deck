import { json } from '@sveltejs/kit';
import { sql } from '../../../../server/db.js';
import { ensureAuthSchema, hashPassword, createSession } from '../../../../server/auth.js';

export async function POST({ request, cookies }) {
	try {
		await ensureAuthSchema();
		const body = await request.json();
		const username = body.username?.trim();
		const email = body.email?.trim()?.toLowerCase();
		const password = body.password;

		if (!username || !email || !password) {
			return json({ error: 'Username, email, and password are required' }, { status: 400 });
		}

		if (username.length < 3 || username.length > 30) {
			return json({ error: 'Username must be between 3 and 30 characters' }, { status: 400 });
		}

		if (!/^[a-zA-Z0-9_]+$/.test(username)) {
			return json(
				{ error: 'Username can only contain letters, numbers, and underscores' },
				{ status: 400 }
			);
		}

		// Email format validation
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return json({ error: 'Please enter a valid email address' }, { status: 400 });
		}

		if (password.length < 6) {
			return json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
		}

		// Check if username is already taken
		const existingUsername = await sql`
			SELECT id FROM users WHERE LOWER(username) = LOWER(${username}) LIMIT 1
		`;

		if (existingUsername.length > 0) {
			return json({ error: 'This username is already taken' }, { status: 409 });
		}

		// Check if email already exists
		const existingEmail = await sql`
			SELECT id FROM users WHERE email = ${email} LIMIT 1
		`;

		if (existingEmail.length > 0) {
			return json({ error: 'An account with this email already exists' }, { status: 409 });
		}

		const passwordHash = await hashPassword(password);
		const userResult = await sql`
			INSERT INTO users (username, email, password_hash)
			VALUES (${username}, ${email}, ${passwordHash})
			RETURNING id, username, email, created_at
		`;

		const user = userResult[0];
		const { sessionId } = await createSession(user.id);

		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 30
		});

		return json(
			{
				success: true,
				user: {
					id: user.id,
					email: user.email,
					username: user.username
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Registration error:', error);
		return json({ error: error.message || 'Registration failed' }, { status: 500 });
	}
}

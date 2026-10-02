import { sql } from './db.js';
import bcrypt from 'bcryptjs';

let schemaInitialized = false;

export async function ensureAuthSchema() {
	if (schemaInitialized) return;

	try {
		await sql`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT,
				email TEXT UNIQUE NOT NULL,
				password_hash TEXT NOT NULL,
				created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
			)
		`;
	} catch (err) {
		console.error('Error ensuring users table:', err);
	}

	try {
		await sql`
			ALTER TABLE users 
			ADD COLUMN IF NOT EXISTS username TEXT
		`;
	} catch (err) {
		console.error('Error adding username column:', err);
	}

	try {
		await sql`
			CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (LOWER(username))
		`;
	} catch (err) {
		// Index might already exist, ignore
	}

	try {
		await sql`
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				expires_at TIMESTAMPTZ NOT NULL
			)
		`;
	} catch (err) {
		console.error('Error ensuring sessions table:', err);
	}

	// Migrate sessions.user_id to TEXT if it was previously created as BIGINT
	try {
		await sql`
			ALTER TABLE sessions 
			ALTER COLUMN user_id TYPE TEXT USING user_id::text
		`;
	} catch (err) {
		// Ignore if already TEXT
	}

	try {
		await sql`
			CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)
		`;
	} catch (err) {
		// Index might already exist, ignore
	}

	try {
		await sql`
			CREATE TABLE IF NOT EXISTS decks (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				user_id TEXT NOT NULL,
				title VARCHAR(100) NOT NULL,
				enable_srs BOOLEAN DEFAULT FALSE,
				created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
				deleted_at TIMESTAMPTZ DEFAULT NULL
			)
		`;
	} catch (err) {
		console.error('Error ensuring decks table:', err);
	}

	try {
		await sql`
			ALTER TABLE decks 
			ADD COLUMN IF NOT EXISTS enable_srs BOOLEAN DEFAULT FALSE
		`;
	} catch (err) {
		// Ignore if already exists
	}

	try {
		await sql`
			CREATE INDEX IF NOT EXISTS idx_decks_user 
			ON decks (user_id) 
			WHERE deleted_at IS NULL
		`;
	} catch (err) {
		// Ignore if already exists
	}

	try {
		await sql`
			ALTER TABLE cards 
			ADD COLUMN IF NOT EXISTS deck_id UUID REFERENCES decks(id) ON DELETE CASCADE
		`;
	} catch (err) {
		// Ignore if already exists
	}

	try {
		await sql`
			ALTER TABLE cards 
			ADD COLUMN IF NOT EXISTS translation_pronunciation TEXT
		`;
	} catch (err) {
		// Ignore if already exists
	}

	try {
		await sql`
			ALTER TABLE cards 
			ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
		`;
	} catch (err) {
		// Ignore if already exists
	}

	try {
		await sql`
			CREATE TABLE IF NOT EXISTS practice_sessions (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				user_id TEXT NOT NULL,
				deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
				deck_title VARCHAR(100),
				title VARCHAR(200),
				sentences JSONB NOT NULL,
				style VARCHAR(50) DEFAULT 'casual',
				current_index INT DEFAULT 0,
				show_pronunciation BOOLEAN DEFAULT TRUE,
				is_completed BOOLEAN DEFAULT FALSE,
				created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
				deleted_at TIMESTAMPTZ DEFAULT NULL
			)
		`;
	} catch (err) {
		console.error('Error ensuring practice_sessions table:', err);
	}

	try {
		await sql`
			ALTER TABLE practice_sessions 
			ADD COLUMN IF NOT EXISTS style VARCHAR(50) DEFAULT 'casual'
		`;
	} catch (err) {
		// Ignore if already exists
	}

	try {
		await sql`
			CREATE INDEX IF NOT EXISTS idx_practice_sessions_user 
			ON practice_sessions (user_id) 
			WHERE deleted_at IS NULL
		`;
	} catch (err) {
		// Ignore if already exists
	}

	schemaInitialized = true;
}

export async function hashPassword(password) {
	return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, stored) {
	if (!stored) return false;
	// Backward compatibility fallback in case stored hash was created with PBKDF2 (salt:hash)
	if (stored.includes(':')) {
		const [saltHex, originalHashHex] = stored.split(':');
		if (!saltHex || !originalHashHex) return false;
		const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
		const enc = new TextEncoder();
		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			enc.encode(password),
			{ name: 'PBKDF2' },
			false,
			['deriveBits']
		);
		const derivedBits = await crypto.subtle.deriveBits(
			{
				name: 'PBKDF2',
				salt: salt,
				iterations: 100000,
				hash: 'SHA-256'
			},
			keyMaterial,
			256
		);
		const hashHex = Array.from(new Uint8Array(derivedBits))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
		return hashHex === originalHashHex;
	}

	return await bcrypt.compare(password, stored);
}

export async function createSession(userId) {
	await ensureAuthSchema();
	const sessionId = crypto.randomUUID();
	// 30 days expiry
	const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

	await sql`
		INSERT INTO sessions (id, user_id, expires_at)
		VALUES (${sessionId}, ${String(userId)}, ${expiresAt.toISOString()})
	`;

	return { sessionId, expiresAt };
}

export async function validateSession(sessionId) {
	if (!sessionId) return null;
	await ensureAuthSchema();

	const rows = await sql`
		SELECT s.id as session_id, s.expires_at, u.id as user_id, u.email, u.username
		FROM sessions s
		JOIN users u ON s.user_id = u.id::text
		WHERE s.id = ${sessionId}
		LIMIT 1
	`;

	if (rows.length === 0) return null;

	const session = rows[0];
	if (new Date(session.expires_at) < new Date()) {
		await deleteSession(sessionId);
		return null;
	}

	return {
		session: {
			id: session.session_id,
			expires_at: session.expires_at
		},
		user: {
			id: session.user_id,
			email: session.email,
			username: session.username || null
		}
	};
}

export async function deleteSession(sessionId) {
	if (!sessionId) return;
	await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

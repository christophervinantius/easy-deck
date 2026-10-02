import { json } from '@sveltejs/kit';
import { sql } from '../../../server/db.js';
import { ensureAuthSchema } from '../../../server/auth.js';

// GET /api/decks - List all active decks for the current user
export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();

		const decks = await sql`
			SELECT 
				d.id, d.title, d.enable_srs, d.created_at,
				COUNT(c.id)::int AS card_count
			FROM decks d
			LEFT JOIN cards c ON c.deck_id = d.id
			WHERE d.user_id::text = ${String(locals.user.id)}
			  AND d.deleted_at IS NULL
			GROUP BY d.id
			ORDER BY d.created_at DESC, d.id DESC
		`;

		return json(decks);
	} catch (error) {
		console.error('Error fetching decks:', error);
		return json({ error: error.message || 'Failed to fetch decks' }, { status: 500 });
	}
}

// POST /api/decks - Create a new deck for the current user
export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const body = await request.json();
		const title = body.title?.trim();
		const enable_srs = Boolean(body.enable_srs);

		if (!title) {
			return json(
				{ error: 'Deck title is required' },
				{ status: 400 }
			);
		}

		const result = await sql`
			INSERT INTO decks (user_id, title, enable_srs)
			VALUES (
				${String(locals.user.id)},
				${title},
				${enable_srs}
			)
			RETURNING *
		`;

		return json({ ...result[0], card_count: 0 }, { status: 201 });
	} catch (error) {
		console.error('Error creating deck:', error);
		return json({ error: error.message || 'Failed to create deck' }, { status: 500 });
	}
}

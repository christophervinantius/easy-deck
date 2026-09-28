import { json } from '@sveltejs/kit';
import { sql } from '../../../../server/db.js';
import { ensureAuthSchema } from '../../../../server/auth.js';

// GET /api/decks/[id] - Get a single deck with cards
export async function GET({ params, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;

		const result = await sql`
			SELECT 
				d.id, d.title, d.created_at,
				COUNT(c.id)::int AS card_count
			FROM decks d
			LEFT JOIN cards c ON c.deck_id = d.id
			WHERE d.id::text = ${id}
			  AND d.user_id::text = ${String(locals.user.id)}
			  AND d.deleted_at IS NULL
			GROUP BY d.id
			LIMIT 1
		`;

		if (result.length === 0) {
			return json({ error: 'Deck not found' }, { status: 404 });
		}

		return json(result[0]);
	} catch (error) {
		console.error('Error fetching deck:', error);
		return json({ error: error.message || 'Failed to fetch deck' }, { status: 500 });
	}
}

// PUT /api/decks/[id] - Update deck title
export async function PUT({ params, request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;
		const body = await request.json();
		const { title } = body;

		const result = await sql`
			UPDATE decks
			SET
				title = COALESCE(${title || null}, title)
			WHERE id::text = ${id}
			  AND user_id::text = ${String(locals.user.id)}
			  AND deleted_at IS NULL
			RETURNING *
		`;

		if (result.length === 0) {
			return json({ error: 'Deck not found' }, { status: 404 });
		}

		return json(result[0]);
	} catch (error) {
		console.error('Error updating deck:', error);
		return json({ error: error.message || 'Failed to update deck' }, { status: 500 });
	}
}

// DELETE /api/decks/[id] - Soft delete a deck
export async function DELETE({ params, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;

		const result = await sql`
			UPDATE decks
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id::text = ${id}
			  AND user_id::text = ${String(locals.user.id)}
			  AND deleted_at IS NULL
			RETURNING id
		`;

		if (result.length === 0) {
			return json({ error: 'Deck not found' }, { status: 404 });
		}

		return json({ success: true, id: result[0].id });
	} catch (error) {
		console.error('Error deleting deck:', error);
		return json({ error: error.message || 'Failed to delete deck' }, { status: 500 });
	}
}

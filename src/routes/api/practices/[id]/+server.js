import { json } from '@sveltejs/kit';
import { sql } from '../../../../server/db.js';
import { ensureAuthSchema } from '../../../../server/auth.js';

// GET /api/practices/[id] - Get a single practice session with all sentences
export async function GET({ params, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;

		const result = await sql`
			SELECT 
				p.id,
				p.deck_id,
				COALESCE(d.title, p.deck_title, 'Deck') AS deck_title,
				p.title,
				p.style,
				p.sentences,
				p.current_index,
				p.show_pronunciation,
				p.is_completed,
				jsonb_array_length(p.sentences)::int AS total_sentences,
				p.created_at,
				p.updated_at
			FROM practice_sessions p
			LEFT JOIN decks d ON d.id = p.deck_id
			WHERE p.id::text = ${id}
			  AND p.user_id::text = ${String(locals.user.id)}
			  AND p.deleted_at IS NULL
			LIMIT 1
		`;

		if (result.length === 0) {
			return json({ error: 'Practice session not found' }, { status: 404 });
		}

		return json(result[0]);
	} catch (error) {
		console.error('Error fetching practice session:', error);
		return json({ error: error.message || 'Failed to fetch practice session' }, { status: 500 });
	}
}

// PUT /api/practices/[id] - Update practice session progress/status
export async function PUT({ params, request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;
		const body = await request.json();

		const session = await sql`
			SELECT id, current_index, is_completed, title, style
			FROM practice_sessions
			WHERE id::text = ${id}
			  AND user_id::text = ${String(locals.user.id)}
			  AND deleted_at IS NULL
			LIMIT 1
		`;

		if (session.length === 0) {
			return json({ error: 'Practice session not found' }, { status: 404 });
		}

		const newIndex = 'current_index' in body ? parseInt(body.current_index, 10) || 0 : session[0].current_index;
		const newCompleted = 'is_completed' in body ? Boolean(body.is_completed) : session[0].is_completed;
		const newTitle = 'title' in body && body.title?.trim() ? body.title.trim() : session[0].title;
		const newStyle = 'style' in body && body.style?.trim() ? body.style.trim() : (session[0].style || 'casual');

		const result = await sql`
			UPDATE practice_sessions
			SET
				current_index = ${newIndex},
				is_completed = ${newCompleted},
				title = ${newTitle},
				style = ${newStyle},
				updated_at = CURRENT_TIMESTAMP
			WHERE id::text = ${id}
			  AND user_id::text = ${String(locals.user.id)}
			  AND deleted_at IS NULL
			RETURNING *
		`;

		return json(result[0]);
	} catch (error) {
		console.error('Error updating practice session:', error);
		return json({ error: error.message || 'Failed to update practice session' }, { status: 500 });
	}
}

// DELETE /api/practices/[id] - Soft delete a practice session
export async function DELETE({ params, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;

		const result = await sql`
			UPDATE practice_sessions
			SET deleted_at = CURRENT_TIMESTAMP
			WHERE id::text = ${id}
			  AND user_id::text = ${String(locals.user.id)}
			  AND deleted_at IS NULL
			RETURNING id
		`;

		if (result.length === 0) {
			return json({ error: 'Practice session not found' }, { status: 404 });
		}

		return json({ success: true, id: result[0].id });
	} catch (error) {
		console.error('Error deleting practice session:', error);
		return json({ error: error.message || 'Failed to delete practice session' }, { status: 500 });
	}
}

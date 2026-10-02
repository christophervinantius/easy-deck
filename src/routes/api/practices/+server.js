import { json } from '@sveltejs/kit';
import { sql } from '../../../server/db.js';
import { ensureAuthSchema } from '../../../server/auth.js';

// GET /api/practices - List all active saved practice sessions for the current user
export async function GET({ locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();

		const sessions = await sql`
			SELECT 
				p.id,
				p.deck_id,
				COALESCE(d.title, p.deck_title, 'Deck') AS deck_title,
				p.title,
				p.style,
				p.current_index,
				p.show_pronunciation,
				p.is_completed,
				jsonb_array_length(p.sentences)::int AS total_sentences,
				p.created_at,
				p.updated_at
			FROM practice_sessions p
			LEFT JOIN decks d ON d.id = p.deck_id
			WHERE p.user_id::text = ${String(locals.user.id)}
			  AND p.deleted_at IS NULL
			ORDER BY p.updated_at DESC, p.created_at DESC
		`;

		return json(sessions);
	} catch (error) {
		console.error('Error fetching practice sessions:', error);
		return json({ error: error.message || 'Failed to fetch practice sessions' }, { status: 500 });
	}
}

// POST /api/practices - Save a new practice session
export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const body = await request.json();
		const {
			deck_id,
			deck_title = 'Deck',
			title,
			style = 'casual',
			sentences = [],
			current_index = 0,
			show_pronunciation = true,
			is_completed = false
		} = body;

		if (!Array.isArray(sentences) || sentences.length === 0) {
			return json({ error: 'Sentences are required to save a session' }, { status: 400 });
		}

		const sessionTitle =
			title?.trim() ||
			`${deck_title} Practice (${sentences.length} sentences)`;

		const isValidUuid =
			typeof deck_id === 'string' &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deck_id);
		const sanitizedDeckId = isValidUuid ? deck_id : null;

		const result = await sql`
			INSERT INTO practice_sessions (
				user_id,
				deck_id,
				deck_title,
				title,
				style,
				sentences,
				current_index,
				show_pronunciation,
				is_completed
			)
			VALUES (
				${String(locals.user.id)},
				${sanitizedDeckId},
				${deck_title},
				${sessionTitle},
				${style},
				${JSON.stringify(sentences)}::jsonb,
				${parseInt(current_index, 10) || 0},
				${Boolean(show_pronunciation)},
				${Boolean(is_completed)}
			)
			RETURNING *
		`;

		return json(result[0], { status: 201 });
	} catch (error) {
		console.error('Error saving practice session:', error);
		return json({ error: error.message || 'Failed to save practice session' }, { status: 500 });
	}
}

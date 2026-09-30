import { json } from '@sveltejs/kit';
import { sql } from '../../../../server/db.js';
import { ensureAuthSchema } from '../../../../server/auth.js';

// GET /api/cards/[id] - Fetch a single card by ID for current user
export async function GET({ params, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;

		const result = await sql`
			SELECT 
				c.id, c.original_word, c.pronunciation, c.translation, c.translation_pronunciation, c.deck_id, c.created_at,
				d.title as deck_title
			FROM cards c
			JOIN decks d ON c.deck_id = d.id
			WHERE c.id::text = ${id} 
			  AND d.user_id::text = ${String(locals.user.id)}
			  AND d.deleted_at IS NULL
			LIMIT 1
		`;

		if (result.length === 0) {
			return json({ error: 'Card not found' }, { status: 404 });
		}

		return json(result[0]);
	} catch (error) {
		console.error('Error fetching card:', error);
		return json({ error: error.message || 'Failed to fetch card' }, { status: 500 });
	}
}

// PUT /api/cards/[id] - Update a card by ID for current user
export async function PUT({ params, request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;
		const body = await request.json();
		const { original_word, pronunciation, translation, translation_pronunciation, deck_id } = body;

		if (!original_word || !translation) {
			return json(
				{ error: 'original_word and translation are required' },
				{ status: 400 }
			);
		}

		// Check for case-insensitive duplicate original_word across the user's cards (excluding current card)
		const trimmedWord = original_word.trim();
		const duplicateCheck = await sql`
			SELECT c.id, c.original_word, d.title as deck_title
			FROM cards c
			JOIN decks d ON c.deck_id = d.id
			WHERE d.user_id::text = ${String(locals.user.id)}
			  AND d.deleted_at IS NULL
			  AND c.id::text != ${id}
			  AND LOWER(TRIM(c.original_word)) = LOWER(${trimmedWord})
			LIMIT 1
		`;

		if (duplicateCheck.length > 0) {
			return json(
				{ 
					error: `A card with the word/phrase "${duplicateCheck[0].original_word}" already exists in deck "${duplicateCheck[0].deck_title}".` 
				},
				{ status: 400 }
			);
		}

		const result = await sql`
			UPDATE cards
			SET
				original_word = ${original_word},
				pronunciation = ${pronunciation || null},
				translation = ${translation},
				translation_pronunciation = ${translation_pronunciation || null},
				deck_id = COALESCE(${deck_id || null}, cards.deck_id)
			FROM decks d
			WHERE cards.id::text = ${id}
			  AND cards.deck_id = d.id
			  AND d.user_id::text = ${String(locals.user.id)}
			  AND d.deleted_at IS NULL
			RETURNING 
				cards.id, cards.original_word, cards.pronunciation, cards.translation, cards.translation_pronunciation, cards.deck_id, cards.created_at,
				d.title as deck_title
		`;

		if (result.length === 0) {
			return json({ error: 'Card not found' }, { status: 404 });
		}

		return json(result[0]);
	} catch (error) {
		console.error('Error updating card:', error);
		return json({ error: error.message || 'Failed to update card' }, { status: 500 });
	}
}

// DELETE /api/cards/[id] - Delete a card by ID for current user
export async function DELETE({ params, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const { id } = params;

		const result = await sql`
			DELETE FROM cards
			WHERE id::text = ${id}
			  AND deck_id IN (
				SELECT id FROM decks 
				WHERE user_id::text = ${String(locals.user.id)}
				  AND deleted_at IS NULL
			  )
			RETURNING id
		`;

		if (result.length === 0) {
			return json({ error: 'Card not found' }, { status: 404 });
		}

		return json({ success: true, id: result[0].id });
	} catch (error) {
		console.error('Error deleting card:', error);
		return json({ error: error.message || 'Failed to delete card' }, { status: 500 });
	}
}

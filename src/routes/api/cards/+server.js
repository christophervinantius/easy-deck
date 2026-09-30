import { json } from '@sveltejs/kit';
import { sql } from '../../../server/db.js';
import { ensureAuthSchema } from '../../../server/auth.js';

// GET /api/cards - Fetch cards for the current user (optionally filtered by deck_id)
export async function GET({ url, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const deckId = url.searchParams.get('deck_id');

		let cards;
		if (deckId) {
			cards = await sql`
				SELECT 
					c.id, c.original_word, c.pronunciation, c.translation, c.translation_pronunciation, c.deck_id, c.created_at,
					d.title as deck_title
				FROM cards c
				JOIN decks d ON c.deck_id = d.id
				WHERE c.deck_id::text = ${deckId}
				  AND d.user_id::text = ${String(locals.user.id)}
				  AND d.deleted_at IS NULL
				ORDER BY c.created_at DESC, c.id DESC
			`;
		} else {
			cards = await sql`
				SELECT 
					c.id, c.original_word, c.pronunciation, c.translation, c.translation_pronunciation, c.deck_id, c.created_at,
					d.title as deck_title
				FROM cards c
				JOIN decks d ON c.deck_id = d.id
				WHERE d.user_id::text = ${String(locals.user.id)}
				  AND d.deleted_at IS NULL
				ORDER BY c.created_at DESC, c.id DESC
			`;
		}

		return json(cards);
	} catch (error) {
		console.error('Error fetching cards:', error);
		return json({ error: error.message || 'Failed to fetch cards' }, { status: 500 });
	}
}

// POST /api/cards - Create a new card for the current user
export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	try {
		await ensureAuthSchema();
		const body = await request.json();
		let { original_word, pronunciation, translation, translation_pronunciation, deck_id } = body;

		if (!original_word || !translation) {
			return json(
				{ error: 'original_word and translation are required' },
				{ status: 400 }
			);
		}

		// Check for case-insensitive duplicate original_word across the user's cards
		const trimmedWord = original_word.trim();
		const duplicateCheck = await sql`
			SELECT c.id, c.original_word, d.title as deck_title
			FROM cards c
			JOIN decks d ON c.deck_id = d.id
			WHERE d.user_id::text = ${String(locals.user.id)}
			  AND d.deleted_at IS NULL
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

		// If deck_id is provided, verify it belongs to this user
		if (deck_id) {
			const deckCheck = await sql`
				SELECT id, title
				FROM decks
				WHERE id::text = ${String(deck_id)}
				  AND user_id::text = ${String(locals.user.id)}
				  AND deleted_at IS NULL
				LIMIT 1
			`;
			if (deckCheck.length === 0) {
				return json({ error: 'Selected deck not found' }, { status: 404 });
			}
		} else {
			// If no deck_id is specified, find or create a default deck for this user
			const userDecks = await sql`
				SELECT id FROM decks 
				WHERE user_id::text = ${String(locals.user.id)}
				  AND deleted_at IS NULL
				ORDER BY created_at ASC
				LIMIT 1
			`;

			if (userDecks.length > 0) {
				deck_id = userDecks[0].id;
			} else {
				// Create a default deck
				const newDeck = await sql`
					INSERT INTO decks (user_id, title)
					VALUES (
						${String(locals.user.id)}, 
						'Default Deck'
					)
					RETURNING id
				`;
				deck_id = newDeck[0].id;
			}
		}

		// Insert card with deck_id
		const result = await sql`
			INSERT INTO cards (
				original_word,
				pronunciation,
				translation,
				translation_pronunciation,
				deck_id
			) VALUES (
				${original_word},
				${pronunciation || null},
				${translation},
				${translation_pronunciation || null},
				${deck_id}
			)
			RETURNING *
		`;

		// Fetch the inserted card joined with deck info
		const cardWithDeck = await sql`
			SELECT 
				c.id, c.original_word, c.pronunciation, c.translation, c.translation_pronunciation, c.deck_id, c.created_at,
				d.title as deck_title
			FROM cards c
			JOIN decks d ON c.deck_id = d.id
			WHERE c.id::text = ${String(result[0].id)}
			LIMIT 1
		`;

		return json(cardWithDeck[0], { status: 201 });
	} catch (error) {
		console.error('Error creating card:', error);
		return json({ error: error.message || 'Failed to create card' }, { status: 500 });
	}
}

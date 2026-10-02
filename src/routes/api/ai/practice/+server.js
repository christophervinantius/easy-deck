import { json } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import { sql } from '../../../../server/db.js';
import { ensureAuthSchema } from '../../../../server/auth.js';

function cleanJsonText(text) {
	if (!text) return [];
	let cleaned = text.trim();
	if (cleaned.startsWith('```json')) {
		cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
	} else if (cleaned.startsWith('```')) {
		cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
	}
	return JSON.parse(cleaned);
}

// Helper function to call Gemini with candidate models (trying SDK first, then REST)
async function requestGemini(prompt, candidateModels, apiKey, ai) {
	let generatedText = null;
	let lastError = null;

	for (const model of candidateModels) {
		try {
			// 1. Try SDK call
			const response = await ai.models.generateContent({
				model,
				contents: prompt,
				config: {
					responseMimeType: 'application/json',
					temperature: 0.7
				}
			});

			if (response && response.text) {
				generatedText = response.text;
				console.log(`Successfully generated content using model: ${model}`);
				break;
			}
		} catch (err) {
			lastError = err;
			console.warn(`Model ${model} via SDK failed (${err.message}), trying direct REST...`);

			// 2. Fallback to direct REST API call for this model
			try {
				const restRes = await fetch(
					`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							contents: [{ parts: [{ text: prompt }] }],
							generationConfig: {
								responseMimeType: 'application/json',
								temperature: 0.7
							}
						})
					}
				);

				if (restRes.ok) {
					const restData = await restRes.json();
					const text = restData.candidates?.[0]?.content?.parts?.[0]?.text;
					if (text) {
						generatedText = text;
						console.log(`Successfully generated content via REST using model: ${model}`);
						break;
					}
				} else {
					const restErrText = await restRes.text();
					console.warn(`Direct REST for ${model} failed (${restRes.status}):`, restErrText);
				}
			} catch (restErr) {
				console.warn(`REST attempt for ${model} failed:`, restErr.message);
			}
		}
	}

	if (!generatedText) {
		throw lastError || new Error('No response received from Gemini models');
	}

	return cleanJsonText(generatedText);
}

// POST /api/ai/practice - Generate SRS practice sentences for a deck using Gemini
export async function POST({ request, locals }) {
	if (!locals.user) {
		return json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
	}

	const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
	if (!apiKey) {
		return json(
			{ error: 'GEMINI_API_KEY is not configured. Please add it to your environment variables.' },
			{ status: 500 }
		);
	}

	try {
		await ensureAuthSchema();
		const body = await request.json();
		const { deck_id, sentence_count = 10, show_pronunciation = true, style = 'casual' } = body;

		if (!deck_id) {
			return json({ error: 'deck_id is required' }, { status: 400 });
		}

		// Clamp sentence count between 3 and 30
		const count = Math.min(30, Math.max(3, parseInt(sentence_count, 10) || 3));

		// Sentence style instruction prompts
		const STYLE_PROMPTS = {
			casual: 'Casual & Daily Conversation: Everyday, natural spoken expressions used with friends, family, or in relaxed informal settings.',
			formal: 'Formal & Business: Polite, courteous, and workplace-appropriate language suitable for business meetings, polite requests, and professional interactions.',
			travel: 'Travel & Dining: Practical, real-world situations like navigating public transport, ordering at restaurants or cafes, airport check-in, hotels, and asking for directions.',
			story: 'Story & Narrative: Engaging, expressive sentences with descriptive actions, emotions, or short narrative moments that paint a vivid scene.',
			humorous: 'Humorous & Playful: Fun, witty, or slightly quirky everyday scenarios that make the vocabulary memorable, lighthearted, and enjoyable.',
			simple: 'Short & Simple: Clear, concise sentences with straightforward grammar and simple phrasing, ideal for beginner or quick reinforcement.'
		};

		const chosenStylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.casual;

		// Verify deck ownership and fetch cards
		const deck = await sql`
			SELECT id, title, enable_srs
			FROM decks
			WHERE id::text = ${String(deck_id)}
			  AND user_id::text = ${String(locals.user.id)}
			  AND deleted_at IS NULL
			LIMIT 1
		`;

		if (deck.length === 0) {
			return json({ error: 'Deck not found' }, { status: 404 });
		}

		if (!deck[0].enable_srs) {
			return json(
				{ error: 'SRS Practice is not enabled for this deck. You can enable it by editing the deck.' },
				{ status: 400 }
			);
		}

		const cards = await sql`
			SELECT id, original_word, pronunciation, translation, translation_pronunciation
			FROM cards
			WHERE deck_id::text = ${String(deck_id)}
			ORDER BY id ASC
		`;

		if (cards.length === 0) {
			return json(
				{ error: 'This deck has no cards yet. Add some words first to generate practice sentences!' },
				{ status: 400 }
			);
		}

		// Prepare vocabulary list for Gemini (if more than 50 cards, shuffle and pick up to 50 to keep prompt responsive)
		let poolCards = [...cards];
		// Randomize order so different words are highlighted across sessions
		for (let i = poolCards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[poolCards[i], poolCards[j]] = [poolCards[j], poolCards[i]];
		}
		if (poolCards.length > 50) {
			poolCards = poolCards.slice(0, 50);
		}

		const vocabList = poolCards
			.map(
				(c) =>
					`- "${c.original_word}" (meaning: "${c.translation}"${c.pronunciation ? `, pronunciation: "${c.pronunciation}"` : ''})`
			)
			.join('\n');

		const prompt = `
You are an expert language teacher and curriculum designer.
A student wants to practice vocabulary words/phrases from their deck titled "${deck.title}".

Here is a list of target words/phrases from the deck:
${vocabList}

TASK:
Generate an array of EXACTLY ${count} natural, engaging practice sentences using words from the list above.

STRICT QUANTITY REQUIREMENT:
- You MUST generate EXACTLY ${count} items.
- Include an "index" field on each item from 1 up to ${count}.
- DO NOT stop early. Continue generating sentences until the array contains EXACTLY ${count} items.

CONTENT REQUIREMENTS:
1. Select and feature vocabulary words/phrases from the provided list in the practice sentences.
   - NOTE: You DO NOT need to include all words from the vocabulary list. Not all words are required to appear.
   - Each sentence should naturally incorporate one or more words from the vocabulary list.
   - Do NOT force unnatural or awkward combinations. Sentences should feel authentic, conversational, and contextually rich in the target language (the language of the original words).
2. TONE & SENTENCE STYLE:
   - Target Style: ${chosenStylePrompt}
   - Embody this requested style naturally in the scenarios, vocabulary choices, and expressions across all ${count} practice sentences.
3. For each sentence, provide:
   - "index": Number from 1 to ${count}
   - "sentence": The full natural sentence in the target language.
${
	show_pronunciation
		? '   - "pronunciation": Pronunciation guide (e.g. Pinyin, Romaji, Kana/Furigana, or phonetic guide) if applicable to the target language (especially for non-Latin scripts like Japanese, Chinese, Korean, Russian, Arabic, etc.). If the target language uses the standard Latin alphabet with standard reading (e.g. English, Spanish), leave as null.'
		: '   - "pronunciation": Always set to null (pronunciation is disabled).'
}
   - "translation": The natural translation of the sentence into the language of the provided card translations.
   - "translation_pronunciation": Pronunciation of the translation if relevant, otherwise null.
   - "covered_words": An array of the exact original words/phrases from the vocabulary list that are included in this sentence.

Return ONLY a valid JSON array of objects with no extraneous text or wrapping:
[
  {
    "index": 1,
    "sentence": "...",
    "pronunciation": "...",
    "translation": "...",
    "translation_pronunciation": null,
    "covered_words": ["word1"]
  }
]
`;

		// Query available models from the Google API for this key
		let candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
		try {
			const listRes = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
			);
			if (listRes.ok) {
				const listData = await listRes.json();

				// Filter out known retired models (e.g. 1.5 series, 2.5-pro)
				const retired = ['gemini-1.5', 'gemini-2.5-pro', 'gemini-1.0'];
				const activeAvailable = (listData.models || [])
					.filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
					.map((m) => m.name.replace(/^models\//, ''))
					.filter((name) => !retired.some((r) => name.includes(r)));

				console.log('Active Gemini models for this key:', activeAvailable);

				const flashPreferred = [
					'gemini-3.8-flash',
					'gemini-3.5-flash-lite',
					'gemini-3-flash',
					'gemini-flash-latest',
					'gemini-2.0-flash'
				];

				// 1. Matched preferred Flash models
				const matchedFlash = flashPreferred.filter((p) => activeAvailable.includes(p));

				// 2. Any other active models with "flash" in the name
				const otherFlash = activeAvailable.filter(
					(a) => a.includes('flash') && !matchedFlash.includes(a)
				);

				// 3. Pro / general models as fallbacks
				const nonFlashFallbacks = [
					'gemini-3.1-pro-preview',
					'gemini-pro-latest'
				].filter((p) => activeAvailable.includes(p));

				// 4. Any remaining active models
				const remaining = activeAvailable.filter(
					(a) => !matchedFlash.includes(a) && !otherFlash.includes(a) && !nonFlashFallbacks.includes(a)
				);

				candidateModels = [
					...matchedFlash,
					...otherFlash,
					...nonFlashFallbacks,
					...remaining
				];

				if (candidateModels.length === 0) {
					candidateModels = [
						'gemini-3.8-flash',
						'gemini-flash-latest',
						'gemini-3.5-flash-lite',
						'gemini-3.1-pro-preview'
					];
				}
			} else {
				const errText = await listRes.text();
				console.warn('Could not query model list from Google API:', errText);
			}
		} catch (listErr) {
			console.warn('Error fetching model list:', listErr.message);
		}

		console.log('Attempting generation with candidate models:', candidateModels);

		const ai = new GoogleGenAI({ apiKey });
		let sentences = await requestGemini(prompt, candidateModels, apiKey, ai);

		if (!Array.isArray(sentences)) {
			sentences = [];
		}

		// If AI returned fewer sentences than requested, backfill the remaining sentences
		if (sentences.length < count) {
			const missing = count - sentences.length;
			console.log(`Generated ${sentences.length}/${count} sentences. Backfilling ${missing} missing sentences...`);

			try {
				const backfillPrompt = `
You are an expert language teacher.
Deck vocabulary:
${vocabList}

TASK:
Generate EXACTLY ${missing} additional practice sentences using words from the list above. Not all words need to be used.
Return ONLY a valid JSON array of ${missing} objects with no markdown wrapping:
[
  {
    "sentence": "...",
    "pronunciation": "...",
    "translation": "...",
    "translation_pronunciation": null,
    "covered_words": ["word"]
  }
]
`;
				const additional = await requestGemini(backfillPrompt, candidateModels, apiKey, ai);
				if (Array.isArray(additional) && additional.length > 0) {
					sentences = [...sentences, ...additional];
				}
			} catch (backfillErr) {
				console.warn('Backfill attempt failed, proceeding with current count:', backfillErr.message);
			}
		}

		// Ensure exact count: if more, trim down to requested count
		if (sentences.length > count) {
			sentences = sentences.slice(0, count);
		}

		if (sentences.length === 0) {
			return json({ error: 'Failed to generate practice sentences from AI' }, { status: 500 });
		}

		return json({
			deck_id: deck[0].id,
			deck_title: deck[0].title,
			style,
			requested_count: count,
			total_generated: sentences.length,
			total_cards: cards.length,
			sentences
		});
	} catch (error) {
		console.error('Error generating SRS practice sentences:', error);
		return json(
			{ error: error.message || 'Failed to generate practice sentences' },
			{ status: 500 }
		);
	}
}

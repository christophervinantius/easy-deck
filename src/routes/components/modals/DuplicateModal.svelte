<script>
	let { currentDeck = null, card = null, decks = [], onDuplicate, onCancel } = $props();

	let selectedTargetDeckId = $state(currentDeck?.id || (decks.length > 0 ? decks[0].id : ''));
	let originalWord = $state(card?.original_word || '');
	let pronunciation = $state(card?.pronunciation || '');
	let translation = $state(card?.translation || '');
	let translationPronunciation = $state(card?.translation_pronunciation || '');
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		if (card) {
			originalWord = card.original_word || '';
			pronunciation = card.pronunciation || '';
			translation = card.translation || '';
			translationPronunciation = card.translation_pronunciation || '';
		}
	});

	const handleSwap = () => {
		const tempWord = originalWord;
		originalWord = translation;
		translation = tempWord;

		const tempPron = pronunciation;
		pronunciation = translationPronunciation;
		translationPronunciation = tempPron;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		loading = true;

		const payload = {
			original_word: originalWord.trim(),
			pronunciation: pronunciation.trim(),
			translation: translation.trim(),
			translation_pronunciation: translationPronunciation.trim()
		};

		if (selectedTargetDeckId) {
			payload.deck_id = selectedTargetDeckId;
		}

		error = '';
		try {
			await onDuplicate?.(payload);
		} catch (err) {
			error = err.message || 'Failed to duplicate card';
		} finally {
			loading = false;
		}
	};
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
	<div class="bg-white p-8 rounded-lg w-full max-w-lg">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-2xl font-extrabold text-black">Duplicate Card</h2>
			<button
				type="button"
				onclick={handleSwap}
				class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-lg transition-all cursor-pointer border border-gray-300"
				title="Swap original and translation values"
			>
				<span>Swap Original & Translation</span>
			</button>
		</div>

		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit}>
			{#if decks.length > 0}
				<div class="mb-4">
					<label class="block text-sm font-medium mb-1.5 text-black" for="dup_target_deck">
						Target Deck
					</label>
					<div class="flex items-center gap-2">
						<select
							id="dup_target_deck"
							bind:value={selectedTargetDeckId}
							class="border border-gray-300 p-2.5 rounded-lg w-full text-black font-semibold bg-white cursor-pointer"
						>
							{#each decks as d (d.id)}
								<option value={d.id}>
									{d.title}
								</option>
							{/each}
						</select>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="dup_original_word">
						Original Word / Phrase <span class="text-red-500">*</span>
					</label>
					<input
						id="dup_original_word"
						type="text"
						required
						bind:value={originalWord}
						placeholder="e.g. Bonjour"
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="dup_pronunciation">
						Original Pronunciation
					</label>
					<input
						id="dup_pronunciation"
						type="text"
						bind:value={pronunciation}
						placeholder="e.g. bohn-zhoor"
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="dup_translation">
						Translation / Meaning <span class="text-red-500">*</span>
					</label>
					<input
						id="dup_translation"
						type="text"
						required
						bind:value={translation}
						placeholder="e.g. Hello"
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="dup_translation_pronunciation">
						Translation Pronunciation
					</label>
					<input
						id="dup_translation_pronunciation"
						type="text"
						bind:value={translationPronunciation}
						placeholder="e.g. heh-LOH"
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
			</div>

			<div class="flex justify-end">
				<button
					type="button"
					onclick={onCancel}
					class="mr-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 cursor-pointer transition-colors ease-in-out font-semibold text-black"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer transition-colors ease-in-out font-semibold disabled:opacity-50"
				>
					{loading ? 'Duplicating...' : 'Duplicate Card'}
				</button>
			</div>
		</form>
	</div>
</div>

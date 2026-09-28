<script>
	let { currentDeck = null, decks = [], onAdd, onCancel } = $props();

	let selectedDeckId = $state(currentDeck?.id || (decks.length > 0 ? decks[0].id : ''));
	let originalWord = $state('');
	let pronunciation = $state('');
	let translation = $state('');
	let translationPronunciation = $state('');
	let loading = $state(false);
	let error = $state('');

	const handleAdd = async (e) => {
		e.preventDefault();
		loading = true;
		error = '';

		const payload = {
			original_word: originalWord.trim(),
			pronunciation: pronunciation.trim(),
			translation: translation.trim(),
			translation_pronunciation: translationPronunciation.trim()
		};

		if (selectedDeckId) {
			payload.deck_id = selectedDeckId;
		}

		try {
			await onAdd?.(payload);
		} catch (err) {
			error = err.message || 'Failed to add card';
		} finally {
			loading = false;
		}
	};
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
	<div class="bg-white p-8 rounded-lg w-full max-w-lg">
		<h2 class="text-2xl font-extrabold text-black mb-4">Add Card</h2>

		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg">
				{error}
			</div>
		{/if}

		<form onsubmit={handleAdd}>
			{#if decks.length > 0}
				<div class="mb-4">
					<label class="block text-sm font-medium mb-1.5 text-black" for="select_deck">
						Target Deck
					</label>
					<div class="flex items-center gap-2">
						<select
							id="select_deck"
							bind:value={selectedDeckId}
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
					<label class="block text-sm font-medium mb-2 text-black" for="original_word">
						Original Word / Phrase <span class="text-red-500">*</span>
					</label>
					<input
						id="original_word"
						type="text"
						required
						bind:value={originalWord}
						placeholder="e.g. Bonjour"
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="pronunciation">Original Pronunciation</label>
					<input
						id="pronunciation"
						type="text"
						bind:value={pronunciation}
						placeholder="e.g. bohn-zhoor"
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="translation">
						Translation / Meaning <span class="text-red-500">*</span>
					</label>
					<input
						id="translation"
						type="text"
						required
						bind:value={translation}
						placeholder="e.g. Hello"
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="translation_pronunciation">Translation Pronunciation</label>
					<input
						id="translation_pronunciation"
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
					{loading ? 'Adding...' : 'Add Card'}
				</button>
			</div>
		</form>
	</div>
</div>

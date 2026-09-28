<script>
	let { card, decks = [], onUpdate, onCancel } = $props();

	let selectedDeckId = $state(card?.deck_id || '');
	let originalWord = $state(card?.original_word || '');
	let pronunciation = $state(card?.pronunciation || '');
	let translation = $state(card?.translation || '');
	let translationPronunciation = $state(card?.translation_pronunciation || '');
	let loading = $state(false);
	let error = $state('');

	const handleSwap = () => {
		const tempWord = originalWord;
		originalWord = translation;
		translation = tempWord;

		const tempPron = pronunciation;
		pronunciation = translationPronunciation;
		translationPronunciation = tempPron;
	};

	const handleUpdate = async (e) => {
		e.preventDefault();
		loading = true;
		error = '';

		const formData = {
			original_word: originalWord.trim(),
			pronunciation: pronunciation.trim(),
			translation: translation.trim(),
			translation_pronunciation: translationPronunciation.trim(),
			deck_id: selectedDeckId
		};

		try {
			await onUpdate?.(card?.id, formData);
		} catch (err) {
			error = err.message || 'Failed to update card';
		} finally {
			loading = false;
		}
	};
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
	<div class="bg-white p-8 rounded-lg w-full max-w-lg">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-2xl font-extrabold text-black">Edit Card</h2>
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

		<form onsubmit={handleUpdate}>
			{#if decks.length > 0}
				<div class="mb-4">
					<label class="block text-sm font-medium mb-1.5 text-black" for="edit_select_deck">
						Deck
					</label>
					<select
						id="edit_select_deck"
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
			{/if}
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="original_word">
						Original Word / Phrase <span class="text-red-500">*</span>
					</label>
					<input
						id="original_word"
						name="original_word"
						type="text"
						bind:value={originalWord}
						required
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="pronunciation">Original Pronunciation</label>
					<input
						id="pronunciation"
						name="pronunciation"
						type="text"
						bind:value={pronunciation}
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
						name="translation"
						type="text"
						bind:value={translation}
						required
						class="border border-gray-300 p-2 rounded w-full text-black"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2 text-black" for="translation_pronunciation">Translation Pronunciation</label>
					<input
						id="translation_pronunciation"
						name="translation_pronunciation"
						type="text"
						bind:value={translationPronunciation}
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
					class="px-4 py-2 bg-black text-white rounded hover:bg-black/80 cursor-pointer transition-colors ease-in-out font-semibold disabled:opacity-50"
				>
					{loading ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</form>
	</div>
</div>

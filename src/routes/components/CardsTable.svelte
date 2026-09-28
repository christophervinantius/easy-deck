<script>
	let { cards = [], onEdit, onDelete, onAddCard } = $props();

	let deckFilter = $state('');
	let wordFilter = $state('');
	let pronunciationFilter = $state('');
	let translationFilter = $state('');
	let translationPronunciationFilter = $state('');

	let pageSize = $state(10);
	let currentPage = $state(1);
	const pageSizeOptions = [10, 25, 50, 100];

	let hasActiveFilters = $derived(
		Boolean(
			deckFilter.trim() ||
			wordFilter.trim() ||
			pronunciationFilter.trim() ||
			translationFilter.trim() ||
			translationPronunciationFilter.trim()
		)
	);

	const clearAllFilters = () => {
		deckFilter = '';
		wordFilter = '';
		pronunciationFilter = '';
		translationFilter = '';
		translationPronunciationFilter = '';
		currentPage = 1;
	};

	let sortedCards = $derived(
		[...cards].sort((a, b) => {
			const deckA = (a.deck_title || '').toLowerCase();
			const deckB = (b.deck_title || '').toLowerCase();
			if (deckA !== deckB) return deckA.localeCompare(deckB);
			return (a.original_word || '').toLowerCase().localeCompare((b.original_word || '').toLowerCase());
		})
	);

	let filteredCards = $derived(
		sortedCards.filter((card) => {
			if (deckFilter.trim() && !(card.deck_title || '').toLowerCase().includes(deckFilter.toLowerCase().trim())) {
				return false;
			}
			if (wordFilter.trim() && !(card.original_word || '').toLowerCase().includes(wordFilter.toLowerCase().trim())) {
				return false;
			}
			if (
				pronunciationFilter.trim() &&
				!(card.pronunciation || '').toLowerCase().includes(pronunciationFilter.toLowerCase().trim())
			) {
				return false;
			}
			if (
				translationFilter.trim() &&
				!(card.translation || '').toLowerCase().includes(translationFilter.toLowerCase().trim())
			) {
				return false;
			}
			if (
				translationPronunciationFilter.trim() &&
				!(card.translation_pronunciation || '').toLowerCase().includes(translationPronunciationFilter.toLowerCase().trim())
			) {
				return false;
			}
			return true;
		})
	);

	let totalPages = $derived(
		Math.max(1, Math.ceil(filteredCards.length / pageSize))
	);

	$effect(() => {
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}
		if (currentPage < 1) {
			currentPage = 1;
		}
	});

	let paginatedCards = $derived(
		filteredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	let startIndex = $derived(filteredCards.length === 0 ? 0 : (currentPage - 1) * pageSize + 1);
	let endIndex = $derived(Math.min(currentPage * pageSize, filteredCards.length));
</script>

<div class="w-full max-w-5xl flex flex-col gap-6">
	{#if cards && cards.length > 0}
		<div class="bg-white rounded-2xl overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<!-- Column Header Titles -->
						<tr class="bg-white text-sm font-bold text-black border-b border-gray-100">
							<th class="p-3">Deck</th>
							<th class="p-3">Original Word</th>
							<th class="p-3">Pronunciation</th>
							<th class="p-3">Translation</th>
							<th class="p-3">Translation Pronunciation</th>
							<th class="p-3 text-center">Action</th>
						</tr>

						<!-- Per-Column Filter Search Inputs -->
						<tr class="bg-gray-50/80 border-b border-gray-200">
							<th class="p-2">
								<input
									type="text"
									bind:value={deckFilter}
									oninput={() => (currentPage = 1)}
									placeholder="Search deck..."
									class="w-full text-xs font-normal px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
								/>
							</th>
							<th class="p-2">
								<input
									type="text"
									bind:value={wordFilter}
									oninput={() => (currentPage = 1)}
									placeholder="Search word..."
									class="w-full text-xs font-normal px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
								/>
							</th>
							<th class="p-2">
								<input
									type="text"
									bind:value={pronunciationFilter}
									oninput={() => (currentPage = 1)}
									placeholder="Search pronunciation..."
									class="w-full text-xs font-normal px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
								/>
							</th>
							<th class="p-2">
								<input
									type="text"
									bind:value={translationFilter}
									oninput={() => (currentPage = 1)}
									placeholder="Search translation..."
									class="w-full text-xs font-normal px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
								/>
							</th>
							<th class="p-2">
								<input
									type="text"
									bind:value={translationPronunciationFilter}
									oninput={() => (currentPage = 1)}
									placeholder="Search pronunciation..."
									class="w-full text-xs font-normal px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
								/>
							</th>
							<th class="p-2 text-center">
								{#if hasActiveFilters}
									<button
										type="button"
										onclick={clearAllFilters}
										class="text-sm font-bold text-red-600 hover:text-red-800 cursor-pointer whitespace-nowrap"
										title="Reset all filters"
									>
										Clear
									</button>
								{/if}
							</th>
						</tr>
					</thead>
					<tbody class="text-sm text-black">
						{#if paginatedCards.length > 0}
							{#each paginatedCards as card (card.id)}
								<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
									<td class="p-3 font-semibold text-black">
										{card.deck_title || 'Default'}
									</td>
									<td class="p-3 font-semibold text-black max-w-xs">
										{card.original_word}
									</td>
									<td class="p-3 font-semibold text-black">
										{card.pronunciation ? `${card.pronunciation}` : ''}
									</td>
									<td class="p-3 font-semibold text-black max-w-xs">
										{card.translation}
									</td>
									<td class="p-3 font-semibold text-black">
										{card.translation_pronunciation ? `${card.translation_pronunciation}` : ''}
									</td>
									<td class="p-3 text-center">
										<div class="flex items-center justify-center gap-3">
											<button
												onclick={() => onEdit?.(card)}
												class="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
												title="Edit card"
											>
												Edit
											</button>
											<button
												onclick={() => onDelete?.(card)}
												class="font-semibold text-red-600 hover:text-red-800 cursor-pointer"
												title="Delete card"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="6" class="p-10 text-center text-sm font-medium text-black/60">
									No cards found matching the current search filters
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination Controls Bar -->
			<div class="p-4 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-black">
				<div class="flex items-center gap-2">
					<span>
						Showing <span class="font-bold">{startIndex}</span> to <span class="font-bold">{endIndex}</span> of <span class="font-bold">{filteredCards.length}</span> cards
					</span>
				</div>

				<div class="flex items-center gap-4">
					<div class="flex items-center gap-1.5">
						<label for="page_size_select" class="text-black/60 font-medium">Rows per page:</label>
						<select
							id="page_size_select"
							bind:value={pageSize}
							onchange={() => (currentPage = 1)}
							class="border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 min-w-[4.5rem] bg-white font-bold cursor-pointer text-xs focus:outline-none focus:ring-1 focus:ring-black text-center"
						>
							{#each pageSizeOptions as opt}
								<option value={opt}>{opt}</option>
							{/each}
						</select>
					</div>

					<div class="flex items-center gap-1">
						<button
							onclick={() => (currentPage = Math.max(1, currentPage - 1))}
							disabled={currentPage === 1}
							class="px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-bold"
						>
							Prev
						</button>
						<span class="px-2 font-bold text-black">
							Page {currentPage} of {totalPages}
						</span>
						<button
							onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
							disabled={currentPage === totalPages}
							class="px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors font-bold"
						>
							Next
						</button>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div class="bg-white rounded-2xl p-12 text-center flex flex-col items-center gap-3">
			<h3 class="text-lg font-bold text-black">No cards created yet</h3>
			<p class="text-sm text-black/70">Create a card to start building your flashcard collection.</p>
			{#if onAddCard}
				<button
					onclick={onAddCard}
					class="mt-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-black/80 transition-colors cursor-pointer"
				>
					Add Your First Card
				</button>
			{/if}
		</div>
	{/if}
</div>

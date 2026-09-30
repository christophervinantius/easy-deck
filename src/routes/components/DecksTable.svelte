<script>
	let { decks = [], onEdit, onDelete, onAddDeck } = $props();

	let titleFilter = $state('');

	let pageSize = $state(10);
	let currentPage = $state(1);
	const pageSizeOptions = [10, 25, 50, 100];

	let hasActiveFilters = $derived(
		Boolean(titleFilter.trim())
	);

	const clearAllFilters = () => {
		titleFilter = '';
		currentPage = 1;
	};

	let sortedDecks = $derived(
		[...decks].sort((a, b) => {
			const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
			const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
			return timeB - timeA;
		})
	);

	let filteredDecks = $derived(
		sortedDecks.filter((deck) => {
			if (
				titleFilter.trim() &&
				!(deck.title || '').toLowerCase().includes(titleFilter.toLowerCase().trim())
			) {
				return false;
			}
			return true;
		})
	);

	let totalPages = $derived(
		Math.max(1, Math.ceil(filteredDecks.length / pageSize))
	);

	$effect(() => {
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}
		if (currentPage < 1) {
			currentPage = 1;
		}
	});

	let paginatedDecks = $derived(
		filteredDecks.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	let startIndex = $derived(filteredDecks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1);
	let endIndex = $derived(Math.min(currentPage * pageSize, filteredDecks.length));

	const formatDate = (dateStr) => {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			return d.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return '-';
		}
	};
</script>

<div class="w-full max-w-5xl flex flex-col gap-6">
	{#if decks && decks.length > 0}
		<div class="bg-white rounded-2xl overflow-hidden shadow-xs border border-black/5">
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<!-- Column Header Titles -->
						<tr class="bg-white text-sm font-bold text-black border-b border-gray-100">
							<th class="p-3">Deck Title</th>
							<th class="p-3">Total Cards</th>
							<th class="p-3">Created Date</th>
							<th class="p-3 text-center">Action</th>
						</tr>

						<!-- Per-Column Filter Search Inputs -->
						<tr class="bg-gray-50/80 border-b border-gray-200">
							<th class="p-2">
								<input
									type="text"
									bind:value={titleFilter}
									oninput={() => (currentPage = 1)}
									placeholder="Search deck title..."
									class="w-full text-xs font-normal px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-black placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-black"
								/>
							</th>
							<th class="p-2"></th>
							<th class="p-2"></th>
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
						{#if paginatedDecks.length > 0}
							{#each paginatedDecks as deck (deck.id)}
								<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
									<td class="p-3 font-semibold text-black">
										{deck.title}
									</td>
									<td class="p-3 font-semibold text-black">
										{deck.card_count ?? 0}
									</td>
									<td class="p-3 font-medium text-black/70">
										{formatDate(deck.created_at)}
									</td>
									<td class="p-3 text-center">
										<div class="flex items-center justify-center gap-3">
											<button
												onclick={() => onEdit?.(deck)}
												class="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
												title="Edit deck"
											>
												Edit
											</button>
											<button
												onclick={() => onDelete?.(deck)}
												class="font-semibold text-red-600 hover:text-red-800 cursor-pointer"
												title="Delete deck"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="4" class="p-10 text-center text-sm font-medium text-black/60">
									No decks found matching the current search filters
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
						Showing <span class="font-bold">{startIndex}</span> to <span class="font-bold">{endIndex}</span> of <span class="font-bold">{filteredDecks.length}</span> decks
					</span>
				</div>

				<div class="flex items-center gap-4">
					<div class="flex items-center gap-1.5">
						<label for="deck_page_size_select" class="text-black/60 font-medium">Rows per page:</label>
						<select
							id="deck_page_size_select"
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
			<h3 class="text-lg font-bold text-black">No decks created yet</h3>
			<p class="text-sm text-black/70">Create your first deck to organize your flashcards.</p>
			{#if onAddDeck}
				<button
					onclick={onAddDeck}
					class="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
				>
					Add Your First Deck
				</button>
			{/if}
		</div>
	{/if}
</div>

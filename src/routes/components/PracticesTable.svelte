<script>
	let { practices = [], onResume, onDelete, onGoHome } = $props();

	let filterText = $state('');
	let pageSize = $state(10);
	let currentPage = $state(1);
	const pageSizeOptions = [10, 25, 50];

	let hasActiveFilters = $derived(Boolean(filterText.trim()));

	const clearAllFilters = () => {
		filterText = '';
		currentPage = 1;
	};

	let filteredPractices = $derived(
		practices.filter((p) => {
			if (!filterText.trim()) return true;
			const q = filterText.toLowerCase().trim();
			return (
				(p.title || '').toLowerCase().includes(q) ||
				(p.deck_title || '').toLowerCase().includes(q) ||
				(p.style || '').toLowerCase().includes(q)
			);
		})
	);

	let totalPages = $derived(Math.max(1, Math.ceil(filteredPractices.length / pageSize)));

	$effect(() => {
		if (currentPage > totalPages) {
			currentPage = totalPages;
		}
		if (currentPage < 1) {
			currentPage = 1;
		}
	});

	let paginatedPractices = $derived(
		filteredPractices.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	let startIndex = $derived(
		filteredPractices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
	);
	let endIndex = $derived(Math.min(currentPage * pageSize, filteredPractices.length));

	const formatDate = (dateStr) => {
		if (!dateStr) return '-';
		try {
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return '-';
			return d.toLocaleString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});
		} catch {
			return '-';
		}
	};
</script>

<div class="w-full max-w-5xl flex flex-col gap-6">
	{#if practices && practices.length > 0}
		<div class="bg-white rounded-2xl overflow-hidden shadow-xs border border-black/5">
			<div class="overflow-x-auto">
				<table class="w-full text-left border-collapse">
					<thead>
						<!-- Column Header Titles -->
						<tr class="bg-white text-sm font-bold text-black border-b border-gray-100">
							<th class="p-3">Deck</th>
							<th class="p-3">Progress</th>
							<th class="p-3">Saved At</th>
							<th class="p-3 text-center">Action</th>
						</tr>

						<!-- Filter Input -->
						<tr class="bg-gray-50/80 border-b border-gray-200">
							<th class="p-2">
								<input
									type="text"
									bind:value={filterText}
									oninput={() => (currentPage = 1)}
									placeholder="Search practice sessions..."
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
										title="Reset filter"
									>
										Clear
									</button>
								{/if}
							</th>
						</tr>
					</thead>
					<tbody class="text-sm text-black">
						{#if paginatedPractices.length > 0}
							{#each paginatedPractices as practice (practice.id)}
								{@const total = practice.total_sentences || 1}
								{@const current = practice.is_completed ? total : (practice.current_index || 0) + 1}
								{@const pct = Math.min(100, Math.round((current / total) * 100))}
								<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
									<!-- Session & Deck Title -->
									<td class="p-3 font-semibold text-black">
										<div class="flex flex-col gap-1">
											<div class="flex items-center gap-2">
												<span class="truncate max-w-[280px] font-bold text-black">
													{practice.deck_title}
												</span>
											</div>
											{#if practice.style}
												<div class="flex items-center gap-1.5">
													<span class="text-[11px] font-medium px-2 py-0.5 bg-gray-100 text-black rounded-md capitalize">
														{practice.style}
													</span>
												</div>
											{/if}
										</div>
									</td>

									<!-- Progress Bar & Status -->
									<td class="p-3 font-semibold text-black">
										<div class="flex flex-col gap-1.5 max-w-[180px]">
											<div class="flex items-center justify-between text-xs">
												{#if practice.is_completed}
													<span class="font-bold text-emerald-600 flex items-center gap-1">
														<span>Completed</span>
														<span>✓</span>
													</span>
												{:else}
													<span class="text-black">
														Sentence {current} of {total}
													</span>
												{/if}
												<span class="text-black">{pct}%</span>
											</div>
											<!-- Mini progress track -->
											<div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
												<div
													class="h-full rounded-full transition-all duration-300 {practice.is_completed ? 'bg-emerald-500' : 'bg-blue-600'}"
													style="width: {pct}%"
												></div>
											</div>
										</div>
									</td>

									<!-- Saved Date -->
									<td class="p-3 font-medium text-black">
										{formatDate(practice.updated_at || practice.created_at)}
									</td>

									<!-- Actions -->
									<td class="p-3 text-center">
										<div class="flex items-center justify-center gap-3">
											<button
												onclick={() => onResume?.(practice)}
												class="font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer flex items-center gap-1 text-sm"
												title={practice.is_completed ? 'Review practice session' : 'Resume practice session'}
											>
												<span>{practice.is_completed ? 'Review' : 'Resume'}</span>
											</button>
											<button
												onclick={() => onDelete?.(practice)}
												class="font-semibold text-red-600 hover:text-red-800 cursor-pointer text-sm"
												title="Delete saved practice"
											>
												Delete
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{:else}
							<tr>
								<td colspan="4" class="p-10 text-center text-sm font-medium text-black">
									No practice sessions found matching the search filter
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
						Showing <span class="font-bold">{startIndex}</span> to <span class="font-bold">{endIndex}</span> of <span class="font-bold">{filteredPractices.length}</span> sessions
					</span>
				</div>

				<div class="flex items-center gap-4">
					<div class="flex items-center gap-1.5">
						<label for="practice_page_size_select" class="text-black font-medium">Rows per page:</label>
						<select
							id="practice_page_size_select"
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
			<h3 class="text-lg font-bold text-black">No saved practice sessions yet</h3>
			{#if onGoHome}
				<button
					onclick={onGoHome}
					class="mt-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer active:scale-95 shadow-xs"
				>
					Home
				</button>
			{/if}
		</div>
	{/if}
</div>

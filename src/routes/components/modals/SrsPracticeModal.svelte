<script>
	let { currentDeck = null, cardCount = 0, onStart, onCancel } = $props();

	// Default sentence count: at least 10, or up to cardCount, capped at 50
	let sentenceCount = $state(Math.min(50, Math.max(10, Math.min(20, cardCount || 10))));
	let loading = $state(false);
	let error = $state('');

	const quickCounts = [10, 15, 25, 50];

	const handleStart = async (e) => {
		e.preventDefault();
		if (loading) return;

		const count = Math.min(50, Math.max(10, Number(sentenceCount) || 10));
		loading = true;
		error = '';

		try {
			await onStart?.(count);
		} catch (err) {
			error = err.message || 'Failed to start practice';
			loading = false;
		}
	};
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
	<div class="bg-white p-6 sm:p-8 rounded-2xl w-full max-w-lg shadow-xl">
		<div class="flex items-center justify-between mb-4">
			<div>
				<h2 class="text-xl sm:text-2xl font-black text-black">SRS Practice</h2>
			</div>
			<button
				type="button"
				onclick={onCancel}
				disabled={loading}
				class="text-gray-400 hover:text-black transition-colors p-1 rounded-lg cursor-pointer disabled:opacity-50"
				aria-label="Close"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Deck info banner -->
		<div class="mb-5 p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl flex items-center justify-between">
			<div class="truncate mr-3">
				<span class="text-sm font-bold text-black truncate block">{currentDeck?.title || 'Current Deck'}</span>
			</div>
			<span class="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 whitespace-nowrap">
				{cardCount} {cardCount === 1 ? 'word' : 'words'}
			</span>
		</div>

		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl">
				{error}
			</div>
		{/if}

		<form onsubmit={handleStart} class="space-y-5">
			<div>
				<div class="flex items-center justify-between mb-2">
					<label for="sentence_slider" class="text-sm font-bold text-black">
						How many sentences do you want to practice?
					</label>
					<span class="text-base font-extrabold text-emerald-600">
						{sentenceCount}
					</span>
				</div>

				<!-- Range slider -->
				<input
					id="sentence_slider"
					type="range"
					min="10"
					max="50"
					step="1"
					disabled={loading}
					bind:value={sentenceCount}
					class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 disabled:opacity-50"
				/>
			</div>

			<!-- Actions -->
			<div class="flex justify-end items-center gap-3 pt-2">
				<button
					type="button"
					onclick={onCancel}
					disabled={loading}
					class="px-4 py-2.5 text-black font-semibold hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-sm disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading || cardCount === 0}
					class="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all cursor-pointer flex items-center gap-2 text-sm shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if loading}
						<span>Generating sentences...</span>
					{:else}
						<span>Start</span>
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>

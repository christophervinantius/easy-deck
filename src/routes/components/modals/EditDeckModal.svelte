<script>
	let { deck, onUpdate, onCancel } = $props();

	let title = $state(deck?.title || '');
	let enableSrs = $state(Boolean(deck?.enable_srs));
	let loading = $state(false);
	let error = $state('');

	const handleSubmit = async (e) => {
		e.preventDefault();
		error = '';

		if (!title.trim()) {
			error = 'Deck title is required';
			return;
		}

		loading = true;
		try {
			await onUpdate?.(deck?.id, {
				title: title.trim(),
				enable_srs: enableSrs
			});
		} catch (err) {
			error = err.message || 'Failed to update deck';
		} finally {
			loading = false;
		}
	};
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
	<div class="bg-white p-8 rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-150">
		<h2 class="text-2xl font-extrabold mb-4 text-black">Edit Deck</h2>

		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="mb-5">
				<label class="block text-sm font-semibold mb-2 text-black" for="edit_deck_title">
					Deck Title <span class="text-red-500">*</span>
				</label>
				<input
					id="edit_deck_title"
					name="title"
					type="text"
					required
					bind:value={title}
					placeholder="e.g. Spanish Vocabulary, History Chapter 1"
					class="border border-gray-300 p-2.5 rounded-lg w-full text-black font-medium focus:outline-none focus:ring-2 focus:ring-black"
				/>
			</div>

			<!-- SRS Practice Option -->
			<div class="mb-6">
				<label
					for="edit_deck_enable_srs"
					class="inline-flex items-start gap-3 cursor-pointer select-none group"
				>
					<div class="relative flex items-center justify-center mt-0.5">
						<input
							id="edit_deck_enable_srs"
							type="checkbox"
							bind:checked={enableSrs}
							disabled={loading}
							class="sr-only peer"
						/>
						<div
							class="w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center {enableSrs
								? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
								: 'bg-white border-gray-300 group-hover:border-gray-400'} peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50"
						>
							{#if enableSrs}
								<svg
									class="w-3.5 h-3.5 text-white"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</div>
					</div>
					<div>
						<span class="text-sm font-bold text-black group-hover:text-emerald-700 transition-colors block">
							SRS Practice
						</span>
					</div>
				</label>
			</div>

			<div class="flex justify-end gap-3">
				<button
					type="button"
					onclick={onCancel}
					disabled={loading}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors text-black font-semibold text-sm disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					class="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/80 cursor-pointer transition-colors font-semibold text-sm disabled:opacity-50"
				>
					{loading ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</form>
	</div>
</div>

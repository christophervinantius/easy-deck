<script>
	let { onAdd, onCancel } = $props();

	let title = $state('');
	let enableSrs = $state(false);
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
			await onAdd?.({
				title: title.trim(),
				enable_srs: enableSrs
			});
		} catch (err) {
			error = err.message || 'Failed to create deck';
		} finally {
			loading = false;
		}
	};
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
	<div class="bg-white p-8 rounded-2xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-150">
		<h2 class="text-2xl font-extrabold mb-4 text-black">Create New Deck</h2>

		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="mb-5">
				<label class="block text-sm font-semibold mb-2 text-black" for="deck_title">
					Deck Title <span class="text-red-500">*</span>
				</label>
				<input
					id="deck_title"
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
					for="add_deck_enable_srs"
					class="inline-flex items-start gap-3 cursor-pointer select-none group"
				>
					<div class="relative flex items-center justify-center mt-0.5">
						<input
							id="add_deck_enable_srs"
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

			<div class="flex justify-end">
				<button
					type="button"
					onclick={onCancel}
					class="mr-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 cursor-pointer transition-colors ease-in-out text-black font-semibold"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer transition-colors ease-in-out font-semibold disabled:opacity-50"
				>
					{loading ? 'Creating...' : 'Create Deck'}
				</button>
			</div>
		</form>
	</div>
</div>

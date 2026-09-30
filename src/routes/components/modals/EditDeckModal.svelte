<script>
	let { deck, onUpdate, onCancel } = $props();

	let title = $state(deck?.title || '');
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
				title: title.trim()
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
			<div class="mb-6">
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

<script>
	let { onAdd, onCancel } = $props();

	let title = $state('');
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
				title: title.trim()
			});
		} catch (err) {
			error = err.message || 'Failed to create deck';
		} finally {
			loading = false;
		}
	};
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
	<div class="bg-white p-8 rounded-lg w-full max-w-lg">
		<h2 class="text-2xl font-extrabold mb-4 text-black">Create New Deck</h2>

		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg">
				{error}
			</div>
		{/if}

		<form onsubmit={handleSubmit}>
			<div class="mb-6">
				<label class="block text-sm font-medium mb-2 text-black" for="deck_title">
					Deck Title <span class="text-red-500">*</span>
				</label>
				<input
					id="deck_title"
					name="title"
					type="text"
					required
					bind:value={title}
					placeholder="e.g. Spanish Vocabulary, History Chapter 1"
					class="border border-gray-300 p-2 rounded w-full text-black"
				/>
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

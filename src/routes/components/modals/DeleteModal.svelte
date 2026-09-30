<script>
	let { card, onConfirm, onCancel } = $props();
	let loading = $state(false);
	let error = $state('');

	const handleConfirm = async () => {
		if (loading) return;
		loading = true;
		error = '';
		try {
			await onConfirm?.(card?.id);
		} catch (err) {
			error = err.message || 'Failed to delete card';
			loading = false;
		}
	};
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
	<div class="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl">
		<h2 class="text-xl font-extrabold text-black mb-2">Delete Card</h2>
		<p class="text-black mb-4 text-sm">
			Are you sure you want to delete <span class="font-bold text-black">"{card?.original_word}"</span>?
		</p>

		{#if error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg">
				{error}
			</div>
		{/if}

		<div class="flex justify-end gap-3">
			<button
				type="button"
				onclick={onCancel}
				disabled={loading}
				class="px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold cursor-pointer disabled:opacity-50"
			>
				Cancel
			</button>
			<button
				type="button"
				disabled={loading}
				onclick={handleConfirm}
				class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
			>
				<span>{loading ? 'Deleting...' : 'Delete'}</span>
			</button>
		</div>
	</div>
</div>

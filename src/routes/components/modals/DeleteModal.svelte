<script>
	let { card, onConfirm, onCancel } = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
	<div class="bg-white p-6 rounded-2xl w-full max-w-md">
		<h2 class="text-xl font-extrabold text-black mb-2">Delete Card</h2>
		<p class="text-black mb-6 text-sm">
			Are you sure you want to delete <span class="font-bold text-black">"{card?.original_word}"</span>?
		</p>
		<div class="flex justify-end gap-3">
			<button
				type="button"
				onclick={onCancel}
				class="px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold cursor-pointer"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={() => onConfirm?.(card?.id)}
				class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold cursor-pointer"
			>
				Delete
			</button>
		</div>
	</div>
</div>

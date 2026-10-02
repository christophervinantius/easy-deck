<script>
	let {
		currentIndex = 0,
		totalSentences = 0,
		isAlreadySaved = false,
		saving = false,
		onSaveAndExit,
		onExitWithoutSaving,
		onCancel
	} = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
	<div class="bg-white p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
		<div class="flex items-center gap-3 mb-3">
			<div>
				<h3 class="text-xl font-black text-black">
					{isAlreadySaved ? 'Save Progress & Exit?' : 'Save Practice Session?'}
				</h3>
			</div>
		</div>

		<!-- <p class="text-sm text-gray-600 mb-6 leading-relaxed">
			{#if isAlreadySaved}
				You are on sentence <strong class="text-black">{currentIndex + 1}</strong> of <strong class="text-black">{totalSentences}</strong>. Would you like to update your saved progress?
			{:else}
				You are on sentence <strong class="text-black">{currentIndex + 1}</strong> of <strong class="text-black">{totalSentences}</strong>. Would you like to save this session so you can resume anytime from the <strong class="text-black">Practices</strong> menu?
			{/if}
		</p> -->

		<div class="flex flex-col gap-2.5">
			<button
				type="button"
				onclick={onSaveAndExit}
				disabled={saving}
				class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
			>
				<span>{saving ? 'Saving...' : isAlreadySaved ? 'Update & Exit' : 'Save & Exit'}</span>
			</button>

			<button
				type="button"
				onclick={onExitWithoutSaving}
				disabled={saving}
				class="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-black font-semibold rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-50"
			>
				Exit Without Saving
			</button>

			<button
				type="button"
				onclick={onCancel}
				disabled={saving}
				class="w-full py-2 px-4 text-gray-500 hover:text-black font-semibold text-sm transition-colors cursor-pointer"
			>
				Continue
			</button>
		</div>
	</div>
</div>

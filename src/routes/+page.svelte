<script>
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import AddModal from './components/modals/AddModal.svelte';
	import DuplicateModal from './components/modals/DuplicateModal.svelte';
	import AddDeckModal from './components/modals/AddDeckModal.svelte';
	import EditModal from './components/modals/EditModal.svelte';
	import DeleteModal from './components/modals/DeleteModal.svelte';
	import CardsTable from './components/CardsTable.svelte';

	let { data } = $props();

	let showModal = $state(false);
	let showDuplicateModal = $state(false);
	let showDeckModal = $state(false);
	let cardToEdit = $state(null);
	let cardToDelete = $state(null);
	let currentView = $state('deck'); // 'deck' | 'table'
	let mobileMenuOpen = $state(false);

	let decks = $state([]);
	let currentDeck = $state(null);
	let cards = $state([]);
	let allCards = $state([]);
	let currentCard = $state(null);
	let showPronunciation = $state(false);
	let showTranslation = $state(false);
	let showTranslationPronunciation = $state(false);
	let loading = $state(true);
	let cardAnimClass = $state('card-anim-idle');
	let isPickingCard = $state(false);

	const pickRandomCard = async (list = cards, animate = false) => {
		if (!list || list.length === 0) {
			currentCard = null;
			showPronunciation = false;
			showTranslation = false;
			showTranslationPronunciation = false;
			cardAnimClass = 'card-anim-idle';
			return;
		}
		if (list.length === 1) {
			currentCard = list[0];
			showPronunciation = false;
			showTranslation = false;
			showTranslationPronunciation = false;
			cardAnimClass = 'card-anim-idle';
			return;
		}
		if (isPickingCard) return;

		if (animate && currentCard) {
			isPickingCard = true;

			// 1. Discard current card to the left with a slight tilt
			cardAnimClass = 'card-anim-discard';
			await new Promise((r) => setTimeout(r, 180));

			// 2. Pick next random card
			let randomIndex;
			const current = currentCard;
			do {
				randomIndex = Math.floor(Math.random() * list.length);
			} while (current && list[randomIndex].id === current.id);

			currentCard = list[randomIndex];
			showPronunciation = false;
			showTranslation = false;
			showTranslationPronunciation = false;

			// 3. Position the new card to the right off-screen instantly
			cardAnimClass = 'card-anim-draw-prepare';
			await new Promise((r) => setTimeout(r, 30));

			// 4. Slide into center like drawing a fresh card from the deck
			cardAnimClass = 'card-anim-idle';
			await new Promise((r) => setTimeout(r, 280));

			isPickingCard = false;
		} else {
			let randomIndex;
			const current = currentCard;
			do {
				randomIndex = Math.floor(Math.random() * list.length);
			} while (current && list[randomIndex].id === current.id);

			currentCard = list[randomIndex];
			showPronunciation = false;
			showTranslation = false;
			showTranslationPronunciation = false;
			cardAnimClass = 'card-anim-idle';
		}
	};

	const fetchDecks = async () => {
		if (!data.user) {
			decks = [];
			currentDeck = null;
			return;
		}

		try {
			const res = await fetch('/api/decks');
			if (res.ok) {
				const fetchedDecks = await res.json();
				decks = (fetchedDecks || []).sort((a, b) =>
					(a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
				);
				if (decks.length > 0) {
					if (!currentDeck || !decks.some((d) => d.id === currentDeck.id)) {
						currentDeck = decks[0];
					} else {
						currentDeck = decks.find((d) => d.id === currentDeck.id);
					}
				} else {
					currentDeck = null;
				}
			}
		} catch (err) {
			console.error('Failed to fetch decks:', err);
		}
	};

	const fetchCards = async (deckId = currentDeck?.id) => {
		if (!data.user) {
			cards = [];
			currentCard = null;
			loading = false;
			return;
		}

		try {
			loading = true;
			const url = deckId ? `/api/cards?deck_id=${deckId}` : '/api/cards';
			const res = await fetch(url);
			if (res.ok) {
				const fetched = await res.json();
				cards = fetched || [];
				if (cards.length > 0) {
					pickRandomCard(cards);
				} else {
					currentCard = null;
				}
			} else if (res.status === 401) {
				cards = [];
				currentCard = null;
			}
		} catch (err) {
			console.error('Failed to fetch cards:', err);
		} finally {
			loading = false;
		}
	};

	const fetchAllCards = async () => {
		if (!data.user) {
			allCards = [];
			return;
		}

		try {
			const res = await fetch('/api/cards');
			if (res.ok) {
				const fetched = await res.json();
				allCards = fetched || [];
			}
		} catch (err) {
			console.error('Failed to fetch all cards:', err);
		}
	};

	const selectDeck = (deck) => {
		currentDeck = deck;
		fetchCards(deck?.id);
	};

	$effect(() => {
		if (data.user) {
			fetchDecks().then(() => {
				fetchCards(currentDeck?.id);
			});
			fetchAllCards();
		} else {
			decks = [];
			currentDeck = null;
			cards = [];
			allCards = [];
			currentCard = null;
			loading = false;
			currentView = 'deck';
		}
	});

	onMount(async () => {
		if (data.user) {
			await fetchDecks();
			await fetchCards(currentDeck?.id);
			await fetchAllCards();
		}
	});

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			await invalidateAll();
		} catch (err) {
			console.error('Logout failed:', err);
		}
	};

	const handleAddDeck = async (deckData) => {
		try {
			const res = await fetch('/api/decks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(deckData)
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || 'Failed to create deck');
			}
			const newDeck = await res.json();
			decks = [...decks, newDeck].sort((a, b) =>
				(a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
			);
			currentDeck = newDeck;
			showDeckModal = false;
			await fetchCards(newDeck.id);
		} catch (err) {
			console.error('Error adding deck:', err);
			throw err;
		}
	};

	const handleAddCard = async (formData) => {
		try {
			const payload = {
				...formData,
				deck_id: formData.deck_id || currentDeck?.id
			};

			const response = await fetch('/api/cards', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || 'Failed to add card');
			}

			const newCard = await response.json();
			showModal = false;
			showDuplicateModal = false;

			allCards = [newCard, ...allCards];
			if (!currentDeck || currentDeck.id === newCard.deck_id) {
				cards = [newCard, ...cards];
				if (!currentCard) {
					currentCard = newCard;
					showPronunciation = false;
					showTranslation = false;
					showTranslationPronunciation = false;
				}
			}

			fetchDecks();
		} catch (error) {
			console.error('Error adding card:', error);
			throw error;
		}
	};

	const handleDeleteCard = async (cardId) => {
		try {
			const response = await fetch(`/api/cards/${cardId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete card');
			}

			allCards = allCards.filter((c) => c.id !== cardId);
			const updated = cards.filter((c) => c.id !== cardId);
			cards = updated;

			if (currentCard?.id === cardId) {
				pickRandomCard(updated);
			}

			cardToDelete = null;
			fetchDecks();
		} catch (error) {
			console.error('Error deleting card:', error);
		}
	};

	const handleUpdateCard = async (cardId, formData) => {
		try {
			const response = await fetch(`/api/cards/${cardId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || 'Failed to update card');
			}

			const updatedCard = await response.json();
			allCards = allCards.map((c) => (c.id === cardId ? updatedCard : c));
			cards = cards.map((c) => (c.id === cardId ? updatedCard : c));

			if (currentCard?.id === cardId) {
				currentCard = updatedCard;
			}

			cardToEdit = null;
		} catch (error) {
			console.error('Error updating card:', error);
			throw error;
		}
	};
</script>

<div class="min-h-screen bg-yellow-200 flex flex-col items-center p-6 sm:p-10">
	<header class="w-full max-w-5xl mb-8 relative">
		<div class="flex items-center justify-between gap-6">
			<!-- Logo -->
			<h1 class="text-3xl font-black tracking-tight text-black shrink-0">Easy Deck!</h1>

			<!-- Desktop Nav & User Info on the same line with justify-between -->
			<div class="hidden md:flex flex-1 items-center justify-between">
				<nav class="flex items-center gap-4">
					<button
						onclick={() => (currentView = 'deck')}
						class="text-base font-semibold cursor-pointer text-black {currentView === 'deck'
							? 'underline underline-offset-4 decoration-2'
							: ''}"
					>
						Home
					</button>
					{#if data.user}
						<button
							onclick={() => {
								currentView = 'table';
								fetchAllCards();
							}}
							class="text-base font-semibold cursor-pointer text-black {currentView === 'table'
								? 'underline underline-offset-4 decoration-2'
								: ''}"
						>
							My Cards
						</button>
					{/if}
				</nav>

				<div class="flex items-center gap-4">
					{#if data.user}
                        <span
                            class="text-base font-bold text-black max-w-[150px] truncate"
                            title={data.user.username || data.user.email}
                        >
                            {data.user.username || data.user.email}
                        </span>
                        <button
                            onclick={handleLogout}
                            class="text-base font-bold text-red-600 cursor-pointer"
                        >
                            Log out
                        </button>
					{:else}
						<a
							href="/login"
							class="px-4 py-2 text-black text-sm font-semibold hover:underline underline-offset-4 cursor-pointer"
						>
							Log In
						</a>
						<a
							href="/register"
							class="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-black/80 transition-colors cursor-pointer"
						>
							Register
						</a>
					{/if}
				</div>
			</div>

			<!-- Mobile Hamburger Toggle Button -->
			<div class="flex md:hidden items-center">
				<button
					type="button"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="p-2 rounded-xl bg-white text-black hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
					aria-label="Toggle navigation menu"
					aria-expanded={mobileMenuOpen}
				>
					{#if mobileMenuOpen}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
						</svg>
					{:else}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Mobile Dropdown Menu -->
		{#if mobileMenuOpen}
			<div class="md:hidden mt-3 p-4 bg-white rounded-2xl border border-black/10 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
				<!-- Section 1: Home & My Cards -->
				<nav class="flex items-center gap-4">
					<button
						onclick={() => {
							currentView = 'deck';
							mobileMenuOpen = false;
						}}
						class="text-base font-semibold cursor-pointer text-black {currentView === 'deck'
							? 'underline underline-offset-4 decoration-2'
							: ''}"
					>
						Home
					</button>
					{#if data.user}
						<button
							onclick={() => {
								currentView = 'table';
								fetchAllCards();
								mobileMenuOpen = false;
							}}
							class="text-base font-semibold cursor-pointer text-black {currentView === 'table'
								? 'underline underline-offset-4 decoration-2'
								: ''}"
						>
							My Cards
						</button>
					{/if}
				</nav>

				<!-- Section 2: Username & Logout -->
				{#if data.user}
					<div class="flex items-center gap-4">
						<span
							class="text-base font-bold text-black max-w-[150px] truncate"
							title={data.user.username || data.user.email}
						>
							{data.user.username || data.user.email}
						</span>
						<button
							onclick={() => {
								mobileMenuOpen = false;
								handleLogout();
							}}
							class="text-base font-bold text-red-600 cursor-pointer"
						>
							Log out
						</button>
					</div>
				{:else}
					<div class="flex items-center gap-4">
						<a
							href="/login"
							onclick={() => (mobileMenuOpen = false)}
							class="text-base text-black font-semibold hover:underline underline-offset-4 cursor-pointer"
						>
							Log In
						</a>
						<a
							href="/register"
							onclick={() => (mobileMenuOpen = false)}
							class="px-3.5 py-1.5 text-sm bg-black text-white font-semibold rounded-lg hover:bg-black/80 transition-colors cursor-pointer"
						>
							Register
						</a>
					</div>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Deck Selector Bar for Logged-In Users (only in Home Flashcard view) -->
	{#if data.user && decks.length > 0 && currentView === 'deck'}
		<div class="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-6 pb-4">
			<div class="flex items-center gap-2 flex-wrap">
				<button
					onclick={() => (showDeckModal = true)}
					class="px-3.5 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
					title="Create new deck"
				>
					<span>Add Deck</span>
				</button>
				{#each decks as d (d.id)}
					<button
						onclick={() => selectDeck(d)}
						class="px-3.5 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 {currentDeck?.id === d.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5 border border-black/5'}"
					>
						<span>{d.title}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Main Content Area -->
	{#if currentView === 'deck'}
		<main class="w-full max-w-md flex flex-col items-center mt-4">
			{#if loading}
				<div class="w-full h-64 bg-white/70 rounded-2xl flex items-center justify-center">
					<span class="text-black font-medium">Loading cards...</span>
				</div>
			{:else if !data.user}
				<div class="w-full p-8 bg-white rounded-3xl text-center flex flex-col items-center gap-4">
					<div>
						<h3 class="text-lg font-black text-black">
							Sign in to create your deck!
						</h3>
					</div>
					<div class="flex items-center gap-3 mt-2">
						<a
							href="/login"
							class="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-black/80 transition-colors"
						>
							Log In
						</a>
					</div>
				</div>
			{:else if decks.length === 0}
				<!-- No decks created yet -->
				<div class="w-full p-8 bg-white rounded-3xl text-center flex flex-col items-center gap-4">
					<div>
						<h3 class="text-lg font-black text-black">Create your first deck!</h3>
						<p class="text-black text-sm mt-1">
							Decks organize your flashcards into custom collections or topics.
						</p>
					</div>
					<button
						onclick={() => (showDeckModal = true)}
						class="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
					>
						Create New Deck
					</button>
				</div>
			{:else if currentCard}
				<!-- Flashcard container -->
				<div
					class="flashcard w-full select-none p-6 sm:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between {cardAnimClass}"
				>
					<!-- Header inside card -->
					<div class="flex items-center justify-between text-xs font-bold text-black/60 mb-2">
						<span class="truncate max-w-[180px]">{currentCard.deck_title || currentDeck?.title || 'Deck'}</span>
					</div>

					<!-- Center Content -->
					<div class="py-3 flex flex-col items-center justify-center text-center gap-4 w-full">
						<!-- Original Word (Always shown) -->
						<div class="flex flex-col items-center gap-1 w-full">
							<h2 class="text-3xl sm:text-4xl font-regular text-black tracking-tight break-words">
								{currentCard.original_word}
							</h2>
						</div>

						<!-- Pronunciation Section (Separately toggleable) -->
						{#if currentCard.pronunciation}
							<button
								type="button"
								onclick={() => (showPronunciation = !showPronunciation)}
								class="group/pron cursor-pointer transition-all active:scale-95 focus:outline-none rounded-xl"
								title={showPronunciation ? 'Click to hide pronunciation' : 'Click to show pronunciation'}
							>
								{#if showPronunciation}
									<div class="flex items-center gap-2 bg-blue-50/90 border border-blue-200/80 text-blue-900 px-4 py-1.5 rounded-xl hover:bg-blue-100/90 transition-colors animate-fadeIn shadow-xs">
										<span class="text-sm sm:text-base font-regular">{currentCard.pronunciation}</span>
										<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
									</div>
								{:else}
									<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-xs font-semibold">
										<span>Show pronunciation</span>
									</div>
								{/if}
							</button>
						{/if}

						<!-- Translation Section (Separately toggleable) -->
						<button
							type="button"
							onclick={() => (showTranslation = !showTranslation)}
							class="group/trans cursor-pointer transition-all active:scale-95 focus:outline-none rounded-xl"
							title={showTranslation ? 'Click to hide translation' : 'Click to show translation'}
						>
							{#if showTranslation}
								<div class="flex items-center gap-2 bg-blue-50/90 border border-blue-200/80 text-blue-900 px-4 py-1.5 rounded-xl hover:bg-blue-100/90 transition-colors animate-fadeIn shadow-xs">
									<span class="text-sm sm:text-base font-regular">{currentCard.translation}</span>
									<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
								</div>
							{:else}
								<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-xs font-semibold">
									<span>Show translation</span>
								</div>
							{/if}
						</button>

						<!-- Translation Pronunciation Section (Separately toggleable) -->
						{#if currentCard.translation_pronunciation}
							<button
								type="button"
								onclick={() => (showTranslationPronunciation = !showTranslationPronunciation)}
								class="group/trans-pron cursor-pointer transition-all active:scale-95 focus:outline-none rounded-xl"
								title={showTranslationPronunciation ? 'Click to hide translation pronunciation' : 'Click to show translation pronunciation'}
							>
								{#if showTranslationPronunciation}
									<div class="flex items-center gap-2 bg-blue-50/90 border border-blue-200/80 text-blue-900 px-4 py-1.5 rounded-xl hover:bg-blue-100/90 transition-colors animate-fadeIn shadow-xs">
										<span class="text-sm sm:text-base font-regular">{currentCard.translation_pronunciation}</span>
										<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
									</div>
								{:else}
									<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-xs font-semibold">
										<span>Show translation pronunciation</span>
									</div>
								{/if}
							</button>
						{/if}
					</div>
				</div>

				<!-- Controls under card -->
				<div class="flex flex-col items-center gap-3 mt-6">
					<button
						onclick={() => pickRandomCard(cards, true)}
						disabled={isPickingCard || cards.length <= 1}
						class="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
					>
						<span>{isPickingCard ? 'Picking Card...' : 'Next Random Card'}</span>
					</button>

					{#if decks.length > 0}
						<div class="flex items-center gap-3 flex-wrap justify-center">
							<button
								onclick={() => (showModal = true)}
								class="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-blue-700 transition-colors active:scale-95"
							>
								Add Card
							</button>
							<button
								onclick={() => (showDuplicateModal = true)}
								class="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-blue-700 transition-colors active:scale-95"
							>
								Duplicate Card
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<div
					class="w-full p-8 bg-white rounded-2xl text-center flex flex-col items-center gap-4"
				>
					<p class="text-black font-bold">No cards in "{currentDeck?.title || 'deck'}" yet</p>
					<div class="flex items-center gap-3 flex-wrap justify-center">
						<button
							onclick={() => (showModal = true)}
							class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
						>
							Add card to this deck
						</button>
						{#if allCards && allCards.length > 0}
							<button
								onclick={() => (showDuplicateModal = true)}
								class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
							>
								Duplicate card
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</main>
	{:else if !data.user}
		<div
			class="w-full max-w-md p-8 bg-white rounded-3xl text-center flex flex-col items-center gap-4 mt-4"
		>
			<span class="text-4xl">📚</span>
			<div>
				<h3 class="text-lg font-black text-black">View your cards</h3>
				<p class="text-black text-sm mt-1">Please log in to manage your cards table.</p>
			</div>
			<div class="flex items-center gap-3 mt-2">
				<a
					href="/login"
					class="px-5 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-black/80 transition-colors"
				>
					Log In
				</a>
				<a
					href="/register"
					class="px-5 py-2.5 bg-amber-400 text-black text-sm font-semibold rounded-xl hover:bg-amber-300 transition-colors"
				>
					Create Account
				</a>
			</div>
		</div>
	{:else}
		<CardsTable
			cards={allCards}
			onEdit={(card) => (cardToEdit = card)}
			onDelete={(card) => (cardToDelete = card)}
			onAddCard={() => (showModal = true)}
		/>
	{/if}

	<!-- Add Card Modal -->
	{#if showModal}
		<AddModal
			currentDeck={currentDeck}
			decks={decks}
			onAdd={handleAddCard}
			onCancel={() => (showModal = false)}
		/>
	{/if}

	<!-- Duplicate Card Modal -->
	{#if showDuplicateModal}
		<DuplicateModal
			currentDeck={currentDeck}
			card={currentCard}
			decks={decks}
			onDuplicate={handleAddCard}
			onCancel={() => (showDuplicateModal = false)}
		/>
	{/if}

	<!-- Add Deck Modal -->
	{#if showDeckModal}
		<AddDeckModal
			onAdd={handleAddDeck}
			onCancel={() => (showDeckModal = false)}
		/>
	{/if}

	<!-- Delete Confirmation Modal -->
	{#if cardToDelete}
		<DeleteModal
			card={cardToDelete}
			onConfirm={handleDeleteCard}
			onCancel={() => (cardToDelete = null)}
		/>
	{/if}

	<!-- Edit Modal -->
	{#if cardToEdit}
		<EditModal
			card={cardToEdit}
			decks={decks}
			onUpdate={handleUpdateCard}
			onCancel={() => (cardToEdit = null)}
		/>
	{/if}
</div>

<style>
	.flashcard {
		will-change: transform, opacity;
	}

	.card-anim-discard {
		transform: translateX(-48px) rotate(-6deg) scale(0.92);
		opacity: 0;
		transition: transform 0.18s cubic-bezier(0.4, 0, 1, 1), opacity 0.18s ease-in;
		pointer-events: none;
	}

	.card-anim-draw-prepare {
		transform: translateX(48px) rotate(6deg) scale(0.92);
		opacity: 0;
		transition: none !important;
		pointer-events: none;
	}

	.card-anim-idle {
		transform: translateX(0) rotate(0deg) scale(1);
		opacity: 1;
		transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.24s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fadeIn {
		animation: fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
</style>

<script>
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import AddModal from './components/modals/AddModal.svelte';
	import DuplicateModal from './components/modals/DuplicateModal.svelte';
	import AddDeckModal from './components/modals/AddDeckModal.svelte';
	import EditDeckModal from './components/modals/EditDeckModal.svelte';
	import DeleteDeckModal from './components/modals/DeleteDeckModal.svelte';
	import EditModal from './components/modals/EditModal.svelte';
	import DeleteModal from './components/modals/DeleteModal.svelte';
	import CardsTable from './components/CardsTable.svelte';
	import DecksTable from './components/DecksTable.svelte';
	import SrsPracticeModal from './components/modals/SrsPracticeModal.svelte';

	let { data } = $props();

	let showModal = $state(false);
	let showDuplicateModal = $state(false);
	let showDeckModal = $state(false);
	let cardToEdit = $state(null);
	let cardToDelete = $state(null);
	let deckToEdit = $state(null);
	let deckToDelete = $state(null);
	let currentView = $state('deck'); // 'deck' | 'decks' | 'table'
	let mobileMenuOpen = $state(false);

	let decks = $state([]);
	let currentDeck = $state(null);
	let cards = $state([]);
	let allCards = $state([]);
	let currentDeckCards = $derived(
		currentDeck
			? (allCards.length > 0
				? allCards.filter((c) => c.deck_id === currentDeck.id)
				: cards.filter((c) => c.deck_id === currentDeck.id || !c.deck_id))
			: allCards
	);
	let currentCard = $state(null);
	let showPronunciation = $state(false);
	let showTranslation = $state(false);
	let showTranslationPronunciation = $state(false);
	let loading = $state(true);
	let cardAnimClass = $state('card-anim-idle');
	let isPickingCard = $state(false);

	// SRS Practice with AI state
	let showSrsModal = $state(false);
	let isPracticing = $state(false);
	let practiceGenerationError = $state('');
	let practiceSentences = $state([]);
	let practiceIndex = $state(0);
	let srsShowPronunciation = $state(true);
	let showPracticePronunciation = $state(true);
	let showPracticeTranslation = $state(false);
	let showPracticeTranslationPronunciation = $state(false);
	let practiceAnimClass = $state('card-anim-idle');
	let isNavigatingPractice = $state(false);
	let lastRequestedSentenceCount = $state(15);

	// Toast notifications
	let toast = $state(null);
	let toastTimeout = null;

	const showToast = (message, type = 'success') => {
		if (toastTimeout) clearTimeout(toastTimeout);
		toast = { message, type };
		toastTimeout = setTimeout(() => {
			toast = null;
		}, 3500);
	};

	const dismissToast = () => {
		if (toastTimeout) clearTimeout(toastTimeout);
		toast = null;
	};

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
				decks = (fetchedDecks || []).sort(
					(a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
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
		exitPractice();
		fetchCards(deck?.id);
	};

	const handleStartSrsPractice = async (sentenceCount, showPronunciation = true) => {
		lastRequestedSentenceCount = sentenceCount;
		srsShowPronunciation = showPronunciation;
		practiceGenerationError = '';

		try {
			const res = await fetch('/api/ai/practice', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					deck_id: currentDeck?.id,
					sentence_count: sentenceCount,
					show_pronunciation: showPronunciation
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to generate practice sentences');
			}

			practiceSentences = data.sentences || [];
			practiceIndex = 0;
			showPracticePronunciation = srsShowPronunciation;
			showPracticeTranslation = false;
			showPracticeTranslationPronunciation = false;
			showSrsModal = false;
			isPracticing = true;
		} catch (err) {
			console.error('SRS generation error:', err);
			practiceGenerationError = err.message || 'Failed to generate practice sentences';
			throw err;
		}
	};

	const exitPractice = () => {
		isPracticing = false;
		practiceGenerationError = '';
		practiceSentences = [];
		practiceIndex = 0;
		showPracticePronunciation = srsShowPronunciation;
		showPracticeTranslation = false;
		showPracticeTranslationPronunciation = false;
	};

	const nextPracticeSentence = async () => {
		if (isNavigatingPractice) return;
		if (practiceIndex < practiceSentences.length - 1) {
			isNavigatingPractice = true;
			practiceAnimClass = 'card-anim-discard';
			await new Promise((r) => setTimeout(r, 180));

			practiceIndex += 1;
			showPracticePronunciation = srsShowPronunciation;
			showPracticeTranslation = false;
			showPracticeTranslationPronunciation = false;

			practiceAnimClass = 'card-anim-draw-prepare';
			await new Promise((r) => setTimeout(r, 30));

			practiceAnimClass = 'card-anim-idle';
			await new Promise((r) => setTimeout(r, 280));
			isNavigatingPractice = false;
		} else {
			// Finished all sentences
			practiceIndex = practiceSentences.length;
		}
	};

	const prevPracticeSentence = async () => {
		if (isNavigatingPractice || practiceIndex <= 0) return;
		isNavigatingPractice = true;
		practiceAnimClass = 'card-anim-discard';
		await new Promise((r) => setTimeout(r, 180));

		practiceIndex -= 1;
		showPracticePronunciation = srsShowPronunciation;
		showPracticeTranslation = false;
		showPracticeTranslationPronunciation = false;

		practiceAnimClass = 'card-anim-draw-prepare';
		await new Promise((r) => setTimeout(r, 30));

		practiceAnimClass = 'card-anim-idle';
		await new Promise((r) => setTimeout(r, 280));
		isNavigatingPractice = false;
	};

	const restartPractice = () => {
		practiceIndex = 0;
		showPracticePronunciation = srsShowPronunciation;
		showPracticeTranslation = false;
		showPracticeTranslationPronunciation = false;
		practiceAnimClass = 'card-anim-idle';
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
			decks = [...decks, newDeck].sort(
				(a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
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
			showToast(`Card "${newCard.original_word}" added successfully!`, 'success');
		} catch (error) {
			console.error('Error adding card:', error);
			showToast(error.message || 'Failed to add card', 'error');
			throw error;
		}
	};

	const handleDeleteCard = async (cardId) => {
		const targetCard = allCards.find((c) => c.id === cardId) || cards.find((c) => c.id === cardId);
		const wordName = targetCard?.original_word ? `"${targetCard.original_word}"` : 'Card';

		try {
			const response = await fetch(`/api/cards/${cardId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || 'Failed to delete card');
			}

			allCards = allCards.filter((c) => c.id !== cardId);
			const updated = cards.filter((c) => c.id !== cardId);
			cards = updated;

			if (currentCard?.id === cardId) {
				pickRandomCard(updated);
			}

			cardToDelete = null;
			fetchDecks();
			showToast(`${wordName} deleted successfully!`, 'success');
		} catch (error) {
			console.error('Error deleting card:', error);
			showToast(error.message || 'Failed to delete card', 'error');
			throw error;
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
			showToast(`Card "${updatedCard.original_word}" updated successfully!`, 'success');
		} catch (error) {
			console.error('Error updating card:', error);
			showToast(error.message || 'Failed to update card', 'error');
			throw error;
		}
	};

	const handleUpdateDeck = async (deckId, formData) => {
		try {
			const response = await fetch(`/api/decks/${deckId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || 'Failed to update deck');
			}

			const updatedDeck = await response.json();
			decks = decks
				.map((d) => (d.id === deckId ? { ...d, ...updatedDeck } : d))
				.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

			if (currentDeck?.id === deckId) {
				currentDeck = { ...currentDeck, ...updatedDeck };
			}

			// Keep deck title in sync across cards
			allCards = allCards.map((c) =>
				c.deck_id === deckId ? { ...c, deck_title: updatedDeck.title } : c
			);
			cards = cards.map((c) =>
				c.deck_id === deckId ? { ...c, deck_title: updatedDeck.title } : c
			);
			if (currentCard?.deck_id === deckId) {
				currentCard = { ...currentCard, deck_title: updatedDeck.title };
			}

			deckToEdit = null;
			showToast(`Deck "${updatedDeck.title}" updated successfully!`, 'success');
		} catch (error) {
			console.error('Error updating deck:', error);
			showToast(error.message || 'Failed to update deck', 'error');
			throw error;
		}
	};

	const handleDeleteDeck = async (deckId) => {
		const targetDeck = decks.find((d) => d.id === deckId);
		const deckTitle = targetDeck?.title ? `"${targetDeck.title}"` : 'Deck';

		try {
			const response = await fetch(`/api/decks/${deckId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				throw new Error(errData.error || 'Failed to delete deck');
			}

			const remainingDecks = decks.filter((d) => d.id !== deckId);
			decks = remainingDecks;

			// Remove cards belonging to this deck from local state
			allCards = allCards.filter((c) => c.deck_id !== deckId);
			cards = cards.filter((c) => c.deck_id !== deckId);

			if (currentDeck?.id === deckId) {
				currentDeck = remainingDecks.length > 0 ? remainingDecks[0] : null;
				fetchCards(currentDeck?.id);
			} else if (currentCard && !cards.some((c) => c.id === currentCard.id)) {
				pickRandomCard(cards);
			}

			deckToDelete = null;
			showToast(`${deckTitle} deleted successfully!`, 'success');
		} catch (error) {
			console.error('Error deleting deck:', error);
			showToast(error.message || 'Failed to delete deck', 'error');
			throw error;
		}
	};
</script>

<div class="min-h-screen bg-yellow-200 flex flex-col items-center p-6 sm:p-10 relative">
	<!-- Toast Notification Banner -->
	{#if toast}
		<div
			class="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 pointer-events-auto transition-all animate-in fade-in slide-in-from-top-3 duration-200"
		>
			<div
				class="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold {toast.type === 'success'
					? 'bg-emerald-600 text-white border-emerald-700'
					: 'bg-red-600 text-white border-red-700'}"
			>
				<div class="flex items-center gap-2.5 truncate">
					<span class="truncate">{toast.message}</span>
				</div>
				<button
					type="button"
					onclick={dismissToast}
					class="p-1 rounded-lg hover:bg-black/15 transition-colors text-white/80 hover:text-white shrink-0 cursor-pointer"
					aria-label="Dismiss notification"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
	<header class="w-full max-w-5xl mb-8 relative">
		<div class="flex items-center justify-between gap-6">
			<!-- Logo -->
			<h1 class="text-3xl font-black tracking-tight text-black shrink-0">Easy Deck!</h1>

			<!-- Desktop Nav & User Info on the same line with justify-between -->
			<div class="hidden md:flex flex-1 items-center justify-between">
				<nav class="flex items-center gap-4">
					<button
						onclick={() => {
							currentView = 'deck';
							exitPractice();
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
								currentView = 'decks';
								fetchDecks();
							}}
							class="text-base font-semibold cursor-pointer text-black {currentView === 'decks'
								? 'underline underline-offset-4 decoration-2'
								: ''}"
						>
							My Decks
						</button>
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
			<div class="md:hidden mt-3 p-4 bg-white rounded-2xl border border-black/10 flex flex-col gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
				<!-- Section 1: Navigation Links -->
				<nav class="flex flex-col gap-1 w-full">
					<button
						onclick={() => {
							currentView = 'deck';
							mobileMenuOpen = false;
							exitPractice();
						}}
						class="text-left text-base font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer text-black {currentView === 'deck'
							? 'bg-black/5 font-bold underline underline-offset-4 decoration-2'
							: 'hover:bg-black/5'}"
					>
						Home
					</button>
					{#if data.user}
						<button
							onclick={() => {
								currentView = 'decks';
								fetchDecks();
								mobileMenuOpen = false;
							}}
							class="text-left text-base font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer text-black {currentView === 'decks'
								? 'bg-black/5 font-bold underline underline-offset-4 decoration-2'
								: 'hover:bg-black/5'}"
						>
							My Decks
						</button>
						<button
							onclick={() => {
								currentView = 'table';
								fetchAllCards();
								mobileMenuOpen = false;
							}}
							class="text-left text-base font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer text-black {currentView === 'table'
								? 'bg-black/5 font-bold underline underline-offset-4 decoration-2'
								: 'hover:bg-black/5'}"
						>
							My Cards
						</button>
					{/if}
				</nav>

				<!-- Divider -->
				<div class="h-px bg-black/10 w-full my-1"></div>

				<!-- Section 2: Username & Logout / Auth -->
				{#if data.user}
					<div class="flex items-center justify-between px-3 py-1">
						<span
							class="text-sm font-bold text-black truncate max-w-[200px]"
							title={data.user.username || data.user.email}
						>
							{data.user.username || data.user.email}
						</span>
						<button
							onclick={() => {
								mobileMenuOpen = false;
								handleLogout();
							}}
							class="text-sm font-bold text-red-600 hover:text-red-700 cursor-pointer"
						>
							Log out
						</button>
					</div>
				{:else}
					<div class="flex flex-col gap-2 pt-1">
						<a
							href="/login"
							onclick={() => (mobileMenuOpen = false)}
							class="w-full text-center py-2 text-base text-black font-semibold hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
						>
							Log In
						</a>
						<a
							href="/register"
							onclick={() => (mobileMenuOpen = false)}
							class="w-full text-center py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-black/80 transition-colors cursor-pointer"
						>
							Register
						</a>
					</div>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Deck Selector Bar for Logged-In Users (hidden during SRS practice) -->
	{#if data.user && decks.length > 0 && !isPracticing && (currentView === 'deck' || currentView === 'table')}
		<div class="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-6 pb-4">
			<div class="flex items-center gap-2 flex-wrap">
				{#if currentView === 'deck'}
					<button
						onclick={() => (showDeckModal = true)}
						class="px-3.5 py-1.5 rounded-lg text-base font-bold cursor-pointer transition-all flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
						title="Create new deck"
					>
						<span>Add Deck</span>
					</button>
				{/if}
				{#each decks as d (d.id)}
					<button
						onclick={() => selectDeck(d)}
						class="px-3.5 py-1.5 rounded-lg text-base font-bold cursor-pointer transition-all flex items-center gap-1.5 {currentDeck?.id === d.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-black/5 border border-black/5'}"
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
			{:else if isPracticing}
				<!-- Practice Session Container -->
				{#if practiceGenerationError}
					<div class="w-full p-8 bg-white rounded-3xl shadow-sm border border-red-100 flex flex-col items-center text-center gap-4">
						<div class="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
							⚠️
						</div>
						<div>
							<h3 class="text-lg font-black text-black">Could not generate sentences</h3>
							<p class="text-sm text-red-600 mt-1 max-w-xs">{practiceGenerationError}</p>
						</div>
						<div class="flex items-center gap-3 mt-2">
							<button
								type="button"
								onclick={() => (showSrsModal = true)}
								class="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer text-sm"
							>
								Try Again
							</button>
							<button
								type="button"
								onclick={exitPractice}
								class="px-4 py-2 bg-gray-100 text-black font-semibold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer text-sm"
							>
								Back to Deck
							</button>
						</div>
					</div>
				{:else if practiceSentences.length > 0 && practiceIndex >= practiceSentences.length}
					<!-- Completion View -->
					<div class="w-full p-8 bg-white rounded-3xl shadow-sm border border-emerald-100 flex flex-col items-center text-center gap-5">
						<div>
							<h3 class="text-2xl font-black text-black">Practice Completed</h3>
						</div>
						<div class="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs justify-center mt-2">
							<button
								type="button"
								onclick={restartPractice}
								class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all cursor-pointer text-sm shadow-xs"
							>
								Review Again
							</button>
							<button
								type="button"
								onclick={() => (showSrsModal = true)}
								class="w-full sm:w-auto px-5 py-2.5 bg-black text-white font-bold rounded-xl hover:bg-black/80 transition-all cursor-pointer text-sm shadow-xs"
							>
								New Session
							</button>
							<button
								type="button"
								onclick={exitPractice}
								class="w-full sm:w-auto px-4 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-sm"
							>
								Back
							</button>
						</div>
					</div>
				{:else if practiceSentences.length > 0}
					<!-- Active Sentence Flashcard -->
					{@const currentSentence = practiceSentences[practiceIndex]}

					
					<!-- Flashcard presentation -->
					<div
						class="flashcard w-full select-none p-6 sm:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between {practiceAnimClass}"
					>
						<!-- Card Header: Deck Title and covered words chips -->
						<div class="flex flex-col gap-2 mb-3">
							<div class="flex items-center justify-between text-base font-bold text-black/60">
								<span class="truncate max-w-[180px]">{currentDeck?.title || 'Deck'}</span>
								<span class="text-emerald-700 text-base font-bold">
									{practiceIndex + 1} / {practiceSentences.length}
								</span>
							</div>
						</div>

						<!-- Center Content -->
						<div class="py-4 flex flex-col items-center justify-center text-center gap-4 w-full">
							<!-- Full Sentence (Always shown) -->
							<div class="flex flex-col items-center gap-1 w-full">
								<h2 class="text-3xl font-regular text-black tracking-tight leading-relaxed break-words">
									{currentSentence.sentence}
								</h2>
							</div>

							<!-- Pronunciation Section (Separately toggleable) -->
							{#if srsShowPronunciation && currentSentence.pronunciation}
								<button
									type="button"
									onclick={() => (showPracticePronunciation = !showPracticePronunciation)}
									class="group/pron cursor-pointer transition-all active:scale-95 focus:outline-none rounded-xl"
									title={showPracticePronunciation ? 'Click to hide pronunciation' : 'Click to show pronunciation'}
								>
									{#if showPracticePronunciation}
										<div class="flex items-center gap-2 bg-blue-50/90 border border-blue-200/80 text-blue-900 px-4 py-1.5 rounded-xl hover:bg-blue-100/90 transition-colors animate-fadeIn shadow-xs">
											<span class="text-base font-regular">{currentSentence.pronunciation}</span>
											<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
										</div>
									{:else}
										<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-base font-semibold">
											<span>Show pronunciation</span>
										</div>
									{/if}
								</button>
							{/if}

							<!-- Translation Section (Separately toggleable) -->
							{#if currentSentence.translation}
								<button
									type="button"
									onclick={() => (showPracticeTranslation = !showPracticeTranslation)}
									class="group/trans cursor-pointer transition-all active:scale-95 focus:outline-none rounded-xl"
									title={showPracticeTranslation ? 'Click to hide translation' : 'Click to show translation'}
								>
									{#if showPracticeTranslation}
										<div class="flex items-center gap-2 bg-blue-50/90 border border-blue-200/80 text-blue-900 px-4 py-1.5 rounded-xl hover:bg-blue-100/90 transition-colors animate-fadeIn shadow-xs">
											<span class="text-base font-regular">{currentSentence.translation}</span>
											<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
										</div>
									{:else}
										<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-base font-semibold">
											<span>Show translation</span>
										</div>
									{/if}
								</button>
							{/if}

							<!-- Translation Pronunciation Section (Separately toggleable) -->
							{#if currentSentence.translation_pronunciation}
								<button
									type="button"
									onclick={() => (showPracticeTranslationPronunciation = !showPracticeTranslationPronunciation)}
									class="group/trans-pron cursor-pointer transition-all active:scale-95 focus:outline-none rounded-xl"
									title={showPracticeTranslationPronunciation ? 'Click to hide translation pronunciation' : 'Click to show translation pronunciation'}
								>
									{#if showPracticeTranslationPronunciation}
										<div class="flex items-center gap-2 bg-blue-50/90 border border-blue-200/80 text-blue-900 px-4 py-1.5 rounded-xl hover:bg-blue-100/90 transition-colors animate-fadeIn shadow-xs">
											<span class="text-base font-regular">{currentSentence.translation_pronunciation}</span>
											<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
										</div>
									{:else}
										<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-base font-semibold">
											<span>Show translation pronunciation</span>
										</div>
									{/if}
								</button>
							{/if}
						</div>
					</div>

					<!-- Navigation Controls under practice card -->
					<div class="flex items-center gap-3 mt-6">
						<button
							onclick={prevPracticeSentence}
							disabled={isNavigatingPractice || practiceIndex === 0}
							class="px-4 py-2.5 bg-white text-black text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
							title="Previous sentence"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
							<span>Previous</span>
						</button>

						<button
							onclick={nextPracticeSentence}
							disabled={isNavigatingPractice}
							class="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 hover:bg-emerald-700 active:scale-95 shadow-sm"
						>
							<span>{practiceIndex === practiceSentences.length - 1 ? 'Finish' : 'Next'}</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>

						<button
							onclick={exitPractice}
							class="px-4 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:bg-gray-100 hover:text-black active:scale-95"
							title="Exit practice session"
						>
							<span>Exit</span>
						</button>
					</div>
				{/if}
			{:else if currentCard}
				<!-- Flashcard container -->
				<div
					class="flashcard w-full select-none p-6 sm:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between {cardAnimClass}"
				>
					<!-- Header inside card -->
					<div class="flex items-center justify-between text-base font-bold text-black/60 mb-2">
						<span class="truncate max-w-[180px]">{currentCard.deck_title || currentDeck?.title || 'Deck'}</span>
					</div>

					<!-- Center Content -->
					<div class="py-3 flex flex-col items-center justify-center text-center gap-4 w-full">
						<!-- Original Word (Always shown) -->
						<div class="flex flex-col items-center gap-1 w-full">
							<h2 class="text-4xl font-regular text-black tracking-tight break-words">
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
										<span class="text-base font-regular">{currentCard.pronunciation}</span>
										<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
									</div>
								{:else}
									<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-base font-semibold">
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
									<span class="text-base font-regular">{currentCard.translation}</span>
									<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
								</div>
							{:else}
								<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-base font-semibold">
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
										<span class="text-base font-regular">{currentCard.translation_pronunciation}</span>
										<span class="text-[10px] text-blue-500/80 font-medium ml-1">✕</span>
									</div>
								{:else}
									<div class="flex items-center gap-2 bg-gray-50 border border-gray-300 text-gray-500 px-3.5 py-1.5 rounded-xl hover:bg-gray-100 hover:text-gray-700 hover:border-gray-400 transition-all text-base font-semibold">
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
						class="px-3 py-1.5 bg-white text-black text-base font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
					>
						<span>{isPickingCard ? 'Picking Card...' : 'Next Random Card'}</span>
					</button>

					{#if decks.length > 0}
						<div class="flex items-center gap-3 flex-wrap justify-center">
							<button
								onclick={() => (showModal = true)}
								class="px-3.5 py-1.5 bg-blue-600 text-white text-base font-semibold rounded-xl cursor-pointer hover:bg-blue-700 transition-colors active:scale-95"
							>
								Add Card
							</button>
							<button
								onclick={() => (showDuplicateModal = true)}
								class="px-3.5 py-1.5 bg-blue-600 text-white text-base font-semibold rounded-xl cursor-pointer hover:bg-blue-700 transition-colors active:scale-95"
							>
								Duplicate Card
							</button>
							{#if currentDeck?.enable_srs}
								<button
									onclick={() => (showSrsModal = true)}
									disabled={!cards || cards.length === 0}
									class="px-3.5 py-1.5 bg-emerald-600 text-white text-base font-semibold rounded-xl cursor-pointer hover:bg-emerald-700 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
									title="Practice sentences"
								>
									<span>SRS Practice</span>
								</button>
							{/if}
						</div>
					{/if}
				</div>
			{:else}
				<div
					class="w-full p-8 bg-white rounded-2xl text-center flex flex-col items-center gap-4"
				>
					<p class="text-black font-bold">No cards in this deck yet</p>
					<div class="flex items-center gap-3 flex-wrap justify-center">
						<button
							onclick={() => (showModal = true)}
							class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
						>
							Add Card
						</button>
						{#if allCards && allCards.length > 0}
							<button
								onclick={() => (showDuplicateModal = true)}
								class="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
							>
								Duplicate Card
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
	{:else if currentView === 'decks'}
		<DecksTable
			decks={decks}
			onEdit={(deck) => (deckToEdit = deck)}
			onDelete={(deck) => (deckToDelete = deck)}
			onAddDeck={() => (showDeckModal = true)}
		/>
	{:else}
		<CardsTable
			cards={currentDeckCards}
			selectedDeck={currentDeck}
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

	<!-- Edit Deck Modal -->
	{#if deckToEdit}
		<EditDeckModal
			deck={deckToEdit}
			onUpdate={handleUpdateDeck}
			onCancel={() => (deckToEdit = null)}
		/>
	{/if}

	<!-- Delete Deck Modal -->
	{#if deckToDelete}
		<DeleteDeckModal
			deck={deckToDelete}
			onConfirm={handleDeleteDeck}
			onCancel={() => (deckToDelete = null)}
		/>
	{/if}

	<!-- SRS Practice Modal -->
	{#if showSrsModal}
		<SrsPracticeModal
			currentDeck={currentDeck}
			cardCount={cards.length}
			initialShowPronunciation={srsShowPronunciation}
			onStart={handleStartSrsPractice}
			onCancel={() => (showSrsModal = false)}
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

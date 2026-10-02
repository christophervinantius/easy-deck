<script>
	import { goto, invalidateAll } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	const handleLogin = async (e) => {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: username.trim(), password })
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to login');
			}

			await invalidateAll();
			goto('/');
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	};
</script>

<svelte:head>
	<title>Log In - Easy Deck!</title>
</svelte:head>

<div class="min-h-screen bg-yellow-200 flex flex-col items-center justify-center p-6 sm:p-10">
	<div class="w-full max-w-md">
		<!-- Brand Header -->
		<div class="text-center mb-8">
			<a
				href="/"
				class="inline-block text-3xl font-black tracking-tight text-black hover:opacity-80 transition-opacity"
			>
				Easy Deck!
			</a>
		</div>

		<!-- Card Form -->
		<div class="bg-white p-8 rounded-3xl">
			<h2 class="text-2xl font-black text-black mb-6">Welcome back</h2>

			{#if error}
				<div
					class="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-center gap-2"
				>
					<span>{error}</span>
				</div>
			{/if}

			<form onsubmit={handleLogin} class="flex flex-col gap-4">
				<div>
					<label for="username" class="block text-sm font-bold text-black mb-1.5">
						Username
					</label>
					<input
						id="username"
						type="text"
						required
						bind:value={username}
						placeholder="Enter your username"
						class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm font-medium transition-all"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-bold text-black mb-1.5">
						Password
					</label>
					<input
						id="password"
						type="password"
						required
						bind:value={password}
						placeholder="••••••••"
						class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm font-medium transition-all"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="mt-2 w-full py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Logging in...' : 'Log in'}
				</button>
			</form>

			<div
				class="mt-6 pt-6 border-t border-gray-100 text-center text-sm font-medium text-black"
			>
				Don't have an account?
				<a
					href="/register"
					class="font-bold text-black hover:underline underline-offset-2 ml-1"
				>
					Create an account
				</a>
			</div>
		</div>

		<div class="text-center mt-6">
			<a
				href="/"
				class="text-sm font-semibold text-black hover:underline transition-colors"
			>
				Back to home
			</a>
		</div>
	</div>
</div>

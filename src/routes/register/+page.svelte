<script>
	import { goto, invalidateAll } from '$app/navigation';

	let username = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	const handleRegister = async (e) => {
		e.preventDefault();
		error = '';

		if (username.trim().length < 3) {
			error = 'Username must be at least 3 characters long';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters long';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;

		try {
			const res = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: username.trim(), email, password })
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Failed to register');
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
	<title>Register - Easy Deck!</title>
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
			<h2 class="text-2xl font-black text-black mb-6">Create an account</h2>

			{#if error}
				<div
					class="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-center gap-2"
				>
					<span>{error}</span>
				</div>
			{/if}

			<form onsubmit={handleRegister} class="flex flex-col gap-4">
				<div>
					<label for="username" class="block text-sm font-bold text-black mb-1.5">
						Username
					</label>
					<input
						id="username"
						type="text"
						required
						bind:value={username}
						placeholder="johndoe"
						class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm font-medium transition-all"
					/>
				</div>

				<div>
					<label for="email" class="block text-sm font-bold text-black mb-1.5">
						Email
					</label>
					<input
						id="email"
						type="email"
						required
						bind:value={email}
						placeholder="you@example.com"
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
						placeholder="At least 6 characters"
						class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm font-medium transition-all"
					/>
				</div>

				<div>
					<label for="confirmPassword" class="block text-sm font-bold text-black mb-1.5">
						Confirm Password
					</label>
					<input
						id="confirmPassword"
						type="password"
						required
						bind:value={confirmPassword}
						placeholder="Re-enter your password"
						class="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm font-medium transition-all"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="mt-2 w-full py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Creating account...' : 'Create Account'}
				</button>
			</form>

			<div
				class="mt-6 pt-6 border-t border-gray-100 text-center text-sm font-medium text-black"
			>
				Already have an account?
				<a href="/login" class="font-bold text-black hover:underline underline-offset-2 ml-1">
					Log in
				</a>
			</div>
		</div>

		<div class="text-center mt-6">
			<a
				href="/"
				class="text-sm font-semibold text-black/70 hover:text-black transition-colors"
			>
				Back to home
			</a>
		</div>
	</div>
</div>

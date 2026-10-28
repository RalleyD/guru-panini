<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabase";

const router = useRouter();
const email = ref("");
const password = ref("");
const error = ref("");
const pending = ref(false);

async function signIn() {
	error.value = "";
	pending.value = true;
	const { error: authError } = await supabase.auth.signInWithPassword({
		email: email.value,
		password: password.value,
	});
	pending.value = false;
	if (authError) {
		// The server returns invalid_credentials for a wrong password and for an unknown email.
		error.value =
			authError.code === "invalid_credentials"
				? "Email or password is incorrect"
				: "Could not sign in. Try again in a moment.";
		return;
	}
	await router.push("/");
}
</script>

<template>
	<main class="sign-in">
		<div class="card sign-in-card">
			<h1 class="sr-only">Sign in</h1>
			<p class="sign-in-brand">guru-panini</p>
			<form class="sign-in-form" @submit.prevent="signIn">
				<div class="sign-in-field">
					<label for="sign-in-email" class="field-label">Email</label>
					<input
						id="sign-in-email"
						v-model="email"
						class="field"
						type="email"
						name="email"
						autocomplete="username"
						required
					/>
				</div>
				<div class="sign-in-field">
					<label for="sign-in-password" class="field-label">Password</label>
					<input
						id="sign-in-password"
						v-model="password"
						class="field"
						type="password"
						name="password"
						autocomplete="current-password"
						required
					/>
				</div>
				<p v-if="error" role="alert" class="sign-in-error">{{ error }}</p>
				<button type="submit" class="btn btn-primary" :disabled="pending">Sign in</button>
			</form>
		</div>
	</main>
</template>

<style scoped>
.sign-in {
	box-sizing: border-box;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	min-height: 100dvh;
	padding: 16px;
	background: var(--color-ground);
}

/* Near the top, not centred, so the card does not move when the error appears. */
.sign-in-card {
	width: 100%;
	max-width: 400px;
	margin-top: clamp(0px, 15dvh, 160px);
}

.sign-in-brand {
	margin: 0 0 24px;
	font-family: var(--font-heading);
	font-size: 18px;
	font-weight: 500;
}

.sign-in-form {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.sign-in-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.sign-in-error {
	margin: 0;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}
</style>

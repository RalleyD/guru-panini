<script setup lang="ts">
import { nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../lib/supabase";
import {
	type AddTranslatorForm,
	addTranslatorSchema,
	languagePairOptions,
} from "../lib/translators";

type RequiredField = "name" | "email";

const router = useRouter();
const form = ref<AddTranslatorForm>({
	name: "",
	email: "",
	language_pairs: [],
	specialisms: "",
	availability: "",
});
const errors = ref<Partial<Record<RequiredField, string>>>({});
const saveFailed = ref(false);
const pending = ref(false);
const formEl = ref<HTMLFormElement>();

async function addTranslator() {
	saveFailed.value = false;
	const result = addTranslatorSchema.safeParse(form.value);
	if (!result.success) {
		const found: Partial<Record<RequiredField, string>> = {};
		for (const issue of result.error.issues) {
			const field = issue.path[0] as RequiredField;
			found[field] ??= issue.message;
		}
		errors.value = found;
		await nextTick();
		formEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
		return;
	}
	errors.value = {};
	pending.value = true;
	const { error } = await supabase.from("translators").insert(result.data);
	pending.value = false;
	if (error) {
		saveFailed.value = true;
		return;
	}
	await router.push("/translators");
}
</script>

<template>
	<header class="add-translator-header">
		<RouterLink to="/translators" class="add-translator-back">Back to translators</RouterLink>
		<h1 class="h1">Add translator</h1>
		<p class="add-translator-intro">A name and an email are enough to begin.</p>
	</header>

	<form ref="formEl" class="add-translator-form" novalidate @submit.prevent="addTranslator">
		<section aria-labelledby="add-translator-start-h" class="card add-translator-card">
			<h2 id="add-translator-start-h" class="h2">To start</h2>
			<div class="add-translator-pair">
				<div class="add-translator-field">
					<label for="add-translator-name" class="field-label">Name</label>
					<input
						id="add-translator-name"
						v-model="form.name"
						class="field"
						type="text"
						:aria-invalid="errors.name ? 'true' : undefined"
						:aria-describedby="errors.name ? 'add-translator-name-error' : undefined"
					/>
					<p v-if="errors.name" id="add-translator-name-error" class="add-translator-error">
						{{ errors.name }}
					</p>
				</div>
				<div class="add-translator-field">
					<label for="add-translator-email" class="field-label">Email</label>
					<input
						id="add-translator-email"
						v-model="form.email"
						class="field"
						type="email"
						:aria-invalid="errors.email ? 'true' : undefined"
						:aria-describedby="errors.email ? 'add-translator-email-error' : undefined"
					/>
					<p v-if="errors.email" id="add-translator-email-error" class="add-translator-error">
						{{ errors.email }}
					</p>
				</div>
			</div>
		</section>

		<section aria-labelledby="add-translator-optional-h" class="card add-translator-card">
			<div>
				<h2 id="add-translator-optional-h" class="h2">Optional</h2>
				<p class="add-translator-note">All of this can be added or changed afterwards.</p>
			</div>
			<fieldset class="add-translator-pairs">
				<legend class="field-label add-translator-legend">Language pairs</legend>
				<label v-for="option in languagePairOptions" :key="option.value" class="add-translator-check">
					<input v-model="form.language_pairs" type="checkbox" :value="option.value" />
					{{ option.label }}
				</label>
			</fieldset>
			<div class="add-translator-field">
				<label for="add-translator-specialisms" class="field-label">Specialisms</label>
				<input
					id="add-translator-specialisms"
					v-model="form.specialisms"
					class="field"
					type="text"
					placeholder="e.g. legal, technical"
				/>
			</div>
			<div class="add-translator-field">
				<label for="add-translator-availability" class="field-label">Availability</label>
				<input
					id="add-translator-availability"
					v-model="form.availability"
					class="field"
					type="text"
					placeholder="e.g. not available 10 to 14 Nov"
				/>
			</div>
		</section>

		<div v-if="saveFailed" role="alert" class="add-translator-save-error">
			<strong>Your changes were not saved</strong>
			<span>Nothing was lost. Your edits are still on this page. Try again.</span>
		</div>

		<div class="add-translator-actions">
			<button type="submit" class="btn btn-primary" :disabled="pending">Add translator</button>
			<RouterLink to="/translators" class="btn">Cancel</RouterLink>
		</div>
	</form>
</template>

<style scoped>
.add-translator-header {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.add-translator-back {
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	min-height: var(--touch-target);
	color: var(--color-muted);
	font-size: 13px;
}

.add-translator-intro {
	max-width: 52ch;
	margin: 0;
	color: var(--color-muted);
	font-size: 16px;
}

.add-translator-form {
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
	max-width: 680px;
}

.add-translator-card {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.add-translator-pair {
	display: flex;
	flex-wrap: wrap;
	gap: 18px;
}

.add-translator-pair > .add-translator-field {
	flex: 1 1 200px;
	min-width: 0;
}

.add-translator-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.add-translator-note {
	margin: 4px 0 0;
	color: var(--color-muted);
	font-size: 13px;
}

.add-translator-pairs {
	display: flex;
	flex-wrap: wrap;
	gap: 4px 28px;
	margin: 0;
	padding: 0;
	border: 0;
}

.add-translator-legend {
	float: left;
	width: 100%;
	margin-bottom: 4px;
	padding: 0;
}

.add-translator-check {
	display: flex;
	align-items: center;
	gap: 10px;
	min-height: var(--touch-target);
}

.add-translator-check input {
	width: 20px;
	height: 20px;
	margin: 0;
	accent-color: var(--color-primary);
}

.add-translator-error {
	margin: 0;
	color: var(--color-attention-ink);
	font-size: 13px;
}

.add-translator-save-error {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.add-translator-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}
</style>

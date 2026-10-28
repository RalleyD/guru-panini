<script setup lang="ts">
import { nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import {
	type AddClientForm,
	addClientSchema,
	languagePairOptions,
	notSureYet,
	workTypeOptions,
} from "../lib/clients";
import { supabase } from "../lib/supabase";

type RequiredField = "name" | "contact_name" | "contact_email";

const router = useRouter();
const form = ref<AddClientForm>({
	name: "",
	contact_name: "",
	contact_email: "",
	language_pair: notSureYet,
	work_type: notSureYet,
	notes: "",
});
const errors = ref<Partial<Record<RequiredField, string>>>({});
const saveFailed = ref(false);
const pending = ref(false);
const formEl = ref<HTMLFormElement>();

async function addClient() {
	saveFailed.value = false;
	const result = addClientSchema.safeParse(form.value);
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
	const { data, error } = await supabase
		.from("clients")
		.insert(result.data)
		.select("id")
		.single();
	pending.value = false;
	if (error) {
		saveFailed.value = true;
		return;
	}
	await router.push({ path: "/clients", query: { client: data.id } });
}
</script>

<template>
	<header class="add-client-header">
		<RouterLink to="/clients" class="add-client-back">Back to clients</RouterLink>
		<h1 class="h1">Add client</h1>
		<p class="add-client-intro">A name and a contact are enough to begin.</p>
	</header>

	<form ref="formEl" class="add-client-form" novalidate @submit.prevent="addClient">
		<section aria-labelledby="add-client-start-h" class="card add-client-card">
			<h2 id="add-client-start-h" class="h2">To start</h2>
			<div class="add-client-field">
				<label for="add-client-name" class="field-label">Client name</label>
				<input
					id="add-client-name"
					v-model="form.name"
					class="field"
					type="text"
					placeholder="e.g. Company or person"
					:aria-invalid="errors.name ? 'true' : undefined"
					:aria-describedby="errors.name ? 'add-client-name-error' : undefined"
				/>
				<p v-if="errors.name" id="add-client-name-error" class="add-client-error">{{ errors.name }}</p>
			</div>
			<div class="add-client-pair">
				<div class="add-client-field">
					<label for="add-client-contact-name" class="field-label">Contact name</label>
					<input
						id="add-client-contact-name"
						v-model="form.contact_name"
						class="field"
						type="text"
						:aria-invalid="errors.contact_name ? 'true' : undefined"
						:aria-describedby="errors.contact_name ? 'add-client-contact-name-error' : undefined"
					/>
					<p v-if="errors.contact_name" id="add-client-contact-name-error" class="add-client-error">
						{{ errors.contact_name }}
					</p>
				</div>
				<div class="add-client-field">
					<label for="add-client-contact-email" class="field-label">Contact email</label>
					<input
						id="add-client-contact-email"
						v-model="form.contact_email"
						class="field"
						type="email"
						:aria-invalid="errors.contact_email ? 'true' : undefined"
						:aria-describedby="errors.contact_email ? 'add-client-contact-email-error' : undefined"
					/>
					<p v-if="errors.contact_email" id="add-client-contact-email-error" class="add-client-error">
						{{ errors.contact_email }}
					</p>
				</div>
			</div>
		</section>

		<section aria-labelledby="add-client-optional-h" class="card add-client-card">
			<div>
				<h2 id="add-client-optional-h" class="h2">Optional</h2>
				<p class="add-client-note">All of this can be added or changed afterwards.</p>
			</div>
			<div class="add-client-pair">
				<div class="add-client-field">
					<label for="add-client-pair" class="field-label">Usual language pair</label>
					<select id="add-client-pair" v-model="form.language_pair" class="field">
						<option v-for="option in languagePairOptions" :key="option.label">{{ option.label }}</option>
					</select>
				</div>
				<div class="add-client-field">
					<label for="add-client-work" class="field-label">Usual type of work</label>
					<select id="add-client-work" v-model="form.work_type" class="field">
						<option v-for="option in workTypeOptions" :key="option.label">{{ option.label }}</option>
					</select>
				</div>
			</div>
			<div class="add-client-field">
				<label for="add-client-notes" class="field-label">Notes</label>
				<textarea
					id="add-client-notes"
					v-model="form.notes"
					class="field add-client-notes"
					rows="3"
					placeholder="e.g. Formal tone, British spelling, prefers email"
				></textarea>
			</div>
		</section>

		<div v-if="saveFailed" role="alert" class="add-client-save-error">
			<strong>Your changes were not saved</strong>
			<span>Nothing was lost. Your edits are still on this page. Try again.</span>
		</div>

		<div class="add-client-actions">
			<button type="submit" class="btn btn-primary" :disabled="pending">Add client</button>
			<RouterLink to="/clients" class="btn">Cancel</RouterLink>
		</div>
	</form>
</template>

<style scoped>
.add-client-header {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.add-client-back {
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	min-height: var(--touch-target);
	color: var(--color-muted);
	font-size: 13px;
}

.add-client-intro {
	max-width: 52ch;
	margin: 0;
	color: var(--color-muted);
	font-size: 16px;
}

.add-client-form {
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
	max-width: 680px;
}

.add-client-card {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.add-client-pair {
	display: flex;
	flex-wrap: wrap;
	gap: 18px;
}

.add-client-pair > .add-client-field {
	flex: 1 1 200px;
	min-width: 0;
}

.add-client-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.add-client-note {
	margin: 4px 0 0;
	color: var(--color-muted);
	font-size: 13px;
}

.add-client-notes {
	resize: vertical;
}

.add-client-error {
	margin: 0;
	color: var(--color-attention-ink);
	font-size: 13px;
}

.add-client-save-error {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.add-client-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}
</style>

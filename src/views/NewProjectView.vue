<script setup lang="ts">
import type { QueryData } from "@supabase/supabase-js";
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { z } from "zod";
import { countDocxWords } from "../lib/docx";
import {
	documentTypeLabels,
	type NewProjectForm,
	newProjectSchema,
	pairHint,
	pairOptions,
	type SourceFileKind,
	sourceFileKind,
	usualPair,
	wordCountLine,
} from "../lib/projects";
import { supabase } from "../lib/supabase";

type RequiredField = Exclude<keyof NewProjectForm, "translator_id">;
type SourceFile = { file: File; kind: SourceFileKind; wordCount?: number };

function clientsQuery() {
	return supabase
		.from("clients")
		.select("id, name, usual_source_language, usual_target_language")
		.is("archived_at", null)
		.order("name");
}

function translatorsQuery() {
	return supabase
		.from("translators")
		.select("id, name")
		.is("archived_at", null)
		.order("name");
}

type Client = QueryData<ReturnType<typeof clientsQuery>>[number];
type Translator = QueryData<ReturnType<typeof translatorsQuery>>[number];

const router = useRouter();
const clients = ref<Client[]>([]);
const translators = ref<Translator[]>([]);
const loading = ref(true);
const loadFailed = ref(false);
const form = ref<NewProjectForm>({
	client_id: "",
	title: "",
	document_type: "",
	due_date: "",
	language_pair: "",
	translator_id: "",
});
const errors = ref<Partial<Record<RequiredField, string>>>({});
const sourceFile = ref<SourceFile>();
const readingFile = ref(false);
const fileUnreadable = ref(false);
const saveFailed = ref(false);
const pending = ref(false);
const formEl = ref<HTMLFormElement>();
// The last uploaded file, so a retry after a failed save does not upload it again.
let uploaded: { file: File; path: string } | undefined;

async function load() {
	loading.value = true;
	loadFailed.value = false;
	const [clientsResult, translatorsResult] = await Promise.all([
		clientsQuery(),
		translatorsQuery(),
	]);
	loading.value = false;
	if (clientsResult.error || translatorsResult.error) {
		loadFailed.value = true;
		return;
	}
	clients.value = clientsResult.data;
	translators.value = translatorsResult.data;
}

load();

const selectedClient = computed(() =>
	clients.value.find((client) => client.id === form.value.client_id),
);
const pairs = computed(() => pairOptions(selectedClient.value));
const hint = computed(() =>
	pairHint(selectedClient.value, form.value.language_pair),
);

// Choosing a client resets the pair to the client's usual pair, if it has one.
// Otherwise a pair that is no longer listed (another client's usual pair) is cleared.
watch(selectedClient, (client) => {
	const usual = client && usualPair(client);
	if (usual) form.value.language_pair = usual;
	else if (
		!pairs.value.some((pair) => pair.value === form.value.language_pair)
	) {
		form.value.language_pair = "";
	}
});

function describedBy(
	...ids: (string | false | undefined)[]
): string | undefined {
	return ids.filter(Boolean).join(" ") || undefined;
}

async function chooseFile(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	sourceFile.value = undefined;
	fileUnreadable.value = false;
	if (!file) return;
	const kind = sourceFileKind(file.name);
	if (kind?.extension === "pdf") {
		sourceFile.value = { file, kind };
		return;
	}
	const wordCount = kind && (await readWordCount(file));
	// Another file was chosen while this one was being read.
	if (input.files?.[0] !== file) return;
	if (!kind || wordCount === undefined) {
		fileUnreadable.value = true;
		input.value = "";
		return;
	}
	sourceFile.value = { file, kind, wordCount };
}

// Undefined when the file is not a Word file that can be read.
async function readWordCount(file: File): Promise<number | undefined> {
	readingFile.value = true;
	try {
		return countDocxWords(new Uint8Array(await file.arrayBuffer()));
	} catch {
		return undefined;
	} finally {
		readingFile.value = false;
	}
}

async function upload(source: SourceFile): Promise<string | undefined> {
	if (uploaded?.file === source.file) return uploaded.path;
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) return undefined;
	const path = `${session.user.id}/${crypto.randomUUID()}.${source.kind.extension}`;
	const { error } = await supabase.storage
		.from("source-files")
		.upload(path, source.file, { contentType: source.kind.contentType });
	if (error) return undefined;
	uploaded = { file: source.file, path };
	return path;
}

async function createProject() {
	saveFailed.value = false;
	const result = newProjectSchema.safeParse(form.value);
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
	const saved = await save(result.data);
	pending.value = false;
	if (!saved) {
		saveFailed.value = true;
		return;
	}
	await router.push("/projects");
}

async function save(
	project: z.output<typeof newProjectSchema>,
): Promise<boolean> {
	const source = sourceFile.value;
	const path = source && (await upload(source));
	if (source && !path) return false;
	const { error } = await supabase.rpc("create_project", {
		...project,
		word_count: source?.wordCount,
		source_file_path: path,
		source_file_name: source?.file.name,
	});
	return !error;
}
</script>

<template>
	<header class="new-project-header">
		<RouterLink to="/projects" class="new-project-back">Back to projects</RouterLink>
		<h1 class="h1">New project</h1>
		<p class="new-project-intro">Five things to start. You can add everything else later.</p>
	</header>

	<div v-if="loadFailed" class="card new-project-load-error">
		<p role="alert" class="new-project-alert">Clients and translators could not be loaded. Nothing was lost.</p>
		<div>
			<button type="button" class="btn" @click="load">Try again</button>
		</div>
	</div>

	<form v-else-if="!loading" ref="formEl" class="new-project-form" novalidate @submit.prevent="createProject">
		<section aria-labelledby="new-project-start-h" class="card new-project-card">
			<h2 id="new-project-start-h" class="h2">To start</h2>
			<div class="new-project-field">
				<label for="new-project-client" class="field-label">Client</label>
				<select
					id="new-project-client"
					v-model="form.client_id"
					class="field"
					:aria-invalid="errors.client_id ? 'true' : undefined"
					:aria-describedby="
						describedBy(errors.client_id && 'new-project-client-error', clients.length === 0 && 'new-project-no-clients')
					"
				>
					<option value="" disabled>Choose a client</option>
					<option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
				</select>
				<p v-if="errors.client_id" id="new-project-client-error" class="new-project-error">{{ errors.client_id }}</p>
				<p v-if="clients.length === 0" id="new-project-no-clients" class="new-project-no-clients">
					No clients yet.
					<RouterLink to="/clients/new" class="new-project-link">Add client</RouterLink>
				</p>
			</div>
			<div class="new-project-field">
				<label for="new-project-title" class="field-label">Title</label>
				<input
					id="new-project-title"
					v-model="form.title"
					class="field"
					type="text"
					placeholder="e.g. Annual report summary"
					:aria-invalid="errors.title ? 'true' : undefined"
					:aria-describedby="errors.title ? 'new-project-title-error' : undefined"
				/>
				<p v-if="errors.title" id="new-project-title-error" class="new-project-error">{{ errors.title }}</p>
			</div>
			<div class="new-project-pair">
				<div class="new-project-field">
					<label for="new-project-type" class="field-label">Document type</label>
					<select
						id="new-project-type"
						v-model="form.document_type"
						class="field"
						:aria-invalid="errors.document_type ? 'true' : undefined"
						:aria-describedby="errors.document_type ? 'new-project-type-error' : undefined"
					>
						<option value="">Choose one</option>
						<option v-for="(label, value) in documentTypeLabels" :key="value" :value="value">{{ label }}</option>
					</select>
					<p v-if="errors.document_type" id="new-project-type-error" class="new-project-error">
						{{ errors.document_type }}
					</p>
				</div>
				<div class="new-project-field">
					<label for="new-project-due" class="field-label">Due date</label>
					<input
						id="new-project-due"
						v-model="form.due_date"
						class="field new-project-due"
						type="date"
						:aria-invalid="errors.due_date ? 'true' : undefined"
						:aria-describedby="errors.due_date ? 'new-project-due-error' : undefined"
					/>
					<p v-if="errors.due_date" id="new-project-due-error" class="new-project-error">{{ errors.due_date }}</p>
				</div>
			</div>
			<div class="new-project-field">
				<label for="new-project-pair" class="field-label">Language pair</label>
				<select
					id="new-project-pair"
					v-model="form.language_pair"
					class="field"
					:aria-invalid="errors.language_pair ? 'true' : undefined"
					:aria-describedby="
						describedBy(errors.language_pair && 'new-project-pair-error', hint && 'new-project-pair-hint')
					"
				>
					<option value="">Choose one</option>
					<option v-for="pair in pairs" :key="pair.value" :value="pair.value">{{ pair.label }}</option>
				</select>
				<p v-if="errors.language_pair" id="new-project-pair-error" class="new-project-error">
					{{ errors.language_pair }}
				</p>
				<p v-if="hint" id="new-project-pair-hint" class="new-project-hint">{{ hint }}</p>
			</div>
		</section>

		<section aria-labelledby="new-project-optional-h" class="card new-project-card">
			<div>
				<h2 id="new-project-optional-h" class="h2">Optional</h2>
				<p class="new-project-note">All of this can be added or changed afterwards.</p>
			</div>
			<div class="new-project-field">
				<label for="new-project-file" class="field-label">Source file</label>
				<input
					id="new-project-file"
					class="field new-project-file"
					type="file"
					accept=".docx,.pdf"
					:aria-describedby="describedBy('new-project-file-hint', fileUnreadable && 'new-project-file-error')"
					@change="chooseFile"
				/>
				<p id="new-project-file-hint" class="new-project-hint" aria-live="polite">
					{{
						sourceFile?.wordCount === undefined
							? "The word count is read from the file. Without a file, no word count is shown."
							: wordCountLine(sourceFile.wordCount)
					}}
				</p>
				<div v-if="fileUnreadable" id="new-project-file-error" role="alert" class="new-project-alert new-project-message">
					<strong>That file could not be read</strong>
					<span>Word and PDF files work best. You can create the project now and add the file later.</span>
				</div>
			</div>
			<div class="new-project-field">
				<label for="new-project-translator" class="field-label">Translator</label>
				<select id="new-project-translator" v-model="form.translator_id" class="field">
					<option value="">Decide later</option>
					<option v-for="translator in translators" :key="translator.id" :value="translator.id">
						{{ translator.name }}
					</option>
				</select>
			</div>
		</section>

		<div v-if="saveFailed" role="alert" class="new-project-alert new-project-message">
			<strong>Your changes were not saved</strong>
			<span>Nothing was lost. Your edits are still on this page. Try again.</span>
		</div>

		<div class="new-project-actions">
			<button type="submit" class="btn btn-primary" :disabled="pending || readingFile">Create project</button>
			<RouterLink to="/" class="btn">Cancel</RouterLink>
		</div>
	</form>
</template>

<style scoped>
.new-project-header {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.new-project-back {
	display: inline-flex;
	align-items: center;
	align-self: flex-start;
	min-height: var(--touch-target);
	color: var(--color-muted);
	font-size: 13px;
}

.new-project-intro {
	max-width: 52ch;
	margin: 0;
	color: var(--color-muted);
	font-size: 16px;
}

.new-project-load-error {
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-width: 680px;
}

.new-project-form {
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
	max-width: 680px;
}

.new-project-card {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.new-project-pair {
	display: flex;
	flex-wrap: wrap;
	gap: 18px;
}

.new-project-pair > .new-project-field {
	flex: 1 1 200px;
	min-width: 0;
}

.new-project-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.new-project-file {
	min-width: 0;
	padding: 9px 14px;
}

/* The date picker button inside the field takes focus without matching :focus-visible. */
.new-project-due:focus-within {
	outline: var(--focus-ring-width) solid var(--focus-ring-color);
	outline-offset: 2px;
}

.new-project-note {
	margin: 4px 0 0;
	color: var(--color-muted);
	font-size: 13px;
}

.new-project-hint,
.new-project-no-clients {
	margin: 0;
	color: var(--color-muted);
	font-size: 12px;
}

.new-project-no-clients {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0 8px;
	font-size: 13px;
}

.new-project-link {
	display: inline-flex;
	align-items: center;
	min-height: var(--touch-target);
	color: var(--color-primary);
	font-weight: 500;
}

.new-project-error {
	margin: 0;
	color: var(--color-attention-ink);
	font-size: 13px;
}

.new-project-alert {
	margin: 0;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.new-project-message {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.new-project-actions {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}
</style>

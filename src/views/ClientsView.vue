<script setup lang="ts">
import type { QueryData } from "@supabase/supabase-js";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import {
	activeProjectCount,
	type ClientWorkType,
	isFollowUpDue,
	longPairLabel,
	searchClients,
	shortPairLabel,
	workTypeLabels,
} from "../lib/clients";
import { supabase } from "../lib/supabase";

function clientsQuery() {
	return supabase
		.from("clients")
		.select(
			"id, name, contact_name, contact_email, usual_source_language, usual_target_language, usual_work_type, writing_preferences, notes, has_glossary, projects (id, title, due_date, archived_at, follow_ups (state))",
		)
		.is("archived_at", null)
		.order("name");
}

type Client = QueryData<ReturnType<typeof clientsQuery>>[number];

const route = useRoute();
const clients = ref<Client[]>([]);
const loading = ref(true);
const loadFailed = ref(false);
const search = ref("");

async function load() {
	loading.value = true;
	loadFailed.value = false;
	const { data, error } = await clientsQuery();
	loading.value = false;
	if (error) {
		loadFailed.value = true;
		return;
	}
	clients.value = data;
}

load();

const filtered = computed(() => searchClients(clients.value, search.value));

const intro = computed(() => {
	const total = clients.value.length;
	const waiting = clients.value.filter(isFollowUpDue).length;
	const first = total === 1 ? "1 client." : `${total} clients.`;
	if (waiting === 0) return first;
	return waiting === 1
		? `${first} 1 is waiting to hear from you.`
		: `${first} ${waiting} are waiting to hear from you.`;
});

const selected = computed(
	() =>
		filtered.value.find((client) => client.id === route.query.client) ??
		filtered.value[0],
);

// Newest due date first; ISO dates sort as strings.
const history = computed(() =>
	[...(selected.value?.projects ?? [])].sort((a, b) =>
		b.due_date.localeCompare(a.due_date),
	),
);

function joined(...parts: (string | undefined)[]): string {
	return parts.filter(Boolean).join(" · ");
}

function workTypeLabel(workType: ClientWorkType | null): string | undefined {
	return workType ? workTypeLabels[workType] : undefined;
}

function rowDetail(client: Client): string {
	return joined(
		shortPairLabel(client.usual_source_language, client.usual_target_language),
		workTypeLabel(client.usual_work_type),
	);
}

const panelDetail = computed(
	() =>
		selected.value &&
		joined(
			workTypeLabel(selected.value.usual_work_type),
			longPairLabel(
				selected.value.usual_source_language,
				selected.value.usual_target_language,
			),
		),
);

function activeLabel(client: Client): string {
	const count = activeProjectCount(client);
	return count === 0 ? "None active" : `${count} active`;
}

// en-US because en-GB abbreviates September as "Sept"; UTC so the date never shifts a day.
const dueParts = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

function dueLabel(date: string): string {
	const parts = Object.fromEntries(
		dueParts
			.formatToParts(new Date(`${date}T00:00:00Z`))
			.map((part) => [part.type, part.value]),
	);
	return `Due ${parts.day} ${parts.month} ${parts.year}`;
}
</script>

<template>
	<header class="clients-header">
		<div>
			<h1 class="h1">Clients</h1>
			<p v-if="clients.length > 0" class="clients-intro">{{ intro }}</p>
		</div>
		<div class="clients-actions">
			<input
				v-model="search"
				class="field clients-search"
				type="text"
				aria-label="Search clients"
				placeholder="Search clients"
			/>
			<RouterLink to="/clients/new" class="btn btn-primary">Add client</RouterLink>
		</div>
	</header>

	<div v-if="loadFailed" class="card clients-message">
		<p role="alert" class="clients-error">Clients could not be loaded. Nothing was lost.</p>
		<div>
			<button type="button" class="btn" @click="load">Try again</button>
		</div>
	</div>

	<div v-else-if="!loading && clients.length === 0" class="card clients-message">
		<h2 class="h3">No clients yet</h2>
		<p class="clients-muted">Add a client to start a project.</p>
		<div>
			<RouterLink to="/clients/new" class="btn btn-primary">Add client</RouterLink>
		</div>
	</div>

	<div v-else-if="!loading" class="clients-body">
		<section aria-labelledby="clients-list-h" class="card clients-list">
			<h2 id="clients-list-h" class="h2 clients-list-h">All clients</h2>
			<template v-if="filtered.length > 0">
				<div class="clients-columns">
					<span class="clients-col-name">Client</span>
					<span class="clients-col-work">Work</span>
					<span class="clients-col-status">Status</span>
				</div>
				<!-- Custom so aria-current marks the selected client; RouterLink ignores the query. -->
				<RouterLink
					v-for="client in filtered"
					:key="client.id"
					v-slot="{ href, navigate }"
					:to="{ path: '/clients', query: { client: client.id }, hash: '#client' }"
					custom
				>
					<a
						:href="href"
						class="clients-row"
						:aria-current="client.id === selected?.id ? 'true' : undefined"
						@click="navigate"
					>
						<span class="clients-col-name">
							<span class="clients-name">{{ client.name }}</span>
							<span v-if="rowDetail(client)" class="clients-row-detail">{{ rowDetail(client) }}</span>
						</span>
						<span class="clients-col-work clients-work">{{ activeLabel(client) }}</span>
						<span class="clients-col-status">
							<span v-if="isFollowUpDue(client)" class="chip chip-attention">Follow-up due</span>
						</span>
					</a>
				</RouterLink>
			</template>
			<div v-else class="clients-no-match">
				<h3 class="h3">No clients match “{{ search.trim() }}”</h3>
				<p class="clients-muted">Check the spelling, or clear the search.</p>
				<div>
					<button type="button" class="btn" @click="search = ''">Clear search</button>
				</div>
			</div>
		</section>

		<aside v-if="selected" id="client" aria-labelledby="client-h" class="card clients-panel">
			<div class="clients-panel-title">
				<span class="clients-small">Selected client</span>
				<h2 id="client-h" class="h2 clients-panel-name">{{ selected.name }}</h2>
				<span v-if="panelDetail" class="clients-panel-sub">{{ panelDetail }}</span>
			</div>

			<div class="clients-panel-section">
				<h3 class="clients-panel-h">Contact</h3>
				<dl class="clients-contact">
					<dt>Name</dt>
					<dd>{{ selected.contact_name }}</dd>
					<dt>Email</dt>
					<dd>{{ selected.contact_email }}</dd>
				</dl>
			</div>

			<div class="clients-panel-section">
				<h3 class="clients-panel-h">How they like it written</h3>
				<p v-if="selected.writing_preferences" class="clients-text">{{ selected.writing_preferences }}</p>
				<p v-if="selected.notes" class="clients-text">{{ selected.notes }}</p>
				<p v-if="!selected.writing_preferences && !selected.notes" class="clients-text clients-muted">
					Nothing noted yet.
				</p>
				<div>
					<span v-if="selected.has_glossary" class="chip chip-lavender">Glossary on file</span>
					<span v-else class="chip clients-chip-dashed">No glossary yet</span>
				</div>
			</div>

			<div>
				<h3 class="clients-panel-h clients-history-h">History</h3>
				<ul v-if="history.length > 0" class="clients-history">
					<li v-for="project in history" :key="project.id" class="clients-history-row">
						<span>{{ project.title }}</span>
						<span class="clients-small clients-nowrap">
							{{ project.archived_at ? "Archived" : dueLabel(project.due_date) }}
						</span>
					</li>
				</ul>
				<p v-else class="clients-text clients-muted">No projects yet.</p>
			</div>
		</aside>
	</div>
</template>

<style scoped>
.clients-header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20px;
}

.clients-intro {
	max-width: 52ch;
	margin: 8px 0 0;
	color: var(--color-muted);
	font-size: 16px;
}

.clients-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.clients-search {
	width: 220px;
	max-width: 100%;
}

.clients-message {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.clients-error {
	margin: 0;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.clients-muted {
	margin: 0;
	color: var(--color-muted);
}

.clients-body {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: 24px;
}

.clients-list {
	display: flex;
	flex: 3 1 480px;
	flex-direction: column;
	min-width: 0;
}

.clients-list-h {
	margin-bottom: 12px;
}

.clients-columns {
	display: flex;
	gap: 16px;
	padding: 8px 12px;
	color: var(--color-muted);
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.clients-row {
	box-sizing: border-box;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 16px;
	min-height: var(--touch-target);
	padding: 14px 12px;
	border-radius: 12px;
}

.clients-row:hover {
	background: var(--color-ground);
}

.clients-row[aria-current="true"] {
	background: var(--color-lavender-tint);
}

.clients-col-name {
	display: flex;
	flex: 1 1 200px;
	flex-direction: column;
	min-width: 0;
}

.clients-col-work {
	flex: 0 0 90px;
}

.clients-col-status {
	display: flex;
	flex: 0 0 120px;
	justify-content: flex-end;
}

.clients-name {
	font-weight: 500;
}

.clients-row-detail,
.clients-small {
	color: var(--color-muted);
	font-size: 12px;
}

.clients-work {
	color: var(--color-nav-ink);
	font-size: 13px;
}

.clients-no-match {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 0;
}

.clients-panel {
	display: flex;
	flex: 2 1 340px;
	flex-direction: column;
	gap: 22px;
	min-width: 0;
	scroll-margin-top: 24px;
}

.clients-panel-title {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.clients-panel-name {
	font-size: 28px;
}

.clients-panel-sub {
	color: var(--color-muted);
	font-size: 13px;
}

.clients-panel-section {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.clients-panel-h {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
}

.clients-contact {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 8px 16px;
	margin: 0;
	font-size: 13px;
}

.clients-contact dt {
	color: var(--color-muted);
}

.clients-contact dd {
	margin: 0;
	text-align: right;
	overflow-wrap: anywhere;
}

.clients-text {
	margin: 0;
}

.clients-chip-dashed {
	border: 1px dashed var(--color-muted);
	background: transparent;
}

.clients-history-h {
	margin-bottom: 6px;
}

.clients-history {
	margin: 0;
	padding: 0;
	list-style: none;
}

.clients-history-row {
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	min-height: var(--touch-target);
	padding: 6px 0;
	border-top: 1px solid var(--color-line);
}

.clients-nowrap {
	white-space: nowrap;
}

@media (max-width: 899px) {
	.clients-actions,
	.clients-search {
		width: 100%;
	}

	.clients-columns {
		display: none;
	}

	.clients-panel {
		scroll-margin-top: 72px;
	}

	.clients-panel-name {
		font-size: var(--text-h2);
	}
}
</style>

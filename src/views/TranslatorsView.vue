<script setup lang="ts">
import type { QueryData } from "@supabase/supabase-js";
import { ref } from "vue";
import { supabase } from "../lib/supabase";
import {
	activeProjectCount,
	initials,
	introLine,
	loadLabel,
	pairsLabel,
	specialismLabel,
} from "../lib/translators";

function translatorsQuery() {
	return supabase
		.from("translators")
		.select(
			"id, name, language_pairs, specialisms, availability, allocations (project_id, end_date, is_proposed, projects (archived_at))",
		)
		.is("archived_at", null)
		.order("name");
}

type Translator = QueryData<ReturnType<typeof translatorsQuery>>[number];

const translators = ref<Translator[]>([]);
const loading = ref(true);
const loadFailed = ref(false);

// Today's local date as YYYY-MM-DD, to compare with allocation end dates.
const now = new Date();
const today = [
	now.getFullYear(),
	String(now.getMonth() + 1).padStart(2, "0"),
	String(now.getDate()).padStart(2, "0"),
].join("-");

async function load() {
	loading.value = true;
	loadFailed.value = false;
	const { data, error } = await translatorsQuery();
	loading.value = false;
	if (error) {
		loadFailed.value = true;
		return;
	}
	translators.value = data;
}

load();

const avatarColours = ["lavender", "duck", "blue", "neutral"];

function avatarClass(index: number): string {
	return `translators-avatar-${avatarColours[index % avatarColours.length]}`;
}
</script>

<template>
	<header class="translators-header">
		<div>
			<h1 class="h1">Translators</h1>
			<p v-if="translators.length > 0" class="translators-intro">{{ introLine(translators) }}</p>
		</div>
		<RouterLink to="/translators/new" class="btn btn-primary">Add translator</RouterLink>
	</header>

	<div v-if="loadFailed" class="card translators-message">
		<p role="alert" class="translators-error">Translators could not be loaded. Nothing was lost.</p>
		<div>
			<button type="button" class="btn" @click="load">Try again</button>
		</div>
	</div>

	<div v-else-if="!loading && translators.length === 0" class="card translators-message">
		<h2 class="h3">No translators yet</h2>
		<p class="translators-muted">Add the people you work with so you can allocate them to projects.</p>
		<div>
			<RouterLink to="/translators/new" class="btn btn-primary">Add translator</RouterLink>
		</div>
	</div>

	<section v-else-if="!loading" aria-label="People" class="translators-people">
		<article
			v-for="(translator, index) in translators"
			:key="translator.id"
			class="card translators-card"
		>
			<div class="translators-who">
				<span class="translators-avatar" :class="avatarClass(index)" aria-hidden="true">
					{{ initials(translator.name) }}
				</span>
				<div class="translators-who-text">
					<h2 class="translators-name">{{ translator.name }}</h2>
					<div v-if="pairsLabel(translator.language_pairs)" class="translators-pairs">
						{{ pairsLabel(translator.language_pairs) }}
					</div>
				</div>
			</div>
			<div v-if="translator.specialisms.length > 0" class="translators-specialisms">
				<span
					v-for="specialism in translator.specialisms"
					:key="specialism"
					class="chip translators-specialism"
				>
					{{ specialismLabel(specialism) }}
				</span>
			</div>
			<div class="translators-status">
				<span v-if="translator.availability" class="chip chip-blue translators-availability">
					{{ translator.availability }}
				</span>
				<span class="translators-load">{{ loadLabel(activeProjectCount(translator, today)) }}</span>
			</div>
		</article>
		<RouterLink to="/translators/new" class="translators-add">Add a translator</RouterLink>
	</section>
</template>

<style scoped>
.translators-header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20px;
}

.translators-intro {
	max-width: 52ch;
	margin: 8px 0 0;
	color: var(--color-muted);
	font-size: 16px;
}

.translators-message {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.translators-error {
	margin: 0;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.translators-muted {
	margin: 0;
	color: var(--color-muted);
}

.translators-people {
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
}

.translators-card,
.translators-add {
	flex: 1 1 240px;
	min-width: 0;
}

.translators-card {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.translators-who {
	display: flex;
	align-items: center;
	gap: 14px;
}

.translators-who-text {
	min-width: 0;
}

.translators-avatar {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	font-size: 15px;
	font-weight: 600;
}

.translators-avatar-lavender {
	background: var(--color-lavender-tint-strong);
	color: var(--color-lavender-ink);
}

.translators-avatar-duck {
	background: var(--color-duck-tint);
	color: var(--color-duck-ink);
}

.translators-avatar-blue {
	background: var(--color-blue-tint-strong);
	color: var(--color-blue-ink);
}

.translators-avatar-neutral {
	background: var(--color-neutral-tint);
	color: var(--color-nav-ink);
}

.translators-name {
	margin: 0;
	font-family: var(--font-heading);
	font-size: 19px;
	font-weight: 500;
	overflow-wrap: anywhere;
}

.translators-pairs {
	color: var(--color-muted);
	font-size: 13px;
}

.translators-specialisms {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.translators-specialism {
	padding: 2px 8px;
	font-size: 11px;
	font-weight: 500;
}

.translators-status {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}

.translators-availability {
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;
	white-space: normal;
	overflow-wrap: anywhere;
}

.translators-load {
	color: var(--color-muted);
	font-size: 12px;
}

.translators-add {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	min-height: 168px;
	padding: 24px;
	border: 1px dashed var(--color-muted);
	border-radius: var(--radius-card);
	color: var(--color-nav-ink);
	font-size: 14px;
	font-weight: 500;
	text-align: center;
}
</style>

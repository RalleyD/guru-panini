<script setup lang="ts">
import type { QueryData } from "@supabase/supabase-js";
import { computed, nextTick, ref, watch } from "vue";
import { isProjectFollowUpDue, shortPairLabel } from "../lib/clients";
import {
	columnChipClasses,
	documentTypeChipClasses,
	documentTypeLabels,
	formatDate,
	type ProjectFilter,
	projectFilterLabels,
	projectGroup,
	projectStage,
	searchProjects,
} from "../lib/projects";
import { supabase } from "../lib/supabase";
import { initials } from "../lib/translators";

function projectsQuery() {
	return supabase
		.from("projects")
		.select(
			"id, title, source_language, target_language, document_type, due_date, archived_at, client:clients (name), allocations (id, role, is_proposed, start_date, translator:translators (name)), project_steps (milestone, completed_at), follow_ups (state)",
		);
}

type Project = QueryData<ReturnType<typeof projectsQuery>>[number];

const pageSize = 25;

const projects = ref<Project[]>([]);
const loading = ref(true);
const loadFailed = ref(false);
const filter = ref<ProjectFilter>("active");
const search = ref("");
const limit = ref(pageSize);
const list = ref<HTMLElement | null>(null);

async function load() {
	loading.value = true;
	loadFailed.value = false;
	const { data, error } = await projectsQuery();
	loading.value = false;
	if (error) {
		loadFailed.value = true;
		return;
	}
	projects.value = data;
}

load();

// Soonest due first, ties by title; ISO dates sort as strings.
const rows = computed(() =>
	projects.value
		.map((project) => {
			const column = projectStage(
				project.allocations,
				project.project_steps,
			).column;
			return {
				...project,
				column,
				group: projectGroup(project.archived_at, column),
				// Translators before reviewers, then by start date, as on Project detail.
				team: [...project.allocations].sort(
					(a, b) =>
						Number(a.role === "reviewer") - Number(b.role === "reviewer") ||
						a.start_date.localeCompare(b.start_date),
				),
				followUp: isProjectFollowUpDue(project),
			};
		})
		.sort(
			(a, b) =>
				a.due_date.localeCompare(b.due_date) || a.title.localeCompare(b.title),
		),
);

const filters = computed(() =>
	(Object.keys(projectFilterLabels) as ProjectFilter[]).map((id) => ({
		id,
		label: `${projectFilterLabels[id]} ${
			id === "all"
				? rows.value.length
				: rows.value.filter((row) => row.group === id).length
		}`,
	})),
);

const matching = computed(() =>
	searchProjects(
		rows.value.filter(
			(row) => filter.value === "all" || row.group === filter.value,
		),
		search.value,
	),
);

const shown = computed(() => matching.value.slice(0, limit.value));

watch([filter, search], () => {
	limit.value = pageSize;
});

async function showMore() {
	const firstNew = limit.value;
	limit.value += pageSize;
	await nextTick();
	list.value?.querySelectorAll<HTMLElement>(".projects-row")[firstNew]?.focus();
}
</script>

<template>
	<header class="projects-header">
		<div>
			<h1 class="h1">Projects</h1>
			<p v-if="projects.length > 0" class="projects-intro">
				Soonest due first. The stage of each project follows the steps completed in it.
			</p>
		</div>
		<RouterLink to="/projects/new" class="btn btn-primary">New project</RouterLink>
	</header>

	<div v-if="loadFailed" class="card projects-message">
		<p role="alert" class="projects-error">Projects could not be loaded. Nothing was lost.</p>
		<div>
			<button type="button" class="btn" @click="load">Try again</button>
		</div>
	</div>

	<div v-else-if="!loading && projects.length === 0" class="card projects-message">
		<h2 class="h3">No projects yet</h2>
		<p class="projects-muted">Create your first project and it will appear on the Overview.</p>
		<div>
			<RouterLink to="/projects/new" class="btn btn-primary">New project</RouterLink>
		</div>
	</div>

	<section v-else-if="!loading" aria-labelledby="projects-list-h" class="card projects-list">
		<h2 id="projects-list-h" class="sr-only">Project list</h2>
		<div class="projects-tools">
			<div role="group" aria-label="Show" class="projects-filters">
				<button
					v-for="item in filters"
					:key="item.id"
					type="button"
					class="btn projects-filter"
					:aria-pressed="filter === item.id"
					@click="filter = item.id"
				>
					{{ item.label }}
				</button>
			</div>
			<input
				v-model="search"
				class="field projects-search"
				type="text"
				aria-label="Search projects"
				placeholder="Search projects"
			/>
		</div>

		<div v-if="matching.length > 0" ref="list">
			<div class="projects-columns">
				<span class="projects-col-title">Project</span>
				<span class="projects-col-stage">Stage</span>
				<span class="projects-col-type">Type</span>
				<span class="projects-col-people">People</span>
				<span class="projects-col-due">Due</span>
			</div>
			<RouterLink
				v-for="row in shown"
				:key="row.id"
				:to="`/projects/${row.id}`"
				class="projects-row"
			>
				<span class="projects-col-title">
					<span class="projects-name">{{ row.title }}</span>
					<span class="projects-row-detail">
						{{ row.client.name }} · {{ shortPairLabel(row.source_language, row.target_language) }}
					</span>
				</span>
				<span class="projects-col-stage">
					<span :class="columnChipClasses[row.column]">{{ row.column }}</span>
				</span>
				<span class="projects-col-type">
					<span :class="documentTypeChipClasses[row.document_type]">
						{{ documentTypeLabels[row.document_type] }}
					</span>
				</span>
				<span class="projects-col-people">
					<template v-if="row.team.length > 0">
						<span
							v-for="allocation in row.team.slice(0, 2)"
							:key="allocation.id"
							class="projects-avatar"
							:class="allocation.role === 'reviewer' ? 'projects-avatar-reviewer' : 'projects-avatar-translator'"
							aria-hidden="true"
						>
							{{ initials(allocation.translator.name) }}
						</span>
						<span v-if="row.team.length > 2" class="projects-more" aria-hidden="true">
							+{{ row.team.length - 2 }}
						</span>
						<span class="sr-only">
							{{ row.team.map((allocation) => allocation.translator.name).join(", ") }}
						</span>
					</template>
					<span v-else class="projects-muted projects-none">None</span>
				</span>
				<span class="projects-col-due projects-due">
					<span v-if="row.followUp" class="chip chip-attention">Follow up</span>
					{{ formatDate(row.due_date) }}
				</span>
			</RouterLink>
			<div v-if="shown.length < matching.length" class="projects-more-row">
				<button type="button" class="btn" @click="showMore">Show more</button>
			</div>
		</div>
		<p v-else-if="search.trim() === ''" class="projects-nothing">Nothing here.</p>
		<div v-else class="projects-no-match">
			<h3 class="h3">No projects match “{{ search.trim() }}”</h3>
			<p class="projects-muted">Check the spelling, or clear the search.</p>
			<div>
				<button type="button" class="btn" @click="search = ''">Clear search</button>
			</div>
		</div>

		<p v-if="matching.length > 0" class="projects-footer">
			Showing {{ shown.length }} of {{ matching.length }}.
		</p>
	</section>
</template>

<style scoped>
.projects-header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20px;
}

.projects-intro {
	max-width: 52ch;
	margin: 8px 0 0;
	color: var(--color-muted);
	font-size: 16px;
}

.projects-message {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.projects-error {
	margin: 0;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.projects-muted {
	margin: 0;
	color: var(--color-muted);
}

.projects-list {
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-width: 0;
}

.projects-tools {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.projects-filters {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.projects-filter {
	padding: 0 14px;
	border-radius: var(--radius-chip);
	color: var(--color-nav-ink);
	font-size: 13px;
}

.projects-filter[aria-pressed="true"],
.projects-filter[aria-pressed="true"]:hover {
	border-color: var(--color-primary);
	background: var(--color-lavender-tint);
	color: var(--color-lavender-ink);
}

.projects-search {
	width: 240px;
	max-width: 100%;
}

.projects-columns {
	display: flex;
	gap: 16px;
	padding: 8px 12px;
	color: var(--color-muted);
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.projects-row {
	box-sizing: border-box;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px 16px;
	min-height: var(--touch-target);
	padding: 14px 12px;
	border-radius: 12px;
}

.projects-row:hover {
	background: var(--color-ground);
}

.projects-col-title {
	display: flex;
	flex: 1 1 240px;
	flex-direction: column;
	min-width: 0;
}

.projects-col-stage {
	flex: 0 0 120px;
}

.projects-col-type {
	flex: 0 0 100px;
}

/* Relative, so the hidden names stay inside the row. */
.projects-col-people {
	position: relative;
	display: flex;
	flex: 0 0 76px;
	align-items: center;
}

.projects-col-due {
	flex: 0 0 180px;
	text-align: right;
}

.projects-name {
	font-weight: 500;
}

.projects-row-detail {
	color: var(--color-muted);
	font-size: 12px;
}

.projects-avatar {
	box-sizing: border-box;
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	font-size: 10px;
	font-weight: 600;
}

.projects-avatar + .projects-avatar {
	margin-left: -6px;
	border: 2px solid var(--color-surface);
}

.projects-avatar-translator {
	background: var(--color-duck-tint);
	color: var(--color-duck-ink);
}

.projects-avatar-reviewer {
	background: var(--color-lavender-tint-strong);
	color: var(--color-lavender-ink);
}

.projects-more {
	margin-left: 4px;
	color: var(--color-muted);
	font-size: 12px;
}

.projects-none {
	font-size: 12px;
}

.projects-due {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8px;
	color: var(--color-nav-ink);
	font-size: 13px;
	white-space: nowrap;
}

.projects-more-row {
	padding: 12px 12px 0;
}

.projects-nothing {
	margin: 0;
	padding: 18px 12px 4px;
	color: var(--color-nav-ink);
}

.projects-no-match {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 0;
}

.projects-footer {
	margin: 0;
	padding: 0 12px;
	color: var(--color-muted);
	font-size: 13px;
}

@media (max-width: 899px) {
	.projects-search {
		width: 100%;
	}

	.projects-columns {
		display: none;
	}
}
</style>

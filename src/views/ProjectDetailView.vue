<script setup lang="ts">
import type { QueryData } from "@supabase/supabase-js";
import { computed, nextTick, ref } from "vue";
import { useRoute } from "vue-router";
import { z } from "zod";
import { longPairLabel, shortPairLabel } from "../lib/clients";
import { composeUrl, newTabAttrs } from "../lib/email";
import {
	columnChipClasses,
	documentTypeChipClasses,
	documentTypeLabels,
	formatDate,
	type Milestone,
	milestoneLabels,
	projectStage,
	sortTeam,
} from "../lib/projects";
import { resolveSettings } from "../lib/settings";
import { supabase } from "../lib/supabase";
import { initials } from "../lib/translators";

const stepColumns = "id, milestone, title, due_date, completed_at, created_at";

function projectQuery(id: string) {
	return supabase
		.from("projects")
		.select(
			`id, title, source_language, target_language, document_type, word_count, due_date, notes, client:clients (id, name, contact_name, contact_email, has_glossary, archived_at), allocations (id, role, is_proposed, start_date, translator:translators (name)), project_steps (${stepColumns}), feedback_entries (status)`,
		)
		.eq("id", id)
		.maybeSingle();
}

type Project = NonNullable<QueryData<ReturnType<typeof projectQuery>>>;
type StepRow = {
	key: string;
	label: string;
	dueDate: string | null;
	done: boolean;
	milestone?: Milestone;
	id?: string;
};

const route = useRoute();
const id = route.params.id as string;
const validId = z.guid().safeParse(id).success;
const project = ref<Project | null>(null);
const loading = ref(validId);
const loadFailed = ref(false);
const saving = ref(new Set<string>());
const saveFailed = ref(false);

async function load() {
	loading.value = true;
	loadFailed.value = false;
	const { data, error } = await projectQuery(id);
	loading.value = false;
	if (error) {
		loadFailed.value = true;
		return;
	}
	project.value = data;
}

// Message client follows the email settings; without them it uses the defaults.
const emailSettings = ref(resolveSettings(null));

async function loadEmailSettings() {
	const { data, error } = await supabase
		.from("settings")
		.select("email_provider, sign_off, owner_name, agency_name")
		.maybeSingle();
	if (!error) emailSettings.value = resolveSettings(data);
}

if (validId) {
	load();
	loadEmailSettings();
}

const notFound = computed(
	() => !loading.value && !loadFailed.value && !project.value,
);

const stage = computed(
	() =>
		project.value &&
		projectStage(project.value.allocations, project.value.project_steps),
);

const wordsLine = computed(() => {
	if (!project.value) return "";
	const due = `Due ${formatDate(project.value.due_date)}`;
	const count = project.value.word_count;
	return count === null
		? due
		: `${count.toLocaleString("en-GB")} words · ${due}`;
});

const messageClient = computed(() => {
	const { email_provider, sign_off } = emailSettings.value;
	return {
		href: project.value
			? composeUrl(email_provider, {
					to: project.value.client.contact_email,
					subject: project.value.title,
					body: sign_off,
				})
			: "",
		...newTabAttrs(email_provider),
	};
});

// Milestones in label order, then free-form steps by due date (no date last), then creation.
const stepRows = computed((): StepRow[] => {
	const steps = project.value?.project_steps ?? [];
	const milestones = (Object.keys(milestoneLabels) as Milestone[]).map(
		(milestone) => {
			const step = steps.find((s) => s.milestone === milestone);
			return {
				key: milestone,
				label: milestoneLabels[milestone],
				dueDate: step?.due_date ?? null,
				done: Boolean(step?.completed_at),
				milestone,
			};
		},
	);
	const freeForm = steps
		.filter((step) => step.milestone === null)
		.sort(
			(a, b) =>
				(a.due_date ?? "9999-12-31").localeCompare(
					b.due_date ?? "9999-12-31",
				) || a.created_at.localeCompare(b.created_at),
		)
		.map((step) => ({
			key: step.id,
			label: step.title ?? "",
			dueDate: step.due_date,
			done: Boolean(step.completed_at),
			id: step.id,
		}));
	return [...milestones, ...freeForm];
});

const openFeedback = computed(
	() =>
		project.value?.feedback_entries.filter((entry) => entry.status === "open")
			.length ?? 0,
);

const team = computed(() => sortTeam(project.value?.allocations ?? []));

function roleLine(allocation: Project["allocations"][number]): string {
	const role = allocation.role === "reviewer" ? "Reviewer" : "Translator";
	return allocation.is_proposed ? `${role}, proposed` : role;
}

function saveStep(row: StepRow, completedAt: string | null) {
	const steps = supabase.from("project_steps");
	if (row.milestone) {
		return steps
			.upsert(
				{
					project_id: id,
					milestone: row.milestone,
					completed_at: completedAt,
				},
				{ onConflict: "project_id,milestone" },
			)
			.select(stepColumns)
			.single();
	}
	return steps
		.update({ completed_at: completedAt })
		.eq("id", row.id ?? "")
		.select(stepColumns)
		.single();
}

async function toggle(row: StepRow, event: Event) {
	const input = event.target as HTMLInputElement;
	const checked = input.checked;
	saving.value.add(row.key);
	const { data, error } = await saveStep(
		row,
		checked ? new Date().toISOString() : null,
	);
	saving.value.delete(row.key);
	if (error || !project.value) {
		input.checked = !checked;
		saveFailed.value = true;
	} else {
		saveFailed.value = false;
		project.value.project_steps = [
			...project.value.project_steps.filter((step) => step.id !== data.id),
			data,
		];
	}
	// Disabling the box while it saved dropped its focus; give it back once it is enabled.
	await nextTick();
	input.focus();
}
</script>

<template>
	<div v-if="notFound" class="card project-message">
		<h1 class="h1">Project not found</h1>
		<p class="project-muted">Check the link, or find the project on Projects.</p>
		<div>
			<RouterLink to="/projects" class="btn">Back to projects</RouterLink>
		</div>
	</div>

	<div v-else-if="loadFailed" class="card project-message">
		<p role="alert" class="project-alert">This project could not be loaded. Nothing was lost.</p>
		<div>
			<button type="button" class="btn" @click="load">Try again</button>
		</div>
	</div>

	<template v-else-if="project && stage">
		<nav aria-label="Breadcrumb" class="project-breadcrumb">
			<RouterLink to="/projects">Projects</RouterLink>
			<span aria-hidden="true">/</span>
			<RouterLink
				v-if="!project.client.archived_at"
				:to="{ path: '/clients', query: { client: project.client.id }, hash: '#client' }"
			>
				{{ project.client.name }}
			</RouterLink>
			<span v-else>{{ project.client.name }}</span>
			<span aria-hidden="true">/</span>
			<span class="project-breadcrumb-current">{{ project.title }}</span>
		</nav>

		<header class="project-header">
			<div class="project-heading">
				<h1 class="h1">{{ project.title }}</h1>
				<div class="project-chips">
					<span :class="columnChipClasses[stage.column]">{{ stage.column }}</span>
					<span class="chip">{{ shortPairLabel(project.source_language, project.target_language) }}</span>
					<span :class="documentTypeChipClasses[project.document_type]">
						{{ documentTypeLabels[project.document_type] }}
					</span>
					<span class="project-words">{{ wordsLine }}</span>
				</div>
			</div>
			<a class="btn" v-bind="messageClient">Message client</a>
		</header>

		<section id="now" aria-label="Where this project is" class="card project-now">
			<ol aria-label="Project stages" class="project-stages">
				<li
					v-for="(item, index) in stage.stages"
					:key="item.name"
					class="project-stage"
					:class="{ 'project-stage-done': item.done, 'project-stage-current': item.current }"
					:aria-current="item.current ? 'step' : undefined"
				>
					<span class="project-stage-dot">
						<svg
							v-if="item.done"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12.5l4.5 4.5L19 7.5" />
						</svg>
					</span>
					<span class="project-stage-label">
						{{ item.name }}<span v-if="item.done" class="sr-only">, done</span>
						<span v-else-if="item.current" class="sr-only">, current stage</span>
					</span>
					<span v-if="index < stage.stages.length - 1" class="project-stage-line" aria-hidden="true"></span>
				</li>
			</ol>

			<div class="project-now-body">
				<div class="project-now-column">
					<h2 class="h3">Next steps</h2>
					<label v-for="row in stepRows" :key="row.key" class="project-step">
						<input
							type="checkbox"
							class="project-step-box"
							:checked="row.done"
							:disabled="saving.has(row.key)"
							@change="toggle(row, $event)"
						/>
						<span>
							<span class="project-step-label">{{ row.label }}</span>
							<span v-if="row.dueDate" class="project-step-date">By {{ formatDate(row.dueDate) }}</span>
						</span>
					</label>
					<p v-if="saveFailed" role="alert" class="project-alert">
						Your changes were not saved. Nothing was lost. Try again.
					</p>
				</div>
				<div class="project-now-column">
					<h2 class="h3">Needs attention</h2>
					<p v-if="openFeedback > 0" class="project-attention">
						{{ openFeedback }} open feedback {{ openFeedback === 1 ? "point" : "points" }}
					</p>
					<p v-else class="project-nothing">Nothing needs attention.</p>
				</div>
			</div>
		</section>

		<div class="project-cards">
			<section id="team" aria-labelledby="project-team-h" class="card project-card">
				<h2 id="project-team-h" class="h3">Who is on this</h2>
				<div v-for="allocation in team" :key="allocation.id" class="project-person">
					<span
						class="project-avatar"
						:class="allocation.role === 'reviewer' ? 'project-avatar-reviewer' : 'project-avatar-translator'"
					>
						{{ initials(allocation.translator.name) }}
					</span>
					<div class="project-person-text">
						<div class="project-person-name">{{ allocation.translator.name }}</div>
						<div class="project-person-role">{{ roleLine(allocation) }}</div>
					</div>
				</div>
				<p v-if="team.length === 0" class="project-muted">No translator yet.</p>
				<div class="project-person">
					<span class="project-avatar">{{ initials(project.client.contact_name) }}</span>
					<div class="project-person-text">
						<div class="project-person-name">{{ project.client.contact_name }}</div>
						<div class="project-person-role">Client contact</div>
					</div>
				</div>
			</section>

			<section id="details" aria-labelledby="project-details-h" class="card project-card">
				<h2 id="project-details-h" class="h3">Details</h2>
				<dl class="project-details">
					<dt>Client</dt>
					<dd>{{ project.client.name }}</dd>
					<dt>Languages</dt>
					<dd>{{ longPairLabel(project.source_language, project.target_language) }}</dd>
					<dt>Document type</dt>
					<dd>{{ documentTypeLabels[project.document_type] }}</dd>
					<template v-if="project.word_count !== null">
						<dt>Words</dt>
						<dd>{{ project.word_count.toLocaleString("en-GB") }}</dd>
					</template>
					<dt>Glossary</dt>
					<dd>{{ project.client.has_glossary ? "Supplied by client" : "None yet" }}</dd>
					<dt>Deadline</dt>
					<dd>{{ formatDate(project.due_date) }}</dd>
				</dl>
			</section>

			<section id="notes" aria-labelledby="project-notes-h" class="card project-card project-notes">
				<h2 id="project-notes-h" class="h3">Notes</h2>
				<p class="project-notes-text">{{ project.notes ?? "No notes yet." }}</p>
			</section>
		</div>
	</template>
</template>

<style scoped>
.project-message {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.project-muted {
	margin: 0;
	color: var(--color-muted);
}

.project-alert {
	margin: 0;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.project-breadcrumb {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0 8px;
	color: var(--color-muted);
	font-size: 13px;
}

.project-breadcrumb a {
	display: inline-flex;
	align-items: center;
	min-height: var(--touch-target);
}

.project-breadcrumb a:hover {
	color: var(--color-primary);
}

.project-breadcrumb-current {
	color: var(--color-ink);
}

.project-header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20px;
}

.project-heading {
	display: flex;
	flex-direction: column;
	gap: 12px;
	min-width: 0;
}

.project-chips {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8px;
}

.project-words {
	margin-left: 6px;
	color: var(--color-muted);
	font-size: 13px;
}

.project-now {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.project-stages {
	display: flex;
	align-items: center;
	gap: 12px;
	margin: 0;
	padding: 0;
	overflow-x: auto;
	list-style: none;
}

/* Relative, so the hidden state text stays inside the scrolling list and never widens the page. */
.project-stage {
	position: relative;
	display: flex;
	flex: 1 1 140px;
	align-items: center;
	gap: 12px;
}

/* At the item's left edge, so the last item's hidden text cannot overflow the list by a pixel. */
.project-stage .sr-only {
	left: 0;
}

.project-stage:last-child {
	flex: 0 0 auto;
}

.project-stage-dot {
	box-sizing: border-box;
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border: 2px solid var(--color-line);
	border-radius: 50%;
	background: var(--color-line);
	color: var(--color-duck-ink);
}

.project-stage-label {
	color: var(--color-muted);
	font-size: 13px;
	white-space: nowrap;
}

.project-stage-line {
	flex: 1 1 24px;
	min-width: 16px;
	height: 2px;
	border-radius: 2px;
	background: var(--color-line);
}

.project-stage-done .project-stage-dot,
.project-stage-done .project-stage-line {
	border-color: var(--color-duck-border);
	background: var(--color-duck-border);
}

.project-stage-done .project-stage-label,
.project-stage-current .project-stage-label {
	color: var(--color-ink);
}

.project-stage-current .project-stage-dot {
	border-color: var(--color-primary);
	background: var(--color-surface);
}

.project-stage-current .project-stage-label {
	font-weight: 600;
}

.project-now-body {
	display: flex;
	flex-wrap: wrap;
	gap: 24px 40px;
}

.project-now-column {
	display: flex;
	flex: 1 1 280px;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.project-step {
	box-sizing: border-box;
	display: flex;
	align-items: flex-start;
	gap: 12px;
	min-height: var(--touch-target);
	padding-top: 8px;
	cursor: pointer;
}

.project-step-box {
	flex: none;
	width: 20px;
	height: 20px;
	margin: 2px 0 0;
	accent-color: var(--color-primary);
}

.project-step-label {
	display: block;
	font-weight: 500;
}

.project-step-date {
	color: var(--color-muted);
	font-size: 12px;
}

.project-attention {
	margin: 0;
	padding: 12px 14px;
	border-radius: 12px;
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.project-nothing {
	margin: 0;
	padding-top: 8px;
	color: var(--color-nav-ink);
}

.project-cards {
	display: flex;
	flex-wrap: wrap;
	align-items: stretch;
	gap: 24px;
}

.project-card {
	display: flex;
	flex: 1 1 280px;
	flex-direction: column;
	gap: 8px;
	min-width: 0;
}

.project-person {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 0;
}

.project-avatar {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--color-neutral-tint);
	color: var(--color-nav-ink);
	font-size: 12px;
	font-weight: 600;
}

.project-avatar-translator {
	background: var(--color-duck-tint);
	color: var(--color-duck-ink);
}

.project-avatar-reviewer {
	background: var(--color-lavender-tint-strong);
	color: var(--color-lavender-ink);
}

.project-person-text {
	min-width: 0;
}

.project-person-name {
	font-weight: 500;
}

.project-person-role {
	color: var(--color-muted);
	font-size: 12px;
}

.project-details {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 10px 16px;
	margin: 0;
	font-size: 13px;
}

.project-details dt {
	color: var(--color-muted);
}

.project-details dd {
	margin: 0;
	text-align: right;
	overflow-wrap: anywhere;
}

.project-notes {
	border-color: var(--color-blue-tint-strong);
	background: var(--color-blue-tint);
	color: var(--color-blue-ink);
}

.project-notes-text {
	margin: 0;
	white-space: pre-line;
}

/* Section link targets clear the page top, and the sticky top bar on phones. */
section[id] {
	scroll-margin-top: 24px;
}

@media (max-width: 899px) {
	section[id] {
		scroll-margin-top: 72px;
	}
}
</style>

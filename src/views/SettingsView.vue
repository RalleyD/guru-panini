<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
	composeUrl,
	newTabAttrs,
	reportProblemSubject,
	supportAddress,
	supportSubject,
	withSignOff,
} from "../lib/email";
import {
	type EmailProvider,
	resolveSettings,
	type SettingsField,
	setAgencyName,
	settingsFieldSchemas,
} from "../lib/settings";
import { supabase } from "../lib/supabase";
import { initials } from "../lib/translators";
import type { Tables, TablesInsert } from "../types/database.types";

type Card = "profile" | "email" | "followups";
type Columns = Omit<TablesInsert<"settings">, "owner_id">;
type ErrorField = SettingsField | "photo";
type PhotoKind = { contentType: string; extension: string };

const settingsColumns =
	"agency_name, owner_name, photo_path, email_provider, sign_off, follow_up_after_days, reminder_draft_waiting, reminder_quote_not_accepted, reminder_question_waiting";

const fieldCards: Record<SettingsField, Card> = {
	owner_name: "profile",
	agency_name: "profile",
	email_provider: "email",
	sign_off: "email",
	follow_up_after_days: "followups",
	reminder_draft_waiting: "followups",
	reminder_quote_not_accepted: "followups",
	reminder_question_waiting: "followups",
};

const providerOptions: { value: EmailProvider; title: string; line: string }[] =
	[
		{
			value: "default_app",
			title: "My default email app",
			line: "Nothing to connect. Works with Mail, Outlook, Thunderbird and most phone mail apps.",
		},
		{
			value: "gmail",
			title: "Gmail in my browser",
			line: "Opens a new Gmail compose window.",
		},
		{
			value: "outlook",
			title: "Outlook in my browser",
			line: "Opens a new Outlook on the web compose window.",
		},
	];

const reminderFields = [
	{ field: "reminder_draft_waiting", label: "Draft waiting for feedback" },
	{ field: "reminder_quote_not_accepted", label: "Quote not accepted" },
	{
		field: "reminder_question_waiting",
		label: "Question waiting for the client",
	},
] as const;

const maxPhotoBytes = 5 * 1024 * 1024;
const photoError = "Choose a JPG, PNG or WebP image up to 5 MB.";

const route = useRoute();
// The saved row, or null when the owner has none yet; the form starts from it.
const row = ref<Partial<Tables<"settings">> | null>(null);
const saved = computed(() => resolveSettings(row.value));
const form = ref(resolveSettings(null));
const loading = ref(true);
const loadFailed = ref(false);
const errors = ref<Partial<Record<ErrorField, string>>>({});
const status = ref<Partial<Record<Card, "saved" | "failed">>>({});
const retries: Partial<Record<Card, () => Promise<void>>> = {};
const photoUrl = ref<string>();

async function load() {
	loading.value = true;
	loadFailed.value = false;
	const { data, error } = await supabase
		.from("settings")
		.select(settingsColumns)
		.maybeSingle();
	loading.value = false;
	if (error) {
		loadFailed.value = true;
		return;
	}
	row.value = data;
	form.value = resolveSettings(data);
	// The router could not scroll to a section that was not rendered yet.
	await nextTick();
	if (route.hash) {
		document.getElementById(route.hash.slice(1))?.scrollIntoView();
	}
}

load();

watch(
	() => row.value?.photo_path,
	async (path) => {
		if (!path) return;
		const { data } = await supabase.storage
			.from("profile-photos")
			.createSignedUrl(path, 3600);
		photoUrl.value = data?.signedUrl;
	},
);

async function ownerId(): Promise<string | undefined> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	return session?.user.id;
}

// Runs a save for a card, showing "Saved." or the failed alert with a retry of the same save.
async function attempt(card: Card, run: () => Promise<boolean>) {
	delete status.value[card];
	if (await run()) {
		status.value[card] = "saved";
		return;
	}
	status.value[card] = "failed";
	retries[card] = () => attempt(card, run);
}

async function saveColumns(columns: Columns): Promise<boolean> {
	const owner = await ownerId();
	if (!owner) return false;
	const { error } = await supabase
		.from("settings")
		.upsert({ owner_id: owner, ...columns }, { onConflict: "owner_id" });
	if (error) return false;
	row.value = { ...row.value, ...columns };
	if ("agency_name" in columns) setAgencyName(columns.agency_name);
	return true;
}

async function saveField(field: SettingsField) {
	const result = settingsFieldSchemas[field].safeParse(form.value[field]);
	if (!result.success) {
		errors.value[field] = result.error.issues[0].message;
		return;
	}
	delete errors.value[field];
	const columns = { [field]: result.data } as Columns;
	await attempt(fieldCards[field], () => saveColumns(columns));
}

// Undefined unless the file's first bytes are a JPEG, PNG or WebP image.
async function photoKind(file: File): Promise<PhotoKind | undefined> {
	const head = String.fromCharCode(
		...new Uint8Array(await file.slice(0, 12).arrayBuffer()),
	);
	if (head.startsWith("\xff\xd8\xff")) {
		return { contentType: "image/jpeg", extension: "jpg" };
	}
	if (head.startsWith("\x89PNG")) {
		return { contentType: "image/png", extension: "png" };
	}
	if (head.startsWith("RIFF") && head.slice(8) === "WEBP") {
		return { contentType: "image/webp", extension: "webp" };
	}
	return undefined;
}

async function choosePhoto(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;
	const kind = file.size <= maxPhotoBytes ? await photoKind(file) : undefined;
	if (!kind) {
		errors.value.photo = photoError;
		input.value = "";
		return;
	}
	delete errors.value.photo;
	// Kept across retries, so Try again does not upload the same file twice.
	let path: string | undefined;
	await attempt("profile", async () => {
		path ??= await uploadPhoto(file, kind);
		return path !== undefined && saveColumns({ photo_path: path });
	});
}

async function uploadPhoto(
	file: File,
	kind: PhotoKind,
): Promise<string | undefined> {
	const owner = await ownerId();
	if (!owner) return undefined;
	const path = `${owner}/${crypto.randomUUID()}.${kind.extension}`;
	const { error } = await supabase.storage
		.from("profile-photos")
		.upload(path, file, { contentType: kind.contentType });
	return error ? undefined : path;
}

function retry(card: Card) {
	retries[card]?.();
}

function invalidAttrs(field: ErrorField) {
	return errors.value[field]
		? {
				"aria-invalid": "true" as const,
				"aria-describedby": `settings-${field}-error`,
			}
		: {};
}

const testEmail = computed(() => {
	const agency = form.value.agency_name.trim();
	return composeUrl(form.value.email_provider, {
		to: "",
		subject: agency ? `Test email from ${agency}` : "Test email",
		body: withSignOff(
			"This is how an email will open.",
			form.value.sign_off.trim(),
		),
	});
});

const supportLinks = computed(() =>
	[
		{ label: "Email support", subject: supportSubject, primary: true },
		{
			label: "Report a problem",
			subject: reportProblemSubject,
			primary: false,
		},
	].map((link) => ({
		...link,
		href: composeUrl(saved.value.email_provider, {
			to: supportAddress,
			subject: link.subject,
			body: saved.value.sign_off,
		}),
	})),
);
</script>

<template>
	<header>
		<h1 class="h1">Settings</h1>
		<p class="settings-intro">Just the essentials.</p>
	</header>

	<div v-if="loadFailed" class="card settings-message">
		<p role="alert" class="settings-alert">Settings could not be loaded. Nothing was lost.</p>
		<div>
			<button type="button" class="btn" @click="load">Try again</button>
		</div>
	</div>

	<div v-else-if="!loading" class="settings-cards">
		<section id="profile" aria-labelledby="profile-h" class="card settings-card">
			<h2 id="profile-h" class="h2">Profile</h2>
			<div class="settings-photo-row">
				<span class="settings-avatar">
					<img v-if="photoUrl" :src="photoUrl" alt="Profile photo" />
					<template v-else>{{ initials(form.owner_name) }}</template>
				</span>
				<div class="settings-field settings-photo-field">
					<label for="settings-photo" class="field-label">Profile photo</label>
					<input
						id="settings-photo"
						type="file"
						accept="image/jpeg,image/png,image/webp"
						class="field settings-photo-input"
						v-bind="invalidAttrs('photo')"
						@change="choosePhoto"
					/>
					<p v-if="errors.photo" id="settings-photo-error" class="settings-error">{{ errors.photo }}</p>
				</div>
			</div>
			<div class="settings-field">
				<label for="settings-owner_name" class="field-label">Your name</label>
				<input
					id="settings-owner_name"
					v-model="form.owner_name"
					type="text"
					class="field"
					@change="saveField('owner_name')"
				/>
			</div>
			<div class="settings-field">
				<label for="settings-agency_name" class="field-label">Agency name</label>
				<input
					id="settings-agency_name"
					v-model="form.agency_name"
					type="text"
					class="field"
					aria-describedby="settings-agency_name-hint"
					@change="saveField('agency_name')"
				/>
				<p id="settings-agency_name-hint" class="settings-hint">Shown at the top of every page.</p>
			</div>
			<div v-if="status.profile === 'failed'" role="alert" class="settings-save-error">
				<strong>Your changes were not saved</strong>
				<span>Nothing was lost. Your edits are still on this page. Try again.</span>
				<div>
					<button type="button" class="btn" @click="retry('profile')">Try again</button>
				</div>
			</div>
			<p role="status" class="settings-status">{{ status.profile === "saved" ? "Saved." : "" }}</p>
		</section>

		<section id="email" aria-labelledby="email-h" class="card settings-card">
			<div>
				<h2 id="email-h" class="h2">Email</h2>
				<p class="settings-note">
					Choose what “Open in email app” does. It always opens a draft for you to read and send.
					Nothing is sent for you.
				</p>
			</div>
			<fieldset class="settings-options">
				<legend class="field-label settings-legend">Open drafts in</legend>
				<label
					v-for="option in providerOptions"
					:key="option.value"
					class="settings-option"
					:class="{ 'settings-option-selected': form.email_provider === option.value }"
				>
					<input
						v-model="form.email_provider"
						type="radio"
						name="settings-provider"
						:value="option.value"
						@change="saveField('email_provider')"
					/>
					<span>
						<span class="settings-option-title">{{ option.title }}</span>
						<span class="settings-option-line">{{ option.line }}</span>
					</span>
				</label>
			</fieldset>
			<div class="settings-field">
				<label for="settings-sign_off" class="field-label">Sign-off for emails</label>
				<textarea
					id="settings-sign_off"
					v-model="form.sign_off"
					rows="3"
					class="field settings-textarea"
					@change="saveField('sign_off')"
				></textarea>
			</div>
			<div class="settings-test">
				<a class="btn" :href="testEmail" v-bind="newTabAttrs(form.email_provider)">Open a test email</a>
				<span class="settings-small">
					Files can't be attached this way, and very long emails may be cut short. “Copy text” is
					always there as a fallback.
				</span>
			</div>
			<div v-if="status.email === 'failed'" role="alert" class="settings-save-error">
				<strong>Your changes were not saved</strong>
				<span>Nothing was lost. Your edits are still on this page. Try again.</span>
				<div>
					<button type="button" class="btn" @click="retry('email')">Try again</button>
				</div>
			</div>
			<p role="status" class="settings-status">{{ status.email === "saved" ? "Saved." : "" }}</p>
		</section>

		<section id="followups" aria-labelledby="followups-h" class="card settings-card">
			<div>
				<h2 id="followups-h" class="h2">Follow-ups</h2>
				<p class="settings-note">
					When a client has been quiet for this long, the project appears in Needs you with an email
					ready to open.
				</p>
			</div>
			<div>
				<div class="settings-days">
					<label for="settings-follow_up_after_days" class="field-label">Follow up after</label>
					<input
						id="settings-follow_up_after_days"
						v-model="form.follow_up_after_days"
						type="number"
						min="1"
						max="30"
						class="field settings-days-input"
						v-bind="invalidAttrs('follow_up_after_days')"
						@change="saveField('follow_up_after_days')"
					/>
					<span class="settings-days-unit">days without a reply</span>
				</div>
				<p
					v-if="errors.follow_up_after_days"
					id="settings-follow_up_after_days-error"
					class="settings-error"
				>
					{{ errors.follow_up_after_days }}
				</p>
			</div>
			<div class="settings-reminder-head">
				<h3 class="settings-subhead">Reminder text</h3>
				<p class="settings-small">
					[contact name], [project] and [date] are filled in for you. Your sign-off is added at the
					end.
				</p>
			</div>
			<div v-for="reminder in reminderFields" :key="reminder.field" class="settings-field">
				<label :for="`settings-${reminder.field}`" class="field-label">{{ reminder.label }}</label>
				<textarea
					:id="`settings-${reminder.field}`"
					v-model="form[reminder.field]"
					rows="4"
					class="field settings-textarea"
					v-bind="invalidAttrs(reminder.field)"
					@change="saveField(reminder.field)"
				></textarea>
				<p v-if="errors[reminder.field]" :id="`settings-${reminder.field}-error`" class="settings-error">
					{{ errors[reminder.field] }}
				</p>
			</div>
			<div v-if="status.followups === 'failed'" role="alert" class="settings-save-error">
				<strong>Your changes were not saved</strong>
				<span>Nothing was lost. Your edits are still on this page. Try again.</span>
				<div>
					<button type="button" class="btn" @click="retry('followups')">Try again</button>
				</div>
			</div>
			<p role="status" class="settings-status">{{ status.followups === "saved" ? "Saved." : "" }}</p>
		</section>

		<section id="support" aria-labelledby="support-h" class="card settings-card settings-support">
			<div>
				<h2 id="support-h" class="h2">Support</h2>
				<p class="settings-note">Stuck, or something looks wrong? Write to us and a person will reply.</p>
			</div>
			<div class="settings-links">
				<a
					v-for="link in supportLinks"
					:key="link.label"
					class="btn"
					:class="{ 'btn-primary': link.primary }"
					:href="link.href"
					v-bind="newTabAttrs(saved.email_provider)"
					>{{ link.label }}</a
				>
			</div>
		</section>
	</div>
</template>

<style scoped>
.settings-intro {
	max-width: 52ch;
	margin: 8px 0 0;
	color: var(--color-muted);
	font-size: 16px;
}

.settings-message {
	display: flex;
	flex-direction: column;
	gap: 14px;
	max-width: 760px;
}

.settings-alert {
	margin: 0;
	color: var(--color-attention-ink);
}

.settings-cards {
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
	max-width: 760px;
}

.settings-card {
	display: flex;
	flex-direction: column;
	gap: 18px;
}

.settings-support {
	gap: 14px;
}

.settings-note {
	margin: 4px 0 0;
	color: var(--color-muted);
}

.settings-small {
	margin: 0;
	color: var(--color-muted);
	font-size: 12px;
}

.settings-reminder-head .settings-small {
	font-size: 13px;
}

.settings-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.settings-hint {
	margin: 0;
	color: var(--color-muted);
	font-size: 13px;
}

.settings-error {
	margin: 0;
	color: var(--color-attention-ink);
	font-size: 13px;
}

.settings-photo-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 16px;
}

.settings-avatar {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 72px;
	height: 72px;
	overflow: hidden;
	border-radius: 50%;
	background: var(--color-lavender-tint-strong);
	color: var(--color-lavender-ink);
	font-family: var(--font-heading);
	font-size: 26px;
}

.settings-avatar img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.settings-photo-field {
	flex: 1 1 220px;
	min-width: 0;
}

.settings-photo-input {
	width: 100%;
	padding: 9px 14px;
}

.settings-textarea {
	resize: vertical;
}

.settings-options {
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
}

.settings-legend {
	margin-bottom: 10px;
	padding: 0;
}

.settings-option {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	box-sizing: border-box;
	min-height: var(--touch-target);
	padding: 14px 16px;
	border: 1px solid var(--color-line);
	border-radius: 14px;
	cursor: pointer;
}

.settings-option input {
	flex: none;
	width: 20px;
	height: 20px;
	margin: 2px 0 0;
	accent-color: var(--color-primary);
}

.settings-option-selected {
	border-color: var(--color-primary);
	background: var(--color-lavender-tint);
}

.settings-option-title {
	display: block;
	font-weight: 500;
}

.settings-option-line {
	color: var(--color-nav-ink);
	font-size: 13px;
}

.settings-test {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 12px;
}

.settings-days {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 10px;
}

.settings-days-input {
	width: 84px;
}

.settings-days-unit {
	color: var(--color-nav-ink);
	font-size: 13px;
}

.settings-reminder-head {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.settings-subhead {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
}

.settings-links {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.settings-save-error {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 10px 14px;
	border-radius: var(--radius-field);
	background: var(--color-attention-tint);
	color: var(--color-attention-ink);
}

.settings-save-error div {
	margin-top: 8px;
}

.settings-status {
	margin: 0;
	color: var(--color-muted);
	font-size: 13px;
}

/* Kept in the page so the live region is announced, but takes no space while empty. */
.settings-status:empty {
	position: absolute;
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

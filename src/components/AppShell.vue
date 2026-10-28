<script setup lang="ts">
import { useRoute } from "vue-router";

withDefaults(defineProps<{ needsYouCount?: number }>(), {
	needsYouCount: 0,
});

// The shell does not talk to Supabase; App.vue handles sign-out.
const emit = defineEmits<{ "sign-out": [] }>();

// Section links for the sidebar and the phone chips, from the route's meta.
const route = useRoute();

interface PrimaryLink {
	label: string;
	to: string;
	icon: string;
	hasBadge: boolean;
}

// Shared by the sidebar and the phone tab bar.
const primaryLinks: PrimaryLink[] = [
	{
		label: "Overview",
		to: "/",
		icon: "M5 3h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM16 3h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM5 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2zM16 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z",
		hasBadge: true,
	},
	{
		label: "Projects",
		to: "/projects",
		icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
		hasBadge: false,
	},
	{
		label: "Clients",
		to: "/clients",
		icon: "M9 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.3a3.2 3.2 0 0 1 0 5.4M18 14.4c1.7.8 3 2.6 3 5.6",
		hasBadge: false,
	},
	{
		label: "Translators",
		to: "/translators",
		icon: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
		hasBadge: false,
	},
];

const settingsIcon = "M4 7h9m4 0h3M4 17h3m4 0h9M15 4v6M9 14v6";
const supportIcon =
	"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01";
const signOutIcon =
	"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";
</script>

<template>
	<div class="shell">
		<aside class="shell-side">
			<div class="shell-side-in">
				<!-- The logo and Support links are custom so they never get aria-current, which belongs to the page's own link. -->
				<RouterLink v-slot="{ href, navigate }" to="/" custom>
					<a :href="href" class="shell-brand" @click="navigate">
						<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
							<rect x="2" y="5" width="18" height="16" rx="6" fill="#B9A9E6" />
							<rect x="12" y="11" width="18" height="16" rx="6" fill="#BFE3E0" fill-opacity="0.9" />
						</svg>
						<span class="shell-brand-name">guru-panini</span>
					</a>
				</RouterLink>
				<nav aria-label="Main" class="shell-side-nav">
					<RouterLink v-for="link in primaryLinks" :key="link.to" :to="link.to" class="shell-nav-link">
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path :d="link.icon" />
						</svg>
						{{ link.label }}
						<span v-if="link.hasBadge && needsYouCount > 0" class="shell-badge">
							{{ needsYouCount }}<span class="sr-only"> need you</span>
						</span>
					</RouterLink>
				</nav>
				<!-- Section links are custom too: a hash link resolves to the current route. -->
				<nav v-if="route.meta.sections" aria-label="On this page" class="shell-side-sections">
					<span class="shell-sections-heading">This project</span>
					<RouterLink
						v-for="section in route.meta.sections"
						:key="section.hash"
						v-slot="{ href, navigate }"
						:to="route.path + section.hash"
						custom
					>
						<a :href="href" class="shell-section-link" @click="navigate">{{ section.label }}</a>
					</RouterLink>
				</nav>
				<div class="shell-side-foot">
					<RouterLink to="/settings" class="shell-nav-link">
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path :d="settingsIcon" />
						</svg>
						Settings
					</RouterLink>
					<RouterLink v-slot="{ href, navigate }" to="/settings#support" custom>
						<a :href="href" class="shell-nav-link" @click="navigate">
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path :d="supportIcon" />
							</svg>
							Support
						</a>
					</RouterLink>
					<button type="button" class="shell-nav-link shell-sign-out" @click="emit('sign-out')">
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path :d="signOutIcon" />
						</svg>
						Sign out
					</button>
				</div>
			</div>
		</aside>

		<header class="shell-topbar">
			<RouterLink v-slot="{ href, navigate }" to="/" custom>
				<a :href="href" class="shell-brand shell-topbar-brand" @click="navigate">
					<svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
						<rect x="2" y="5" width="18" height="16" rx="6" fill="#B9A9E6" />
						<rect x="12" y="11" width="18" height="16" rx="6" fill="#BFE3E0" fill-opacity="0.9" />
					</svg>
					<span class="shell-brand-name">guru-panini</span>
				</a>
			</RouterLink>
			<div class="shell-topbar-actions">
				<RouterLink to="/settings" aria-label="Settings" class="shell-icon-link">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path :d="settingsIcon" />
					</svg>
				</RouterLink>
				<button type="button" aria-label="Sign out" class="shell-icon-link shell-sign-out" @click="emit('sign-out')">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path :d="signOutIcon" />
					</svg>
				</button>
			</div>
		</header>
		<nav v-if="route.meta.sections" aria-label="On this page" class="shell-chips">
			<RouterLink
				v-for="section in route.meta.sections"
				:key="section.hash"
				v-slot="{ href, navigate }"
				:to="route.path + section.hash"
				custom
			>
				<a :href="href" class="shell-chip" @click="navigate">{{ section.label }}</a>
			</RouterLink>
		</nav>

		<main class="shell-main">
			<slot />
		</main>

		<nav aria-label="Main" class="shell-tabbar">
			<RouterLink v-for="link in primaryLinks" :key="link.to" :to="link.to" class="shell-tab">
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path :d="link.icon" />
				</svg>
				{{ link.label }}
				<span v-if="link.hasBadge && needsYouCount > 0" class="shell-badge">
					{{ needsYouCount }}<span class="sr-only"> need you</span>
				</span>
			</RouterLink>
		</nav>
	</div>
</template>

<style scoped>
.shell {
	display: flex;
	min-height: 100vh;
}

.shell-side {
	flex: 0 0 248px;
	border-right: 1px solid var(--color-line);
	background: var(--color-surface);
}

.shell-side-in {
	position: sticky;
	top: 0;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 24px;
	height: 100vh;
	overflow-y: auto;
	padding: 28px 16px;
}

.shell-brand {
	display: flex;
	align-items: center;
	gap: 10px;
	min-height: var(--touch-target);
	padding: 0 8px;
}

.shell-brand-name {
	font-family: var(--font-heading);
	font-size: 18px;
	font-weight: 500;
}

.shell-side-nav,
.shell-side-foot {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.shell-side-sections {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding-top: 16px;
	border-top: 1px solid var(--color-line);
}

.shell-sections-heading {
	padding: 0 12px 6px;
	color: var(--color-muted);
	font-size: 12px;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.shell-section-link {
	display: flex;
	align-items: center;
	box-sizing: border-box;
	min-height: var(--touch-target);
	padding: 0 12px;
	border-radius: 8px;
	color: var(--color-muted);
	font-size: 13px;
}

.shell-section-link:hover {
	background: var(--color-ground);
	color: var(--color-ink);
}

.shell-side-foot {
	margin-top: auto;
	padding-top: 16px;
	border-top: 1px solid var(--color-line);
}

.shell-nav-link {
	display: flex;
	align-items: center;
	gap: 12px;
	box-sizing: border-box;
	min-height: var(--touch-target);
	padding: 10px 12px;
	border-radius: 10px;
	color: var(--color-nav-ink);
}

.shell-nav-link:hover {
	background: var(--color-ground);
	color: var(--color-ink);
}

.shell-nav-link[aria-current="page"] {
	background: var(--color-lavender-tint);
	color: var(--color-lavender-ink);
	font-weight: 500;
}

/* Resets the button so it looks like the links next to it. */
.shell-sign-out {
	border: 0;
	background: none;
	cursor: pointer;
}

.shell-side-foot .shell-sign-out {
	width: 100%;
	text-align: left;
}

.shell-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	min-width: 20px;
	height: 20px;
	margin-left: auto;
	padding: 0 6px;
	border-radius: var(--radius-chip);
	background: var(--color-primary);
	color: var(--color-surface);
	font-size: 11px;
	font-weight: 600;
}

.shell-main {
	flex: 1 1 0;
	min-width: 0;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	gap: 32px;
	padding: 40px 56px 64px;
}

.shell-topbar,
.shell-chips,
.shell-tabbar {
	display: none;
}

@media (max-width: 1100px) {
	.shell-main {
		padding: 32px 32px 56px;
	}
}

@media (max-width: 899px) {
	.shell {
		flex-direction: column;
	}

	.shell-side {
		display: none;
	}

	.shell-topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 56px;
		padding: 6px 8px 6px 16px;
		border-bottom: 1px solid var(--color-line);
		background: var(--color-surface);
	}

	.shell-topbar-brand {
		padding: 0;
	}

	.shell-topbar-brand .shell-brand-name {
		font-size: 17px;
	}

	.shell-topbar-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.shell-icon-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--touch-target);
		height: var(--touch-target);
		border-radius: 12px;
		color: var(--color-nav-ink);
	}

	/* Scrolls sideways on its own, so a long section list never widens the page. */
	.shell-chips {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		padding: 12px 16px 0;
	}

	.shell-chip {
		flex: none;
		display: inline-flex;
		align-items: center;
		box-sizing: border-box;
		min-height: var(--touch-target);
		padding: 0 16px;
		border: 1px solid var(--color-control-border);
		border-radius: var(--radius-chip);
		background: var(--color-surface);
		color: var(--color-nav-ink);
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
	}

	.shell-main {
		gap: 24px;
		padding: 20px 16px 32px;
	}

	.shell-tabbar {
		position: sticky;
		bottom: 0;
		z-index: 20;
		display: flex;
		gap: 4px;
		padding: 4px 8px;
		border-top: 1px solid var(--color-line);
		background: var(--color-surface);
	}

	.shell-tab {
		position: relative;
		flex: 1 1 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		min-height: 56px;
		border-radius: 12px;
		color: var(--color-nav-ink);
		font-size: 11px;
		font-weight: 500;
	}

	.shell-tab[aria-current="page"] {
		background: var(--color-lavender-tint);
		color: var(--color-lavender-ink);
	}

	.shell-tab .shell-badge {
		position: absolute;
		top: 2px;
		left: calc(50% + 4px);
		margin: 0;
	}
}
</style>

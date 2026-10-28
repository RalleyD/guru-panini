import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../lib/supabase";
import AddClientView from "../views/AddClientView.vue";
import AddTranslatorView from "../views/AddTranslatorView.vue";
import ClientsView from "../views/ClientsView.vue";
import OverviewView from "../views/OverviewView.vue";
import ProjectsView from "../views/ProjectsView.vue";
import SettingsView from "../views/SettingsView.vue";
import SignInView from "../views/SignInView.vue";
import TranslatorsView from "../views/TranslatorsView.vue";

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "overview",
			component: OverviewView,
		},
		{
			path: "/projects",
			name: "projects",
			component: ProjectsView,
		},
		{
			path: "/clients",
			name: "clients",
			component: ClientsView,
		},
		{
			path: "/clients/new",
			name: "add-client",
			component: AddClientView,
		},
		{
			path: "/translators",
			name: "translators",
			component: TranslatorsView,
		},
		{
			path: "/translators/new",
			name: "add-translator",
			component: AddTranslatorView,
		},
		{
			path: "/settings",
			name: "settings",
			component: SettingsView,
		},
		{
			path: "/sign-in",
			name: "sign-in",
			component: SignInView,
		},
	],
	scrollBehavior(to) {
		if (to.hash) {
			return { el: to.hash };
		}
		return { top: 0 };
	},
});

// Fails closed: every route except sign-in needs a session, including unknown paths.
router.beforeEach(async (to) => {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session && to.name !== "sign-in") {
		return { name: "sign-in" };
	}
	if (session && to.name === "sign-in") {
		return { name: "overview" };
	}
});

export default router;

import { createRouter, createWebHistory } from "vue-router";
import ClientsView from "../views/ClientsView.vue";
import OverviewView from "../views/OverviewView.vue";
import ProjectsView from "../views/ProjectsView.vue";
import SettingsView from "../views/SettingsView.vue";
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
			path: "/translators",
			name: "translators",
			component: TranslatorsView,
		},
		{
			path: "/settings",
			name: "settings",
			component: SettingsView,
		},
	],
	scrollBehavior(to) {
		if (to.hash) {
			return { el: to.hash };
		}
		return { top: 0 };
	},
});

export default router;

import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppShell from "../components/AppShell.vue";
import router from "../router";

function mountShell(needsYouCount: number) {
	return mount(AppShell, {
		props: { needsYouCount },
		global: {
			plugins: [router],
		},
	});
}

describe("AppShell", () => {
	beforeEach(async () => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		await router.push("/");
		await router.isReady();
	});

	it("links the sidebar to the four primary pages, Settings and Support", () => {
		const wrapper = mountShell(0);
		const hrefs = wrapper.findAll("aside a").map((a) => a.attributes("href"));

		// The first sidebar link is the logo.
		expect(hrefs).toEqual([
			"/",
			"/",
			"/projects",
			"/clients",
			"/translators",
			"/settings",
			"/settings#support",
		]);
		const labels = wrapper.findAll("aside nav a").map((a) => a.text());
		expect(labels).toEqual(["Overview", "Projects", "Clients", "Translators"]);
	});

	it("links the tab bar to the four primary pages only", () => {
		const wrapper = mountShell(0);
		const tabs = wrapper.findAll(".shell-tabbar a");

		expect(tabs.map((a) => a.attributes("href"))).toEqual([
			"/",
			"/projects",
			"/clients",
			"/translators",
		]);
		expect(tabs.map((a) => a.text())).toEqual([
			"Overview",
			"Projects",
			"Clients",
			"Translators",
		]);
	});

	it("has an icon-only Settings link in the top bar", () => {
		const wrapper = mountShell(0);
		const settings = wrapper.find('header a[aria-label="Settings"]');

		expect(settings.exists()).toBe(true);
		expect(settings.attributes("href")).toBe("/settings");
	});

	it("shows the count badge on Overview in the sidebar and the tab bar", () => {
		const wrapper = mountShell(3);
		const overviewLinks = [
			wrapper.find("aside nav a"),
			wrapper.find(".shell-tabbar a"),
		];

		for (const link of overviewLinks) {
			const badge = link.find(".shell-badge");
			expect(badge.exists()).toBe(true);
			expect(badge.text()).toBe("3 need you");
			expect(badge.find(".sr-only").text()).toBe("need you");
			expect(badge.find(".sr-only").element.textContent).toBe(" need you");
			expect(link.text()).toBe("Overview 3 need you");
		}
		expect(wrapper.findAll(".shell-badge")).toHaveLength(2);
	});

	it("renders no badge when the count is 0", () => {
		const wrapper = mountShell(0);

		expect(wrapper.find(".shell-badge").exists()).toBe(false);
	});

	it("marks only the Overview links as the current page on /", () => {
		const wrapper = mountShell(0);
		const current = wrapper.findAll('[aria-current="page"]');

		expect(current.map((a) => a.text())).toEqual(["Overview", "Overview"]);
	});

	it("marks the Clients links as the current page on /clients", async () => {
		const wrapper = mountShell(0);
		await router.push("/clients");
		await flushPromises();

		const current = wrapper.findAll('[aria-current="page"]');
		expect(current.map((a) => a.attributes("href"))).toEqual([
			"/clients",
			"/clients",
		]);
		for (const overview of [
			wrapper.find("aside nav a"),
			wrapper.find(".shell-tabbar a"),
		]) {
			expect(overview.attributes("aria-current")).toBeUndefined();
		}
	});

	it("never marks Support as the current page", async () => {
		const wrapper = mountShell(0);
		await router.push("/settings#support");
		await flushPromises();

		const support = wrapper.find('aside a[href="/settings#support"]');
		expect(support.attributes("aria-current")).toBeUndefined();
		expect(
			wrapper.find('aside a[href="/settings"]').attributes("aria-current"),
		).toBe("page");
	});
});

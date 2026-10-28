import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppShell from "../components/AppShell.vue";
import router from "../router";

const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { auth } }));

function mountShell(needsYouCount: number, agencyName = "Demo Agency") {
	return mount(AppShell, {
		props: { agencyName, needsYouCount },
		global: {
			plugins: [router],
		},
	});
}

describe("AppShell", () => {
	beforeEach(async () => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		auth.getSession.mockResolvedValue({
			data: { session: { access_token: "token" } },
			error: null,
		});
		await router.push("/");
		await router.isReady();
	});

	it("shows the agency name as the brand in the sidebar and the top bar", () => {
		const wrapper = mountShell(0, "Demo Translation Agency");
		const brands = wrapper.findAll(".shell-brand-name");

		expect(brands).toHaveLength(2);
		expect(brands[0].element.closest("aside")).not.toBeNull();
		expect(brands[1].element.closest("header")).not.toBeNull();
		for (const brand of brands) {
			expect(brand.text()).toBe("Demo Translation Agency");
		}
		expect(wrapper.text()).not.toContain("guru-panini");
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

	it("links to the route's sections in the sidebar and the phone chips", async () => {
		const wrapper = mountShell(0);
		const path = "/projects/de000000-0000-4000-8000-000000000301";
		await router.push(path);
		await flushPromises();

		const navs = wrapper.findAll('nav[aria-label="On this page"]');
		expect(navs).toHaveLength(2);
		expect(navs[0].element.closest("aside")).not.toBeNull();
		expect(navs[0].find(".shell-sections-heading").text()).toBe("This project");
		for (const nav of navs) {
			const links = nav.findAll("a");
			expect(links.map((a) => a.text())).toEqual([
				"Who is on this",
				"Details",
				"Notes",
			]);
			expect(links.map((a) => a.attributes("href"))).toEqual([
				`${path}#team`,
				`${path}#details`,
				`${path}#notes`,
			]);
			for (const link of links) {
				expect(link.attributes("aria-current")).toBeUndefined();
			}
		}
	});

	it("scrolls to the section when a section link is clicked", async () => {
		const wrapper = mountShell(0);
		const path = "/projects/de000000-0000-4000-8000-000000000301";
		await router.push(path);
		await flushPromises();
		const target = document.createElement("section");
		target.id = "details";
		document.body.append(target);
		vi.mocked(window.scrollTo).mockClear();

		await wrapper.find(`aside a[href="${path}#details"]`).trigger("click");
		await flushPromises();

		expect(router.currentRoute.value.fullPath).toBe(`${path}#details`);
		expect(window.scrollTo).toHaveBeenCalledTimes(1);
		target.remove();
	});

	it("renders no section links on a route without sections", async () => {
		const wrapper = mountShell(0);
		await router.push("/clients");
		await flushPromises();

		expect(wrapper.find('nav[aria-label="On this page"]').exists()).toBe(false);
		expect(wrapper.text()).not.toContain("This project");
	});

	it("has a Sign out button in the sidebar foot after Support", () => {
		const wrapper = mountShell(0);
		const foot = [...wrapper.find(".shell-side-foot").element.children];

		expect(foot.map((el) => el.textContent?.trim())).toEqual([
			"Settings",
			"Support",
			"Sign out",
		]);
		expect(foot[2].tagName).toBe("BUTTON");
		expect(foot[2].getAttribute("type")).toBe("button");
	});

	it("has an icon-only Sign out button after Settings in the top bar", () => {
		const wrapper = mountShell(0);
		const actions = wrapper.findAll("header .shell-topbar-actions > *");

		expect(actions.map((el) => el.attributes("aria-label"))).toEqual([
			"Settings",
			"Sign out",
		]);
		expect(actions[1].element.tagName).toBe("BUTTON");
		expect(actions[1].text()).toBe("");
	});

	it("emits sign-out from either Sign out button", async () => {
		const wrapper = mountShell(0);

		await wrapper.find(".shell-side-foot button").trigger("click");
		expect(wrapper.emitted("sign-out")).toHaveLength(1);

		await wrapper.find('header button[aria-label="Sign out"]').trigger("click");
		expect(wrapper.emitted("sign-out")).toHaveLength(2);
	});
});

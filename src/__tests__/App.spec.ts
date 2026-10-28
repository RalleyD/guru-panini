import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.vue";
import AppShell from "../components/AppShell.vue";
import router from "../router";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn() }));
// The settings load is from("settings").select("agency_name").maybeSingle().
const settings = vi.hoisted(() => ({
	from: vi.fn(),
	select: vi.fn(),
	maybeSingle: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
	supabase: { auth, from: settings.from },
}));

const signedOut = { data: { session: null }, error: null };
const signedIn = { data: { session: { access_token: "token" } }, error: null };

// A mounted App watches the shared router, so unmount it before the next test.
enableAutoUnmount(afterEach);

function loadsSettings(result: { data: unknown; error: unknown }) {
	settings.maybeSingle.mockResolvedValue(result);
}

function brands(wrapper: ReturnType<typeof mountApp>) {
	return wrapper.findAll(".shell-brand-name").map((brand) => brand.text());
}

function mountApp() {
	return mount(App, {
		global: {
			plugins: [router],
		},
	});
}

describe("App", () => {
	beforeEach(() => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		settings.from.mockReset().mockReturnValue({ select: settings.select });
		settings.select
			.mockReset()
			.mockReturnValue({ maybeSingle: settings.maybeSingle });
		settings.maybeSingle.mockReset();
		loadsSettings({
			data: { agency_name: "  Demo Translation Agency " },
			error: null,
		});
	});

	it("renders the Overview page at /", async () => {
		auth.getSession.mockResolvedValue(signedIn);
		router.push("/");
		await router.isReady();

		const wrapper = mountApp();

		expect(wrapper.find("h1").text()).toBe("Overview");
	});

	it("renders /sign-in without the sidebar, top bar or tab bar", async () => {
		auth.getSession.mockResolvedValue(signedOut);
		await router.push("/sign-in");

		const wrapper = mountApp();

		expect(wrapper.find("h1").text()).toBe("Sign in");
		expect(wrapper.find("aside").exists()).toBe(false);
		expect(wrapper.find("header").exists()).toBe(false);
		expect(wrapper.find(".shell-tabbar").exists()).toBe(false);
	});

	it("signs out of this browser only and goes to /sign-in on the shell's sign-out", async () => {
		auth.getSession.mockResolvedValue(signedIn);
		auth.signOut.mockImplementation(async () => {
			auth.getSession.mockResolvedValue(signedOut);
			return { error: null };
		});
		await router.push("/");
		const wrapper = mountApp();

		wrapper.findComponent(AppShell).vm.$emit("sign-out");
		await flushPromises();

		expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
		expect(router.currentRoute.value.path).toBe("/sign-in");
		expect(wrapper.find("aside").exists()).toBe(false);
	});

	it("shows the trimmed agency name from settings in the shell, empty until it loads", async () => {
		auth.getSession.mockResolvedValue(signedIn);
		let finish: (value: unknown) => void = () => {};
		settings.maybeSingle.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		await router.push("/");
		await router.isReady();

		const wrapper = mountApp();
		await flushPromises();

		expect(settings.from).toHaveBeenCalledWith("settings");
		expect(settings.select).toHaveBeenCalledWith("agency_name");
		expect(brands(wrapper)).toEqual(["", ""]);

		finish({ data: { agency_name: " Demo Translation Agency " }, error: null });
		await flushPromises();

		expect(brands(wrapper)).toEqual([
			"Demo Translation Agency",
			"Demo Translation Agency",
		]);
	});

	it.each([
		[
			"the row has no agency name",
			{ data: { agency_name: null }, error: null },
		],
		["the agency name is blank", { data: { agency_name: "  " }, error: null }],
		["there is no settings row", { data: null, error: null }],
		["the load fails", { data: null, error: { message: "down" } }],
	])("shows guru-panini when %s", async (_, result) => {
		auth.getSession.mockResolvedValue(signedIn);
		loadsSettings(result);
		await router.push("/");

		const wrapper = mountApp();
		await flushPromises();

		expect(brands(wrapper)).toEqual(["guru-panini", "guru-panini"]);
	});

	it("keeps guru-panini on the sign-in page and loads no settings there", async () => {
		auth.getSession.mockResolvedValue(signedOut);
		await router.push("/sign-in");

		const wrapper = mountApp();
		await flushPromises();

		expect(wrapper.text()).toContain("guru-panini");
		expect(settings.from).not.toHaveBeenCalled();
	});

	it("loads the agency name again after sign-out and a new sign-in", async () => {
		auth.getSession.mockResolvedValue(signedIn);
		auth.signOut.mockImplementation(async () => {
			auth.getSession.mockResolvedValue(signedOut);
			return { error: null };
		});
		await router.push("/");
		const wrapper = mountApp();
		await flushPromises();
		expect(settings.from).toHaveBeenCalledTimes(1);

		wrapper.findComponent(AppShell).vm.$emit("sign-out");
		await flushPromises();
		auth.getSession.mockResolvedValue(signedIn);
		loadsSettings({
			data: { agency_name: "Demo Agency Renamed" },
			error: null,
		});
		await router.push("/");
		await flushPromises();

		expect(settings.from).toHaveBeenCalledTimes(2);
		expect(brands(wrapper)).toEqual([
			"Demo Agency Renamed",
			"Demo Agency Renamed",
		]);
	});
});

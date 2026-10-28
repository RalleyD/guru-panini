import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App.vue";
import AppShell from "../components/AppShell.vue";
import router from "../router";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { auth } }));

const signedOut = { data: { session: null }, error: null };
const signedIn = { data: { session: { access_token: "token" } }, error: null };

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
});

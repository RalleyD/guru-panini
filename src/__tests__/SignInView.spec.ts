import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "../router";
import SignInView from "../views/SignInView.vue";

const auth = vi.hoisted(() => ({
	getSession: vi.fn(),
	signInWithPassword: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({ supabase: { auth } }));

const signedOut = { data: { session: null }, error: null };
const signedIn = { data: { session: { access_token: "token" } }, error: null };

function failure(code: string) {
	return { data: { user: null, session: null }, error: { code } };
}

async function mountSignIn() {
	const wrapper = mount(SignInView, {
		global: {
			plugins: [router],
		},
	});
	await wrapper.find("#sign-in-email").setValue("demo-owner@example.com");
	await wrapper.find("#sign-in-password").setValue("secret-password");
	return wrapper;
}

describe("SignInView", () => {
	beforeEach(async () => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		auth.getSession.mockResolvedValue(signedOut);
		auth.signInWithPassword.mockReset();
		await router.push("/sign-in");
		await router.isReady();
	});

	it("renders the brand, labelled Email and Password inputs, one Sign in button and no links", () => {
		const wrapper = mount(SignInView, {
			global: {
				plugins: [router],
			},
		});

		expect(wrapper.text()).toContain("guru-panini");
		expect(wrapper.find("h1").text()).toBe("Sign in");
		for (const [label, type] of [
			["Email", "email"],
			["Password", "password"],
		]) {
			const labelEl = wrapper.findAll("label").find((l) => l.text() === label);
			const input = wrapper.find(`#${labelEl?.attributes("for")}`);
			expect(input.element.tagName).toBe("INPUT");
			expect(input.attributes("type")).toBe(type);
		}
		const buttons = wrapper.findAll("button");
		expect(buttons.map((b) => b.text())).toEqual(["Sign in"]);
		expect(wrapper.findAll("a")).toHaveLength(0);
	});

	it("passes the typed values to signInWithPassword", async () => {
		auth.signInWithPassword.mockResolvedValue(failure("invalid_credentials"));
		const wrapper = await mountSignIn();

		await wrapper.find("form").trigger("submit");
		await flushPromises();

		expect(auth.signInWithPassword).toHaveBeenCalledWith({
			email: "demo-owner@example.com",
			password: "secret-password",
		});
	});

	it("goes to / on success", async () => {
		auth.signInWithPassword.mockImplementation(async () => {
			auth.getSession.mockResolvedValue(signedIn);
			return { data: { user: {}, session: {} }, error: null };
		});
		const wrapper = await mountSignIn();

		await wrapper.find("form").trigger("submit");
		await flushPromises();

		expect(router.currentRoute.value.path).toBe("/");
	});

	it("shows the incorrect-credentials message in an alert before the button", async () => {
		auth.signInWithPassword.mockResolvedValue(failure("invalid_credentials"));
		const wrapper = await mountSignIn();

		await wrapper.find("form").trigger("submit");
		await flushPromises();

		const alert = wrapper.find('[role="alert"]');
		expect(alert.text()).toBe("Email or password is incorrect");
		expect(
			alert.element.previousElementSibling?.querySelector("input")?.id,
		).toBe("sign-in-password");
		expect(alert.element.nextElementSibling?.tagName).toBe("BUTTON");
		expect(router.currentRoute.value.path).toBe("/sign-in");
		expect(
			(wrapper.find("#sign-in-email").element as HTMLInputElement).value,
		).toBe("demo-owner@example.com");
	});

	it("shows a try-again message for any other error", async () => {
		auth.signInWithPassword.mockResolvedValue(
			failure("over_request_rate_limit"),
		);
		const wrapper = await mountSignIn();

		await wrapper.find("form").trigger("submit");
		await flushPromises();

		expect(wrapper.find('[role="alert"]').text()).toBe(
			"Could not sign in. Try again in a moment.",
		);
	});

	it("disables the button and clears the old error while the request is pending", async () => {
		auth.signInWithPassword.mockResolvedValueOnce(
			failure("invalid_credentials"),
		);
		const wrapper = await mountSignIn();
		const button = wrapper.find("button");
		await wrapper.find("form").trigger("submit");
		await flushPromises();
		expect(wrapper.find('[role="alert"]').exists()).toBe(true);

		let finish: (value: unknown) => void = () => {};
		auth.signInWithPassword.mockReturnValueOnce(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		await wrapper.find("form").trigger("submit");

		expect(button.attributes("disabled")).toBeDefined();
		expect(wrapper.find('[role="alert"]').exists()).toBe(false);

		finish(failure("invalid_credentials"));
		await flushPromises();

		expect(button.attributes("disabled")).toBeUndefined();
	});
});

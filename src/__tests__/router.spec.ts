import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("../lib/supabase", () => ({ supabase: { auth } }));

// A fresh router for each navigation, so no test starts where another ended.
async function navigate(path: string) {
	vi.resetModules();
	const { default: router } = await import("../router");
	await router.push(path);
	return router.currentRoute.value.path;
}

describe("router guard", () => {
	beforeEach(() => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	});

	describe("signed out", () => {
		beforeEach(() => {
			auth.getSession.mockResolvedValue({
				data: { session: null },
				error: null,
			});
		});

		it.each([
			"/",
			"/clients",
			"/clients/new",
			"/settings#support",
			"/no-such-page",
		])("sends %s to /sign-in", async (path) => {
			expect(await navigate(path)).toBe("/sign-in");
		});

		it("allows /sign-in", async () => {
			expect(await navigate("/sign-in")).toBe("/sign-in");
		});
	});

	describe("signed in", () => {
		beforeEach(() => {
			auth.getSession.mockResolvedValue({
				data: { session: { access_token: "token" } },
				error: null,
			});
		});

		it("sends /sign-in to /", async () => {
			expect(await navigate("/sign-in")).toBe("/");
		});

		it("keeps /clients on /clients", async () => {
			expect(await navigate("/clients")).toBe("/clients");
		});
	});
});

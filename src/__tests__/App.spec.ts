import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import App from "../App.vue";
import router from "../router";

describe("App", () => {
	it("renders the Overview page at /", async () => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		router.push("/");
		await router.isReady();

		const wrapper = mount(App, {
			global: {
				plugins: [router],
			},
		});

		expect(wrapper.find("h1").text()).toBe("Overview");
	});
});

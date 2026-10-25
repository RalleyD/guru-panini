import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import App from "../App.vue";
import router from "../router";

describe("App", () => {
	it("renders the home page at /", async () => {
		router.push("/");
		await router.isReady();

		const wrapper = mount(App, {
			global: {
				plugins: [router],
			},
		});

		expect(wrapper.find("h1").text()).toBe("guru-panini");
	});
});

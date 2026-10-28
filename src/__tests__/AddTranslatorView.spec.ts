import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import router from "../router";
import AddTranslatorView from "../views/AddTranslatorView.vue";

const db = vi.hoisted(() => ({
	getSession: vi.fn(),
	from: vi.fn(),
	insert: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
	supabase: { auth: { getSession: db.getSession }, from: db.from },
}));

async function mountForm() {
	const wrapper = mount(AddTranslatorView, {
		attachTo: document.body,
		global: { plugins: [router] },
	});
	await flushPromises();
	return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountForm>>;

function fieldFor(wrapper: Wrapper, label: string) {
	const labelEl = wrapper.findAll("label").find((l) => l.text() === label);
	return wrapper.find(`#${labelEl?.attributes("for")}`);
}

function checkboxFor(wrapper: Wrapper, label: string) {
	const labels = wrapper.findAll("fieldset label");
	const index = labels.findIndex((l) => l.text() === label);
	return wrapper.findAll<HTMLInputElement>("fieldset input[type='checkbox']")[
		index
	];
}

async function fillRequired(wrapper: Wrapper) {
	await fieldFor(wrapper, "Name").setValue("Demo New Translator");
	await fieldFor(wrapper, "Email").setValue("new-translator@example.com");
}

async function submit(wrapper: Wrapper) {
	await wrapper.find("form").trigger("submit");
	await flushPromises();
}

describe("AddTranslatorView", () => {
	let wrapper: Wrapper | undefined;

	afterEach(() => {
		wrapper?.unmount();
	});

	beforeEach(async () => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		db.getSession.mockResolvedValue({
			data: { session: { access_token: "token" } },
			error: null,
		});
		db.from.mockReset().mockReturnValue({ insert: db.insert });
		db.insert.mockReset();
		await router.push("/translators/new");
	});

	it("shows the header, both cards, labelled fields, checkboxes and the actions", async () => {
		wrapper = await mountForm();

		const back = wrapper
			.findAll("a")
			.find((a) => a.text() === "Back to translators");
		expect(back?.attributes("href")).toBe("/translators");
		expect(wrapper.find("h1").text()).toBe("Add translator");
		expect(wrapper.text()).toContain(
			"A name and an email are enough to begin.",
		);
		expect(wrapper.findAll("h2").map((h) => h.text())).toEqual([
			"To start",
			"Optional",
		]);
		expect(wrapper.text()).toContain(
			"All of this can be added or changed afterwards.",
		);

		for (const label of ["Name", "Email", "Specialisms", "Availability"]) {
			expect(fieldFor(wrapper, label).element.tagName).toBe("INPUT");
			expect(
				wrapper
					.findAll("label")
					.find((l) => l.text() === label)
					?.classes(),
			).toContain("field-label");
		}
		expect(fieldFor(wrapper, "Email").attributes("type")).toBe("email");
		expect(fieldFor(wrapper, "Specialisms").attributes("placeholder")).toBe(
			"e.g. legal, technical",
		);
		expect(fieldFor(wrapper, "Availability").attributes("placeholder")).toBe(
			"e.g. not available 10 to 14 Nov",
		);

		const fieldset = wrapper.find("fieldset");
		expect(fieldset.find("legend").text()).toBe("Language pairs");
		const checkboxes = fieldset.findAll("label");
		expect(checkboxes.map((l) => l.text())).toEqual([
			"Dutch → English",
			"English → Dutch",
			"English → Spanish",
		]);
		for (const label of checkboxes) {
			const box = label.find("input[type='checkbox']");
			expect((box.element as HTMLInputElement).checked).toBe(false);
		}

		expect(wrapper.find("button[type='submit']").text()).toBe("Add translator");
		const cancel = wrapper.findAll("a").find((a) => a.text() === "Cancel");
		expect(cancel?.attributes("href")).toBe("/translators");
	});

	it("shows an error under each empty required field, focuses the first and inserts nothing", async () => {
		wrapper = await mountForm();

		await submit(wrapper);

		for (const [label, message] of [
			["Name", "Enter the translator's name"],
			["Email", "Enter a valid email address"],
		]) {
			const field = fieldFor(wrapper, label);
			expect(field.attributes("aria-invalid")).toBe("true");
			const describedBy = field.attributes("aria-describedby");
			expect(wrapper.find(`#${describedBy}`).text()).toBe(message);
		}
		expect(document.activeElement).toBe(fieldFor(wrapper, "Name").element);
		expect(db.from).not.toHaveBeenCalled();
	});

	it("shows only the email error for an invalid email and focuses it", async () => {
		wrapper = await mountForm();
		await fieldFor(wrapper, "Name").setValue("Demo New Translator");
		await fieldFor(wrapper, "Email").setValue("not-an-email");

		await submit(wrapper);

		expect(
			wrapper.findAll(".add-translator-error").map((e) => e.text()),
		).toEqual(["Enter a valid email address"]);
		expect(
			fieldFor(wrapper, "Name").attributes("aria-invalid"),
		).toBeUndefined();
		expect(document.activeElement).toBe(fieldFor(wrapper, "Email").element);
		expect(db.from).not.toHaveBeenCalled();
	});

	it("inserts the parsed payload without owner_id and goes to /translators", async () => {
		db.insert.mockResolvedValue({ error: null });
		wrapper = await mountForm();
		await fillRequired(wrapper);
		await checkboxFor(wrapper, "English → Spanish").setValue(true);
		await fieldFor(wrapper, "Specialisms").setValue(
			"legal, Commercial, , legal",
		);
		await fieldFor(wrapper, "Availability").setValue("Demo availability note");

		await submit(wrapper);

		expect(db.from).toHaveBeenCalledWith("translators");
		const payload = db.insert.mock.calls[0][0];
		expect(payload).toEqual({
			name: "Demo New Translator",
			email: "new-translator@example.com",
			language_pairs: ["en-es"],
			specialisms: ["legal", "Commercial"],
			availability: "Demo availability note",
		});
		expect(payload).not.toHaveProperty("owner_id");
		expect(router.currentRoute.value.fullPath).toBe("/translators");
	});

	it("sends empty lists and a null availability for the optional fields left empty", async () => {
		db.insert.mockResolvedValue({ error: null });
		wrapper = await mountForm();
		await fillRequired(wrapper);

		await submit(wrapper);

		expect(db.insert.mock.calls[0][0]).toMatchObject({
			language_pairs: [],
			specialisms: [],
			availability: null,
		});
	});

	it("disables the button while the insert is in flight", async () => {
		let finish: (value: unknown) => void = () => {};
		db.insert.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		wrapper = await mountForm();
		await fillRequired(wrapper);
		const button = wrapper.find("button[type='submit']");

		await wrapper.find("form").trigger("submit");

		expect(button.attributes("disabled")).toBeDefined();
		finish({ error: { message: "failed" } });
		await flushPromises();
		expect(button.attributes("disabled")).toBeUndefined();
	});

	it("keeps the typed values and checked boxes and shows the save-failed alert when the insert fails, then retries", async () => {
		db.insert.mockResolvedValue({ error: { message: "failed" } });
		wrapper = await mountForm();
		await fillRequired(wrapper);
		await checkboxFor(wrapper, "Dutch → English").setValue(true);
		await checkboxFor(wrapper, "English → Spanish").setValue(true);
		await fieldFor(wrapper, "Specialisms").setValue("legal");
		await fieldFor(wrapper, "Availability").setValue("Demo availability note");

		await submit(wrapper);

		const alert = wrapper.find('[role="alert"]');
		expect(alert.text()).toContain("Your changes were not saved");
		expect(alert.text()).toContain(
			"Nothing was lost. Your edits are still on this page. Try again.",
		);
		expect(router.currentRoute.value.path).toBe("/translators/new");
		for (const [label, value] of [
			["Name", "Demo New Translator"],
			["Email", "new-translator@example.com"],
			["Specialisms", "legal"],
			["Availability", "Demo availability note"],
		]) {
			expect((fieldFor(wrapper, label).element as HTMLInputElement).value).toBe(
				value,
			);
		}
		const checked = (label: string) =>
			checkboxFor(wrapper as Wrapper, label).element.checked;
		expect(checked("Dutch → English")).toBe(true);
		expect(checked("English → Dutch")).toBe(false);
		expect(checked("English → Spanish")).toBe(true);

		db.insert.mockResolvedValue({ error: null });
		await submit(wrapper);

		expect(db.insert).toHaveBeenCalledTimes(2);
		expect(router.currentRoute.value.fullPath).toBe("/translators");
	});
});

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import router from "../router";
import AddClientView from "../views/AddClientView.vue";

const db = vi.hoisted(() => ({
	getSession: vi.fn(),
	from: vi.fn(),
	insert: vi.fn(),
	select: vi.fn(),
	single: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
	supabase: { auth: { getSession: db.getSession }, from: db.from },
}));

async function mountForm() {
	const wrapper = mount(AddClientView, {
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

async function fillRequired(wrapper: Wrapper) {
	await fieldFor(wrapper, "Client name").setValue("Demo New Client");
	await fieldFor(wrapper, "Contact name").setValue("Demo New Contact");
	await fieldFor(wrapper, "Contact email").setValue("new-contact@example.com");
}

async function submit(wrapper: Wrapper) {
	await wrapper.find("form").trigger("submit");
	await flushPromises();
}

describe("AddClientView", () => {
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
		db.insert.mockReset().mockReturnValue({ select: db.select });
		db.select.mockReset().mockReturnValue({ single: db.single });
		db.single.mockReset();
		await router.push("/clients/new");
	});

	it("shows the header, both cards, labelled fields and the actions", async () => {
		wrapper = await mountForm();

		const back = wrapper
			.findAll("a")
			.find((a) => a.text() === "Back to clients");
		expect(back?.attributes("href")).toBe("/clients");
		expect(wrapper.find("h1").text()).toBe("Add client");
		expect(wrapper.text()).toContain(
			"A name and a contact are enough to begin.",
		);
		expect(wrapper.findAll("h2").map((h) => h.text())).toEqual([
			"To start",
			"Optional",
		]);
		expect(wrapper.text()).toContain(
			"All of this can be added or changed afterwards.",
		);

		for (const [label, tag] of [
			["Client name", "INPUT"],
			["Contact name", "INPUT"],
			["Contact email", "INPUT"],
			["Usual language pair", "SELECT"],
			["Usual type of work", "SELECT"],
			["Notes", "TEXTAREA"],
		]) {
			const field = fieldFor(wrapper, label);
			expect(field.element.tagName).toBe(tag);
			expect(
				wrapper
					.findAll("label")
					.find((l) => l.text() === label)
					?.classes(),
			).toContain("field-label");
		}
		expect(fieldFor(wrapper, "Client name").attributes("placeholder")).toBe(
			"e.g. Company or person",
		);
		expect(fieldFor(wrapper, "Contact email").attributes("type")).toBe("email");
		expect(fieldFor(wrapper, "Notes").attributes("rows")).toBe("3");

		const options = (label: string) =>
			fieldFor(wrapper as Wrapper, label)
				.findAll("option")
				.map((o) => o.text());
		expect(options("Usual language pair")).toEqual([
			"Not sure yet",
			"NL → EN",
			"EN → NL",
			"EN → ES",
		]);
		expect(options("Usual type of work")).toEqual([
			"Not sure yet",
			"Legal",
			"Real estate",
			"Technical",
			"Business",
			"Mixed",
		]);
		for (const label of ["Usual language pair", "Usual type of work"]) {
			expect(
				(fieldFor(wrapper, label).element as HTMLSelectElement).value,
			).toBe("Not sure yet");
		}

		expect(wrapper.find("button[type='submit']").text()).toBe("Add client");
		const cancel = wrapper.findAll("a").find((a) => a.text() === "Cancel");
		expect(cancel?.attributes("href")).toBe("/clients");
	});

	it("shows an error under each empty required field, focuses the first and inserts nothing", async () => {
		wrapper = await mountForm();

		await submit(wrapper);

		for (const [label, message] of [
			["Client name", "Enter the client name"],
			["Contact name", "Enter the contact name"],
			["Contact email", "Enter a valid email address"],
		]) {
			const field = fieldFor(wrapper, label);
			expect(field.attributes("aria-invalid")).toBe("true");
			const describedBy = field.attributes("aria-describedby");
			expect(wrapper.find(`#${describedBy}`).text()).toBe(message);
		}
		expect(document.activeElement).toBe(
			fieldFor(wrapper, "Client name").element,
		);
		expect(db.from).not.toHaveBeenCalled();
	});

	it("shows only the email error for an invalid email and focuses it", async () => {
		wrapper = await mountForm();
		await fillRequired(wrapper);
		await fieldFor(wrapper, "Contact email").setValue("not-an-email");

		await submit(wrapper);

		expect(wrapper.findAll(".add-client-error").map((e) => e.text())).toEqual([
			"Enter a valid email address",
		]);
		expect(
			fieldFor(wrapper, "Client name").attributes("aria-invalid"),
		).toBeUndefined();
		expect(document.activeElement).toBe(
			fieldFor(wrapper, "Contact email").element,
		);
		expect(db.from).not.toHaveBeenCalled();
	});

	it("inserts the parsed payload without owner_id and goes to the new client", async () => {
		db.single.mockResolvedValue({ data: { id: "new-id" }, error: null });
		wrapper = await mountForm();
		await fillRequired(wrapper);
		await fieldFor(wrapper, "Usual language pair").setValue("EN → ES");
		await fieldFor(wrapper, "Usual type of work").setValue("Business");
		await fieldFor(wrapper, "Notes").setValue("Demo note");

		await submit(wrapper);

		expect(db.from).toHaveBeenCalledWith("clients");
		const payload = db.insert.mock.calls[0][0];
		expect(payload).toEqual({
			name: "Demo New Client",
			contact_name: "Demo New Contact",
			contact_email: "new-contact@example.com",
			usual_source_language: "en",
			usual_target_language: "es",
			usual_work_type: "business",
			notes: "Demo note",
		});
		expect(payload).not.toHaveProperty("owner_id");
		expect(db.select).toHaveBeenCalledWith("id");
		expect(router.currentRoute.value.fullPath).toBe("/clients?client=new-id");
	});

	it("sends nulls for the optional fields left at their defaults", async () => {
		db.single.mockResolvedValue({ data: { id: "new-id" }, error: null });
		wrapper = await mountForm();
		await fillRequired(wrapper);

		await submit(wrapper);

		expect(db.insert.mock.calls[0][0]).toMatchObject({
			usual_source_language: null,
			usual_target_language: null,
			usual_work_type: null,
			notes: null,
		});
	});

	it("disables the button while the insert is in flight", async () => {
		let finish: (value: unknown) => void = () => {};
		db.single.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		wrapper = await mountForm();
		await fillRequired(wrapper);
		const button = wrapper.find("button[type='submit']");

		await wrapper.find("form").trigger("submit");

		expect(button.attributes("disabled")).toBeDefined();
		finish({ data: null, error: { message: "failed" } });
		await flushPromises();
		expect(button.attributes("disabled")).toBeUndefined();
	});

	it("keeps the typed values and shows the save-failed alert when the insert fails, then retries", async () => {
		db.single.mockResolvedValue({ data: null, error: { message: "failed" } });
		wrapper = await mountForm();
		await fillRequired(wrapper);
		await fieldFor(wrapper, "Usual language pair").setValue("NL → EN");
		await fieldFor(wrapper, "Notes").setValue("Demo note");

		await submit(wrapper);

		const alert = wrapper.find('[role="alert"]');
		expect(alert.text()).toContain("Your changes were not saved");
		expect(alert.text()).toContain(
			"Nothing was lost. Your edits are still on this page. Try again.",
		);
		expect(router.currentRoute.value.path).toBe("/clients/new");
		for (const [label, value] of [
			["Client name", "Demo New Client"],
			["Contact name", "Demo New Contact"],
			["Contact email", "new-contact@example.com"],
			["Usual language pair", "NL → EN"],
			["Notes", "Demo note"],
		]) {
			expect((fieldFor(wrapper, label).element as HTMLInputElement).value).toBe(
				value,
			);
		}

		db.single.mockResolvedValue({ data: { id: "new-id" }, error: null });
		await submit(wrapper);

		expect(db.insert).toHaveBeenCalledTimes(2);
		expect(router.currentRoute.value.fullPath).toBe("/clients?client=new-id");
	});
});

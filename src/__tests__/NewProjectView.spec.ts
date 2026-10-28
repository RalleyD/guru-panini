import { flushPromises, mount } from "@vue/test-utils";
import { strToU8, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import router from "../router";
import NewProjectView from "../views/NewProjectView.vue";

const db = vi.hoisted(() => ({
	getSession: vi.fn(),
	from: vi.fn(),
	rpc: vi.fn(),
	storageFrom: vi.fn(),
	upload: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
	supabase: {
		auth: { getSession: db.getSession },
		from: db.from,
		rpc: db.rpc,
		storage: { from: db.storageFrom },
	},
}));

const userId = "de000000-0000-4000-8000-000000000001";

const clients = [
	{
		id: "client-legal",
		name: "Demo Legal Client",
		usual_source_language: "nl",
		usual_target_language: "en",
	},
	{
		id: "client-french",
		name: "Demo French Client",
		usual_source_language: "fr",
		usual_target_language: "en",
	},
	{
		id: "client-open",
		name: "Demo Open Client",
		usual_source_language: null,
		usual_target_language: null,
	},
];

const translators = [
	{ id: "translator-one", name: "Demo Translator One" },
	{ id: "translator-two", name: "Demo Translator Two" },
];

type Result = { data: unknown; error: unknown };

// One select().is().order() chain per table, resolving to that table's result.
function mockTables(results: Record<string, Result>) {
	const chains: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
	db.from.mockReset().mockImplementation((name: string) => {
		const chain = {
			select: vi.fn(() => chain),
			is: vi.fn(() => chain),
			order: vi.fn(() => Promise.resolve(results[name])),
		};
		chains[name] = chain;
		return chain;
	});
	return chains;
}

function docxFile(name: string, text: string): File {
	const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`;
	const bytes = zipSync({ "word/document.xml": strToU8(xml) });
	return new File([bytes], name);
}

async function mountForm() {
	const wrapper = mount(NewProjectView, {
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

function fieldValue(wrapper: Wrapper, label: string): string {
	return (fieldFor(wrapper, label).element as HTMLInputElement).value;
}

function optionsOf(wrapper: Wrapper, label: string): string[] {
	return fieldFor(wrapper, label)
		.findAll("option")
		.map((o) => o.text());
}

function describedText(wrapper: Wrapper, label: string): string {
	const ids = fieldFor(wrapper, label).attributes("aria-describedby") ?? "";
	return ids
		.split(" ")
		.filter(Boolean)
		.map((id) => wrapper.find(`#${id}`).text())
		.join(" | ");
}

async function chooseFile(wrapper: Wrapper, file: File) {
	const input = fieldFor(wrapper, "Source file");
	Object.defineProperty(input.element, "files", {
		value: [file],
		configurable: true,
	});
	await input.trigger("change");
	await flushPromises();
}

async function fillRequired(wrapper: Wrapper) {
	await fieldFor(wrapper, "Client").setValue("client-legal");
	await fieldFor(wrapper, "Title").setValue("Demo Spec Project");
	await fieldFor(wrapper, "Document type").setValue("legal");
	await fieldFor(wrapper, "Due date").setValue("2026-11-20");
}

async function submit(wrapper: Wrapper) {
	await wrapper.find("form").trigger("submit");
	await flushPromises();
}

const requiredArgs = {
	client_id: "client-legal",
	title: "Demo Spec Project",
	document_type: "legal",
	due_date: "2026-11-20",
	source_language: "nl",
	target_language: "en",
};

describe("NewProjectView", () => {
	let wrapper: Wrapper | undefined;
	let chains: ReturnType<typeof mockTables>;

	afterEach(() => {
		wrapper?.unmount();
	});

	beforeEach(async () => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		db.getSession.mockResolvedValue({
			data: { session: { access_token: "token", user: { id: userId } } },
			error: null,
		});
		chains = mockTables({
			clients: { data: clients, error: null },
			translators: { data: translators, error: null },
		});
		db.rpc.mockReset().mockResolvedValue({ data: "new-project", error: null });
		db.upload.mockReset().mockResolvedValue({ data: {}, error: null });
		db.storageFrom.mockReset().mockReturnValue({ upload: db.upload });
		await router.push("/projects/new");
	});

	it("shows the header, both cards, labelled fields, options and actions", async () => {
		wrapper = await mountForm();

		const back = wrapper
			.findAll("a")
			.find((a) => a.text() === "Back to projects");
		expect(back?.attributes("href")).toBe("/projects");
		expect(wrapper.find("h1").text()).toBe("New project");
		expect(wrapper.text()).toContain(
			"Five things to start. You can add everything else later.",
		);
		expect(wrapper.findAll("h2").map((h) => h.text())).toEqual([
			"To start",
			"Optional",
		]);
		expect(wrapper.text()).toContain(
			"All of this can be added or changed afterwards.",
		);

		for (const [label, tag] of [
			["Client", "SELECT"],
			["Title", "INPUT"],
			["Document type", "SELECT"],
			["Due date", "INPUT"],
			["Language pair", "SELECT"],
			["Source file", "INPUT"],
			["Translator", "SELECT"],
		]) {
			expect(fieldFor(wrapper, label).element.tagName).toBe(tag);
		}
		expect(fieldFor(wrapper, "Title").attributes("placeholder")).toBe(
			"e.g. Annual report summary",
		);
		expect(fieldFor(wrapper, "Due date").attributes("type")).toBe("date");
		const file = fieldFor(wrapper, "Source file");
		expect(file.attributes("type")).toBe("file");
		expect(file.attributes("accept")).toBe(".docx,.pdf");
		expect(describedText(wrapper, "Source file")).toBe(
			"The word count is read from the file. Without a file, no word count is shown.",
		);

		expect(optionsOf(wrapper, "Client")).toEqual([
			"Choose a client",
			"Demo Legal Client",
			"Demo French Client",
			"Demo Open Client",
		]);
		expect(
			fieldFor(wrapper, "Client").find("option").attributes("disabled"),
		).toBeDefined();
		expect(optionsOf(wrapper, "Document type")).toEqual([
			"Choose one",
			"Legal",
			"Real estate",
			"Technical",
			"Business",
			"Other",
		]);
		expect(optionsOf(wrapper, "Language pair")).toEqual([
			"Choose one",
			"NL → EN",
			"EN → NL",
			"EN → ES",
			"ES → EN",
		]);
		expect(optionsOf(wrapper, "Translator")).toEqual([
			"Decide later",
			"Demo Translator One",
			"Demo Translator Two",
		]);
		for (const label of ["Client", "Document type", "Language pair"]) {
			expect(fieldValue(wrapper, label)).toBe("");
		}
		expect(describedText(wrapper, "Language pair")).toBe("");

		expect(wrapper.find("button[type='submit']").text()).toBe("Create project");
		const cancel = wrapper.findAll("a").find((a) => a.text() === "Cancel");
		expect(cancel?.attributes("href")).toBe("/");
	});

	it("loads active clients and translators ordered by name", async () => {
		wrapper = await mountForm();

		for (const name of ["clients", "translators"]) {
			expect(chains[name].is).toHaveBeenCalledWith("archived_at", null);
			expect(chains[name].order).toHaveBeenCalledWith("name");
		}
		expect(chains.clients.select.mock.calls[0][0]).toContain(
			"usual_source_language",
		);
	});

	it("sets the pair from the client and says whether it matches the usual pair", async () => {
		wrapper = await mountForm();

		await fieldFor(wrapper, "Client").setValue("client-legal");
		expect(fieldValue(wrapper, "Language pair")).toBe("nl-en");
		expect(describedText(wrapper, "Language pair")).toBe(
			"Set from Demo Legal Client. Change it if this project differs.",
		);

		await fieldFor(wrapper, "Language pair").setValue("en-nl");
		expect(describedText(wrapper, "Language pair")).toBe(
			"Different from Demo Legal Client’s usual pair (NL → EN).",
		);

		await fieldFor(wrapper, "Client").setValue("client-french");
		expect(optionsOf(wrapper, "Language pair")).toContain("FR → EN");
		expect(fieldValue(wrapper, "Language pair")).toBe("fr-en");
		expect(describedText(wrapper, "Language pair")).toBe(
			"Set from Demo French Client. Change it if this project differs.",
		);

		await fieldFor(wrapper, "Language pair").setValue("es-en");
		await fieldFor(wrapper, "Client").setValue("client-open");
		expect(fieldValue(wrapper, "Language pair")).toBe("es-en");
		expect(describedText(wrapper, "Language pair")).toBe("");
	});

	it("shows the five messages on an empty submit, focuses the client and saves nothing", async () => {
		wrapper = await mountForm();

		await submit(wrapper);

		for (const [label, message] of [
			["Client", "Choose a client"],
			["Title", "Enter a title"],
			["Document type", "Choose a document type"],
			["Due date", "Choose a due date"],
			["Language pair", "Choose a language pair"],
		]) {
			expect(fieldFor(wrapper, label).attributes("aria-invalid")).toBe("true");
			expect(describedText(wrapper, label)).toBe(message);
		}
		expect(document.activeElement).toBe(fieldFor(wrapper, "Client").element);
		expect(db.rpc).not.toHaveBeenCalled();
		expect(db.upload).not.toHaveBeenCalled();
	});

	it("creates a project without a file or translator and goes to Projects", async () => {
		wrapper = await mountForm();
		await fillRequired(wrapper);

		await submit(wrapper);

		expect(db.upload).not.toHaveBeenCalled();
		expect(db.rpc).toHaveBeenCalledWith("create_project", requiredArgs);
		const args = db.rpc.mock.calls[0][1];
		for (const key of [
			"word_count",
			"source_file_path",
			"source_file_name",
			"translator_id",
		]) {
			expect(args[key]).toBeUndefined();
		}
		expect(router.currentRoute.value.path).toBe("/projects");
	});

	it("reads the word count from a .docx, uploads it under the user's folder and saves both", async () => {
		wrapper = await mountForm();
		await fillRequired(wrapper);
		await fieldFor(wrapper, "Translator").setValue("translator-two");

		await chooseFile(wrapper, docxFile("demo.docx", "Demo source one two"));
		expect(describedText(wrapper, "Source file")).toBe("4 words in this file.");

		await submit(wrapper);

		expect(db.storageFrom).toHaveBeenCalledWith("source-files");
		const [path, file, options] = db.upload.mock.calls[0];
		expect(path).toMatch(new RegExp(`^${userId}/[0-9a-f-]{36}\\.docx$`));
		expect(file.name).toBe("demo.docx");
		expect(options).toEqual({
			contentType:
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		});
		expect(db.rpc).toHaveBeenCalledWith("create_project", {
			...requiredArgs,
			translator_id: "translator-two",
			word_count: 4,
			source_file_path: path,
			source_file_name: "demo.docx",
		});
		expect(router.currentRoute.value.path).toBe("/projects");
	});

	it("uploads a .pdf with no word count", async () => {
		wrapper = await mountForm();
		await fillRequired(wrapper);

		await chooseFile(wrapper, new File(["%PDF-1.4"], "Demo brief.PDF"));
		expect(describedText(wrapper, "Source file")).toBe(
			"The word count is read from the file. Without a file, no word count is shown.",
		);
		await submit(wrapper);

		const [path, , options] = db.upload.mock.calls[0];
		expect(path).toMatch(new RegExp(`^${userId}/.+\\.pdf$`));
		expect(options).toEqual({ contentType: "application/pdf" });
		const args = db.rpc.mock.calls[0][1];
		expect(args.word_count).toBeUndefined();
		expect(args.source_file_path).toBe(path);
		expect(args.source_file_name).toBe("Demo brief.PDF");
	});

	it.each([
		["a .txt file", new File(["Demo notes"], "demo.txt")],
		["a .docx that is not a Word file", new File(["Demo notes"], "fake.docx")],
	])(
		"rejects %s, clears the input and still creates without a file",
		async (_, badFile) => {
			wrapper = await mountForm();
			await fillRequired(wrapper);
			const input = fieldFor(wrapper, "Source file");
			const setValue = vi.spyOn(
				input.element as HTMLInputElement,
				"value",
				"set",
			);

			await chooseFile(wrapper, badFile);

			expect(describedText(wrapper, "Source file")).toContain(
				"That file could not be read",
			);
			expect(describedText(wrapper, "Source file")).toContain(
				"Word and PDF files work best. You can create the project now and add the file later.",
			);
			expect(setValue).toHaveBeenCalledWith("");

			await chooseFile(wrapper, docxFile("demo.docx", "one"));
			expect(wrapper.text()).not.toContain("That file could not be read");
			expect(describedText(wrapper, "Source file")).toBe(
				"1 word in this file.",
			);

			await chooseFile(wrapper, badFile);
			await submit(wrapper);

			expect(db.upload).not.toHaveBeenCalled();
			expect(db.rpc).toHaveBeenCalledWith("create_project", requiredArgs);
			expect(router.currentRoute.value.path).toBe("/projects");
		},
	);

	it("disables Create project while saving", async () => {
		let finish: (value: unknown) => void = () => {};
		db.rpc.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		wrapper = await mountForm();
		await fillRequired(wrapper);
		const button = wrapper.find("button[type='submit']");

		await wrapper.find("form").trigger("submit");
		await flushPromises();

		expect(button.attributes("disabled")).toBeDefined();
		finish({ data: null, error: { message: "failed" } });
		await flushPromises();
		expect(button.attributes("disabled")).toBeUndefined();
	});

	it("keeps every value on a failed save and does not upload the same file again on retry", async () => {
		db.rpc.mockResolvedValue({ data: null, error: { message: "failed" } });
		wrapper = await mountForm();
		await fillRequired(wrapper);
		await fieldFor(wrapper, "Translator").setValue("translator-one");
		await chooseFile(wrapper, docxFile("demo.docx", "Demo source"));

		await submit(wrapper);

		const alert = wrapper.find('[role="alert"]');
		expect(alert.text()).toContain("Your changes were not saved");
		expect(alert.text()).toContain(
			"Nothing was lost. Your edits are still on this page. Try again.",
		);
		expect(router.currentRoute.value.path).toBe("/projects/new");
		for (const [label, value] of [
			["Client", "client-legal"],
			["Title", "Demo Spec Project"],
			["Document type", "legal"],
			["Due date", "2026-11-20"],
			["Language pair", "nl-en"],
			["Translator", "translator-one"],
		]) {
			expect(fieldValue(wrapper, label)).toBe(value);
		}
		expect(describedText(wrapper, "Source file")).toBe("2 words in this file.");

		db.rpc.mockResolvedValue({ data: "new-project", error: null });
		await submit(wrapper);

		expect(db.upload).toHaveBeenCalledTimes(1);
		expect(db.rpc).toHaveBeenCalledTimes(2);
		expect(db.rpc.mock.calls[1][1].source_file_path).toBe(
			db.upload.mock.calls[0][0],
		);
		expect(router.currentRoute.value.path).toBe("/projects");
	});

	it("shows the save error when the upload fails and calls nothing else", async () => {
		db.upload.mockResolvedValue({ data: null, error: { message: "failed" } });
		wrapper = await mountForm();
		await fillRequired(wrapper);
		await chooseFile(wrapper, new File(["%PDF-1.4"], "demo.pdf"));

		await submit(wrapper);

		expect(wrapper.find('[role="alert"]').text()).toContain(
			"Your changes were not saved",
		);
		expect(db.rpc).not.toHaveBeenCalled();
	});

	it("shows the load error in place of the form and reloads on Try again", async () => {
		chains = mockTables({
			clients: { data: null, error: { message: "failed" } },
			translators: { data: translators, error: null },
		});
		wrapper = await mountForm();

		expect(wrapper.find('[role="alert"]').text()).toBe(
			"Clients and translators could not be loaded. Nothing was lost.",
		);
		expect(wrapper.find("form").exists()).toBe(false);

		chains = mockTables({
			clients: { data: clients, error: null },
			translators: { data: translators, error: null },
		});
		const retry = wrapper
			.findAll("button")
			.find((b) => b.text() === "Try again");
		await retry?.trigger("click");
		await flushPromises();

		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
		expect(optionsOf(wrapper, "Client")).toContain("Demo Legal Client");
	});

	it("says there are no clients yet with a link to add one", async () => {
		chains = mockTables({
			clients: { data: [], error: null },
			translators: { data: translators, error: null },
		});
		wrapper = await mountForm();

		expect(describedText(wrapper, "Client")).toContain("No clients yet.");
		const add = wrapper.findAll("a").find((a) => a.text() === "Add client");
		expect(add?.attributes("href")).toBe("/clients/new");
	});
});

import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "../router";
import ClientsView from "../views/ClientsView.vue";

const db = vi.hoisted(() => ({
	getSession: vi.fn(),
	from: vi.fn(),
	select: vi.fn(),
	is: vi.fn(),
	order: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
	supabase: { auth: { getSession: db.getSession }, from: db.from },
}));

type State = "ready" | "opened" | "done";

function project(
	id: string,
	title: string,
	dueDate: string,
	options: { archived?: boolean; followUps?: State[] } = {},
) {
	return {
		id,
		title,
		due_date: dueDate,
		archived_at: options.archived ? "2026-10-01T00:00:00Z" : null,
		follow_ups: (options.followUps ?? []).map((state) => ({ state })),
	};
}

function client(id: string, name: string, overrides = {}) {
	return {
		id,
		name,
		contact_name: `${name} Contact`,
		contact_email: `${id}@example.com`,
		usual_source_language: null,
		usual_target_language: null,
		usual_work_type: null,
		writing_preferences: null,
		notes: null,
		has_glossary: false,
		projects: [],
		...overrides,
	};
}

const alpha = client("a", "Alpha Client", {
	contact_name: "Ann Alpha",
	contact_email: "ann@example.com",
	usual_source_language: "nl",
	usual_target_language: "en",
	usual_work_type: "legal",
	writing_preferences: "British spelling, formal tone.",
	notes: "Prefers short emails.",
	has_glossary: true,
	projects: [
		project("p1", "Older contract", "2026-09-30"),
		project("p2", "Newer lease", "2026-10-31", {
			followUps: ["done", "ready"],
		}),
		project("p3", "Old archived job", "2026-08-01", { archived: true }),
	],
});
const bravo = client("b", "Bravo Client", {
	contact_name: "Ben Bravo",
	usual_source_language: "es",
	usual_target_language: "en",
	usual_work_type: "technical",
	projects: [project("p4", "Manual", "2026-11-15", { followUps: ["done"] })],
});
const charlie = client("c", "Charlie Client", {
	usual_work_type: "business",
	projects: [
		project("p5", "Archived with follow-up", "2026-07-01", {
			archived: true,
			followUps: ["opened"],
		}),
	],
});
const delta = client("d", "Delta Client", {
	projects: [project("p6", "Quote", "2026-12-01", { followUps: ["opened"] })],
});

const all = [alpha, bravo, charlie, delta];

function loads(data: unknown[]) {
	db.order.mockResolvedValue({ data, error: null });
}

async function mountClients(path = "/clients") {
	await router.push(path);
	const wrapper = mount(ClientsView, { global: { plugins: [router] } });
	await flushPromises();
	return wrapper;
}

function rows(wrapper: Awaited<ReturnType<typeof mountClients>>) {
	return wrapper.findAll(".clients-row");
}

function panel(wrapper: Awaited<ReturnType<typeof mountClients>>) {
	return wrapper.find("aside#client");
}

describe("ClientsView", () => {
	beforeEach(async () => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		db.getSession.mockResolvedValue({
			data: { session: { access_token: "token" } },
			error: null,
		});
		db.from.mockReset().mockReturnValue({ select: db.select });
		db.select.mockReset().mockReturnValue({ is: db.is });
		db.is.mockReset().mockReturnValue({ order: db.order });
		db.order.mockReset();
		loads(all);
	});

	it("queries non-archived clients by name with their projects and follow-ups", async () => {
		await mountClients();

		expect(db.from).toHaveBeenCalledWith("clients");
		expect(db.select.mock.calls[0][0]).toContain(
			"projects (id, title, due_date, archived_at, follow_ups (state))",
		);
		expect(db.is).toHaveBeenCalledWith("archived_at", null);
		expect(db.order).toHaveBeenCalledWith("name");
	});

	it("shows the heading, intro, search box and Add client link", async () => {
		const wrapper = await mountClients();

		expect(wrapper.find("h1").text()).toBe("Clients");
		expect(wrapper.find(".clients-intro").text()).toBe(
			"4 clients. 2 are waiting to hear from you.",
		);
		const search = wrapper.find('input[aria-label="Search clients"]');
		expect(search.attributes("placeholder")).toBe("Search clients");
		const add = wrapper
			.findAll("a")
			.find((link) => link.text() === "Add client");
		expect(add?.attributes("href")).toBe("/clients/new");
	});

	it.each([
		[[delta], "1 client. 1 is waiting to hear from you."],
		[[bravo, charlie], "2 clients."],
	])("words the intro for %#", async (data, intro) => {
		loads(data);
		const wrapper = await mountClients();

		expect(wrapper.find(".clients-intro").text()).toBe(intro);
	});

	it("lists every client with its details, active count and one Follow-up due chip when due", async () => {
		const wrapper = await mountClients();

		expect(wrapper.find("#clients-list-h").text()).toBe("All clients");
		expect(wrapper.find(".clients-columns").text()).toBe("ClientWorkStatus");
		const listed = rows(wrapper).map((row) => ({
			name: row.find(".clients-name").text(),
			detail: row.find(".clients-row-detail").exists()
				? row.find(".clients-row-detail").text()
				: null,
			work: row.find(".clients-work").text(),
			chips: row.findAll(".chip").map((chip) => chip.text()),
			href: row.attributes("href"),
		}));
		expect(listed).toEqual([
			{
				name: "Alpha Client",
				detail: "NL → EN · Legal",
				work: "2 active",
				chips: ["Follow-up due"],
				href: "/clients?client=a#client",
			},
			{
				name: "Bravo Client",
				detail: "ES → EN · Technical",
				work: "1 active",
				chips: [],
				href: "/clients?client=b#client",
			},
			{
				name: "Charlie Client",
				detail: "Business",
				work: "None active",
				chips: [],
				href: "/clients?client=c#client",
			},
			{
				name: "Delta Client",
				detail: null,
				work: "1 active",
				chips: ["Follow-up due"],
				href: "/clients?client=d#client",
			},
		]);
		expect(rows(wrapper)[0].find(".chip").classes()).toContain(
			"chip-attention",
		);
	});

	it("selects the first client when there is no client query parameter", async () => {
		const wrapper = await mountClients();

		expect(panel(wrapper).find("h2").text()).toBe("Alpha Client");
		expect(rows(wrapper).map((row) => row.attributes("aria-current"))).toEqual([
			"true",
			undefined,
			undefined,
			undefined,
		]);
	});

	it("selects the client in the query parameter, and follows a row click", async () => {
		const wrapper = await mountClients("/clients?client=b");

		expect(panel(wrapper).find("h2").text()).toBe("Bravo Client");
		expect(rows(wrapper)[1].attributes("aria-current")).toBe("true");

		await rows(wrapper)[2].trigger("click");
		await flushPromises();

		expect(router.currentRoute.value.fullPath).toBe("/clients?client=c#client");
		expect(panel(wrapper).find("h2").text()).toBe("Charlie Client");
		expect(rows(wrapper)[2].attributes("aria-current")).toBe("true");
		expect(rows(wrapper)[1].attributes("aria-current")).toBeUndefined();
	});

	it("shows the selected client's contact, writing notes, glossary and history", async () => {
		const wrapper = await mountClients("/clients?client=a");
		const aside = panel(wrapper);

		expect(aside.text()).toContain("Selected client");
		expect(aside.find(".clients-panel-sub").text()).toBe(
			"Legal · Dutch to English",
		);
		expect(aside.findAll("h3").map((h) => h.text())).toEqual([
			"Contact",
			"How they like it written",
			"History",
		]);
		expect(aside.findAll("dt").map((dt) => dt.text())).toEqual([
			"Name",
			"Email",
		]);
		expect(aside.findAll("dd").map((dd) => dd.text())).toEqual([
			"Ann Alpha",
			"ann@example.com",
		]);
		expect(aside.findAll(".clients-text").map((p) => p.text())).toEqual([
			"British spelling, formal tone.",
			"Prefers short emails.",
		]);
		const glossary = aside.find(".chip");
		expect(glossary.text()).toBe("Glossary on file");
		expect(glossary.classes()).toContain("chip-lavender");
		expect(
			aside
				.findAll(".clients-history-row")
				.map((row) => row.findAll("span").map((span) => span.text())),
		).toEqual([
			["Newer lease", "Due 31 Oct 2026"],
			["Older contract", "Due 30 Sep 2026"],
			["Old archived job", "Archived"],
		]);
		expect(aside.find(".clients-history-row a").exists()).toBe(false);
	});

	it("shows the empty panel copy for a client with nothing on file", async () => {
		const wrapper = await mountClients("/clients?client=d");
		const aside = panel(wrapper);

		expect(aside.find(".clients-panel-sub").exists()).toBe(false);
		expect(aside.text()).toContain("Nothing noted yet.");
		expect(aside.find(".chip").text()).toBe("No glossary yet");
		expect(aside.find(".chip").classes()).toContain("clients-chip-dashed");
		expect(aside.findAll(".clients-history-row")).toHaveLength(1);

		loads([client("e", "Echo Client")]);
		const echo = await mountClients();
		expect(panel(echo).text()).toContain("No projects yet.");
	});

	it("filters by client name or contact name, and selects the first match", async () => {
		const wrapper = await mountClients("/clients?client=a");
		const search = wrapper.find('input[aria-label="Search clients"]');

		await search.setValue("  BRAVO ");
		expect(
			rows(wrapper).map((row) => row.find(".clients-name").text()),
		).toEqual(["Bravo Client"]);
		expect(panel(wrapper).find("h2").text()).toBe("Bravo Client");

		await search.setValue("ann alpha");
		expect(
			rows(wrapper).map((row) => row.find(".clients-name").text()),
		).toEqual(["Alpha Client"]);
		expect(db.order).toHaveBeenCalledTimes(1);
	});

	it("shows the no-match state and clears the search", async () => {
		const wrapper = await mountClients();
		const search = wrapper.find('input[aria-label="Search clients"]');

		await search.setValue("zzz");

		expect(rows(wrapper)).toHaveLength(0);
		expect(panel(wrapper).exists()).toBe(false);
		expect(wrapper.find(".clients-columns").exists()).toBe(false);
		expect(wrapper.text()).toContain("No clients match “zzz”");
		expect(wrapper.text()).toContain(
			"Check the spelling, or clear the search.",
		);

		const clear = wrapper
			.findAll("button")
			.find((button) => button.text() === "Clear search");
		await clear?.trigger("click");

		expect(rows(wrapper)).toHaveLength(4);
		expect((search.element as HTMLInputElement).value).toBe("");
	});

	it("shows the no-clients state with an Add client link and no intro", async () => {
		loads([]);
		const wrapper = await mountClients();

		expect(wrapper.text()).toContain("No clients yet");
		expect(wrapper.text()).toContain("Add a client to start a project.");
		const add = wrapper.find(".clients-message a");
		expect(add.text()).toBe("Add client");
		expect(add.attributes("href")).toBe("/clients/new");
		expect(wrapper.find(".clients-intro").exists()).toBe(false);
		expect(wrapper.find(".clients-list").exists()).toBe(false);
	});

	it("shows no empty state while the first load is in flight", async () => {
		db.order.mockReturnValue(new Promise(() => {}));
		const wrapper = await mountClients();

		expect(wrapper.text()).not.toContain("No clients yet");
		expect(wrapper.find(".clients-list").exists()).toBe(false);
		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
	});

	it("shows a load error with Try again, which queries again", async () => {
		db.order.mockResolvedValueOnce({ data: null, error: { message: "down" } });
		const wrapper = await mountClients();

		expect(wrapper.find('[role="alert"]').text()).toBe(
			"Clients could not be loaded. Nothing was lost.",
		);
		expect(wrapper.find(".clients-list").exists()).toBe(false);

		const retry = wrapper
			.findAll("button")
			.find((button) => button.text() === "Try again");
		await retry?.trigger("click");
		await flushPromises();

		expect(db.order).toHaveBeenCalledTimes(2);
		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
		expect(rows(wrapper)).toHaveLength(4);
	});
});

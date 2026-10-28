import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Milestone } from "../lib/projects";
import router from "../router";
import ProjectsView from "../views/ProjectsView.vue";

const db = vi.hoisted(() => ({
	getSession: vi.fn(),
	from: vi.fn(),
	select: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
	supabase: { auth: { getSession: db.getSession }, from: db.from },
}));

type Allocation = {
	id: string;
	role: "translator" | "reviewer";
	is_proposed: boolean;
	start_date: string;
	translator: { name: string };
};

function allocation(
	id: string,
	name: string,
	startDate: string,
	options: { reviewer?: boolean; proposed?: boolean } = {},
): Allocation {
	return {
		id,
		role: options.reviewer ? "reviewer" : "translator",
		is_proposed: options.proposed ?? false,
		start_date: startDate,
		translator: { name },
	};
}

function project(
	id: string,
	title: string,
	dueDate: string,
	options: {
		client?: string;
		pair?: [string, string];
		type?: string;
		archived?: boolean;
		allocations?: Allocation[];
		ticked?: Milestone[];
		followUps?: ("ready" | "opened" | "done")[];
	} = {},
) {
	const [source, target] = options.pair ?? ["nl", "en"];
	return {
		id,
		title,
		source_language: source,
		target_language: target,
		document_type: options.type ?? "legal",
		due_date: dueDate,
		archived_at: options.archived ? "2026-10-01T00:00:00Z" : null,
		client: { name: options.client ?? "Demo Legal Client" },
		allocations: options.allocations ?? [],
		project_steps: (options.ticked ?? []).map((milestone) => ({
			milestone,
			completed_at: "2026-10-20T10:00:00Z",
		})),
		follow_ups: (options.followUps ?? []).map((state) => ({ state })),
	};
}

const everyMilestone: Milestone[] = [
	"draft",
	"review",
	"client_feedback",
	"delivery",
];
const tess = allocation("a1", "Tess Translator", "2026-10-20");

const lease = project("p-lease", "Demo lease agreement", "2026-11-02", {
	allocations: [
		allocation("a2", "Rita Reviewer", "2026-10-25", { reviewer: true }),
		tess,
	],
	ticked: ["draft"],
	followUps: ["ready"],
});
const property = project("p-property", "Demo property listing", "2026-11-05", {
	client: "Demo Property Client",
	type: "real_estate",
	allocations: [tess],
	ticked: ["draft", "review"],
	followUps: ["done", "opened"],
});
const pump = project("p-pump", "Demo pump manual", "2026-11-08", {
	client: "Demo Technical Client",
	pair: ["en", "es"],
	type: "technical",
	allocations: [
		allocation("a3", "Rob Reviewer", "2026-10-01", { reviewer: true }),
		allocation("a4", "Lena Late", "2026-10-30"),
		allocation("a5", "Erin Early", "2026-10-10"),
	],
	followUps: ["done"],
});
const quarterly = project(
	"p-quarterly",
	"Demo quarterly report",
	"2026-11-10",
	{
		client: "Demo Business Client",
		type: "business",
		allocations: [
			allocation("a6", "Pat Proposed", "2026-11-01", { proposed: true }),
		],
		followUps: ["ready"],
	},
);
const faq = project("p-faq", "Demo website FAQ", "2026-11-10", {
	client: "Demo Business Client",
	type: "other",
});
const brochure = project(
	"p-brochure",
	"Demo delivered brochure",
	"2026-10-20",
	{
		client: "Demo Property Client",
		pair: ["en", "nl"],
		type: "real_estate",
		allocations: [tess],
		ticked: everyMilestone,
		followUps: ["ready"],
	},
);
const priceList = project("p-price", "Demo price list", "2026-09-01", {
	archived: true,
	allocations: [tess],
	ticked: everyMilestone,
	followUps: ["ready"],
});

// Deliberately out of order: the page sorts.
const all = [faq, priceList, quarterly, pump, brochure, property, lease];

function loads(data: unknown[]) {
	db.select.mockResolvedValue({ data, error: null });
}

let wrapper: VueWrapper | undefined;

async function mountProjects() {
	await router.push("/projects");
	wrapper = mount(ProjectsView, {
		attachTo: document.body,
		global: { plugins: [router] },
	});
	await flushPromises();
	return wrapper;
}

function rows(view: VueWrapper) {
	return view.findAll(".projects-row");
}

function titles(view: VueWrapper) {
	return rows(view).map((row) => row.find(".projects-name").text());
}

function row(view: VueWrapper, title: string) {
	const found = rows(view).find(
		(r) => r.find(".projects-name").text() === title,
	);
	if (!found) throw new Error(`No row for ${title}`);
	return found;
}

function pills(view: VueWrapper) {
	return view.findAll('[role="group"][aria-label="Show"] button');
}

async function pick(view: VueWrapper, name: string) {
	const pill = pills(view).find((button) => button.text().startsWith(name));
	await pill?.trigger("click");
}

function button(view: VueWrapper, text: string) {
	return view.findAll("button").find((b) => b.text() === text);
}

describe("ProjectsView", () => {
	beforeEach(() => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		db.getSession.mockResolvedValue({
			data: { session: { access_token: "token" } },
			error: null,
		});
		db.from.mockReset().mockReturnValue({ select: db.select });
		db.select.mockReset();
		loads(all);
	});

	afterEach(() => {
		wrapper?.unmount();
		wrapper = undefined;
	});

	it("fetches every project once, with client, people, steps and follow-ups", async () => {
		await mountProjects();

		expect(db.from).toHaveBeenCalledTimes(1);
		expect(db.from).toHaveBeenCalledWith("projects");
		const columns = db.select.mock.calls[0][0];
		expect(columns).toContain("archived_at");
		expect(columns).toContain("client:clients (name)");
		expect(columns).toContain(
			"allocations (id, role, is_proposed, start_date, translator:translators (name))",
		);
		expect(columns).toContain("project_steps (milestone, completed_at)");
		expect(columns).toContain("follow_ups (state)");
	});

	it("shows the heading, intro and New project link, with no cover-mode text", async () => {
		const view = await mountProjects();

		expect(view.find("h1").text()).toBe("Projects");
		expect(view.find(".projects-intro").text()).toBe(
			"Soonest due first. The stage of each project follows the steps completed in it.",
		);
		const links = view
			.findAll("a")
			.filter((link) => link.text() === "New project");
		expect(links.map((link) => link.attributes("href"))).toEqual([
			"/projects/new",
		]);
		expect(view.find("#projects-list-h").text()).toBe("Project list");
		expect(view.find("#projects-list-h").classes()).toContain("sr-only");
		expect(view.text()).not.toMatch(/Cover|Assistant|Assisted/);
	});

	it("labels the filters with their counts and presses Active first", async () => {
		const view = await mountProjects();

		expect(pills(view).map((pill) => pill.text())).toEqual([
			"Active 5",
			"Delivered 1",
			"Archived 1",
			"All 7",
		]);
		expect(pills(view).map((pill) => pill.attributes("aria-pressed"))).toEqual([
			"true",
			"false",
			"false",
			"false",
		]);

		await pick(view, "Archived");

		expect(pills(view).map((pill) => pill.attributes("aria-pressed"))).toEqual([
			"false",
			"false",
			"true",
			"false",
		]);
		expect(titles(view)).toEqual(["Demo price list"]);
	});

	it("lists rows soonest due first, ties by title, in every filter", async () => {
		const view = await mountProjects();

		expect(view.find(".projects-columns").text()).toBe(
			"ProjectStageTypePeopleDue",
		);
		expect(titles(view)).toEqual([
			"Demo lease agreement",
			"Demo property listing",
			"Demo pump manual",
			"Demo quarterly report",
			"Demo website FAQ",
		]);

		await pick(view, "All");

		expect(titles(view)).toEqual([
			"Demo price list",
			"Demo delivered brochure",
			"Demo lease agreement",
			"Demo property listing",
			"Demo pump manual",
			"Demo quarterly report",
			"Demo website FAQ",
		]);
	});

	it("derives each stage chip from allocations and steps", async () => {
		const view = await mountProjects();

		const stage = (title: string) =>
			row(view, title).find(".projects-col-stage .chip");
		expect(stage("Demo lease agreement").text()).toBe("In review");
		expect(stage("Demo lease agreement").classes()).toContain("chip-duck");
		expect(stage("Demo property listing").text()).toBe("With client");
		expect(stage("Demo pump manual").text()).toBe("In translation");
		expect(stage("Demo quarterly report").text()).toBe("Intake");
		expect(stage("Demo website FAQ").text()).toBe("Intake");

		await pick(view, "Delivered");
		expect(titles(view)).toEqual(["Demo delivered brochure"]);
		expect(stage("Demo delivered brochure").text()).toBe("Delivered");

		await pick(view, "Archived");
		expect(titles(view)).toEqual(["Demo price list"]);
	});

	it("shows the client and pair, type chip, due date and a Follow up chip when one is waiting", async () => {
		const view = await mountProjects();

		const listed = rows(view).map((r) => ({
			detail: r.find(".projects-row-detail").text(),
			type: r.find(".projects-col-type .chip").text(),
			due: r.find(".projects-due").text(),
			followUp: r.find(".projects-due .chip").exists(),
		}));
		expect(listed).toEqual([
			{
				detail: "Demo Legal Client · NL → EN",
				type: "Legal",
				due: "Follow up 2 Nov 2026",
				followUp: true,
			},
			{
				detail: "Demo Property Client · NL → EN",
				type: "Real estate",
				due: "Follow up 5 Nov 2026",
				followUp: true,
			},
			{
				detail: "Demo Technical Client · EN → ES",
				type: "Technical",
				due: "8 Nov 2026",
				followUp: false,
			},
			{
				detail: "Demo Business Client · NL → EN",
				type: "Business",
				due: "Follow up 10 Nov 2026",
				followUp: true,
			},
			{
				detail: "Demo Business Client · NL → EN",
				type: "Other",
				due: "10 Nov 2026",
				followUp: false,
			},
		]);
		const chip = row(view, "Demo lease agreement").find(".projects-due .chip");
		expect(chip.classes()).toEqual(["chip", "chip-attention"]);
		expect(
			row(view, "Demo lease agreement")
				.find(".projects-col-type .chip")
				.classes(),
		).toContain("chip-lavender");

		await pick(view, "Archived");
		expect(row(view, "Demo price list").find(".projects-due").text()).toBe(
			"1 Sep 2026",
		);
	});

	it("shows people as initials, translators first, at most two, with names for screen readers", async () => {
		const view = await mountProjects();

		const people = (title: string) =>
			row(view, title).find(".projects-col-people");
		const avatars = (title: string) =>
			people(title)
				.findAll(".projects-avatar")
				.map((avatar) => ({
					text: avatar.text(),
					reviewer: avatar.classes().includes("projects-avatar-reviewer"),
				}));

		expect(avatars("Demo lease agreement")).toEqual([
			{ text: "TT", reviewer: false },
			{ text: "RR", reviewer: true },
		]);
		expect(people("Demo lease agreement").find(".sr-only").text()).toBe(
			"Tess Translator, Rita Reviewer",
		);
		expect(people("Demo lease agreement").find(".projects-more").exists()).toBe(
			false,
		);

		expect(avatars("Demo pump manual")).toEqual([
			{ text: "EE", reviewer: false },
			{ text: "LL", reviewer: false },
		]);
		expect(people("Demo pump manual").find(".projects-more").text()).toBe("+1");
		expect(people("Demo pump manual").find(".sr-only").text()).toBe(
			"Erin Early, Lena Late, Rob Reviewer",
		);

		expect(avatars("Demo quarterly report")).toEqual([
			{ text: "PP", reviewer: false },
		]);
		expect(people("Demo website FAQ").text()).toBe("None");
		expect(people("Demo website FAQ").find(".projects-avatar").exists()).toBe(
			false,
		);
	});

	it("links each row to its project", async () => {
		const view = await mountProjects();

		expect(rows(view).map((r) => r.attributes("href"))).toEqual([
			"/projects/p-lease",
			"/projects/p-property",
			"/projects/p-pump",
			"/projects/p-quarterly",
			"/projects/p-faq",
		]);
		expect(rows(view)[0].element.tagName).toBe("A");
	});

	it("searches the title and client name without changing the counts", async () => {
		const view = await mountProjects();
		const search = view.find('input[aria-label="Search projects"]');
		expect(search.attributes("placeholder")).toBe("Search projects");
		expect(search.classes()).toContain("field");

		await search.setValue("lease");
		expect(titles(view)).toEqual(["Demo lease agreement"]);

		await search.setValue("  DEMO PROPERTY ");
		expect(titles(view)).toEqual(["Demo property listing"]);
		expect(pills(view).map((pill) => pill.text())).toEqual([
			"Active 5",
			"Delivered 1",
			"Archived 1",
			"All 7",
		]);

		await pick(view, "All");
		expect(titles(view)).toEqual([
			"Demo delivered brochure",
			"Demo property listing",
		]);
		expect(db.select).toHaveBeenCalledTimes(1);
	});

	it("shows the no-match state and clears the search", async () => {
		const view = await mountProjects();
		const search = view.find('input[aria-label="Search projects"]');

		await search.setValue(" zzz ");

		expect(rows(view)).toHaveLength(0);
		expect(view.find(".projects-columns").exists()).toBe(false);
		expect(view.find(".projects-footer").exists()).toBe(false);
		expect(view.find("h3").text()).toBe("No projects match “zzz”");
		expect(view.text()).toContain("Check the spelling, or clear the search.");
		expect(view.text()).not.toContain("Nothing here.");

		await button(view, "Clear search")?.trigger("click");

		expect((search.element as HTMLInputElement).value).toBe("");
		expect(rows(view)).toHaveLength(5);
	});

	it("shows Nothing here for an empty filter with no search", async () => {
		loads([lease, property]);
		const view = await mountProjects();

		await pick(view, "Delivered");

		expect(view.find(".projects-nothing").text()).toBe("Nothing here.");
		expect(rows(view)).toHaveLength(0);
		expect(view.find(".projects-footer").exists()).toBe(false);
		expect(pills(view).map((pill) => pill.text())).toEqual([
			"Active 2",
			"Delivered 0",
			"Archived 0",
			"All 2",
		]);
	});

	it("shows 25 rows at a time with Show more, focusing the first new row", async () => {
		const many = Array.from({ length: 30 }, (_, index) => {
			const n = String(index + 1).padStart(2, "0");
			return project(`p${n}`, `Demo job ${n}`, `2026-12-${n}`, {
				archived: index >= 28,
			});
		});
		loads(many.reverse());
		const view = await mountProjects();

		await pick(view, "All");
		expect(rows(view)).toHaveLength(25);
		expect(view.find(".projects-footer").text()).toBe("Showing 25 of 30.");

		await button(view, "Show more")?.trigger("click");
		await flushPromises();

		expect(rows(view)).toHaveLength(30);
		expect(titles(view)[29]).toBe("Demo job 30");
		expect(document.activeElement).toBe(rows(view)[25].element);
		expect(view.find(".projects-footer").text()).toBe("Showing 30 of 30.");
		expect(button(view, "Show more")).toBeUndefined();

		await pick(view, "Active");
		expect(rows(view)).toHaveLength(25);
		expect(view.find(".projects-footer").text()).toBe("Showing 25 of 28.");
		expect(button(view, "Show more")).toBeDefined();

		await pick(view, "Archived");
		expect(rows(view)).toHaveLength(2);
		expect(view.find(".projects-footer").text()).toBe("Showing 2 of 2.");
		expect(button(view, "Show more")).toBeUndefined();
	});

	it("starts again at 25 when the search changes after Show more", async () => {
		loads(
			Array.from({ length: 30 }, (_, index) =>
				project(`p${index}`, `Demo job ${index}`, "2026-12-01"),
			),
		);
		const view = await mountProjects();

		await button(view, "Show more")?.trigger("click");
		expect(rows(view)).toHaveLength(30);

		await view.find('input[aria-label="Search projects"]').setValue("job");
		expect(rows(view)).toHaveLength(25);
	});

	it("shows the no-projects state with a New project link and no filters", async () => {
		loads([]);
		const view = await mountProjects();

		expect(view.find(".projects-message h2").text()).toBe("No projects yet");
		expect(view.text()).toContain(
			"Create your first project and it will appear on the Overview.",
		);
		const link = view.find(".projects-message a");
		expect(link.text()).toBe("New project");
		expect(link.classes()).toContain("btn-primary");
		expect(link.attributes("href")).toBe("/projects/new");
		expect(view.find('[role="group"]').exists()).toBe(false);
		expect(view.find('input[aria-label="Search projects"]').exists()).toBe(
			false,
		);
		expect(view.find(".projects-intro").exists()).toBe(false);
	});

	it("shows no list or empty state while the first load is in flight", async () => {
		db.select.mockReturnValue(new Promise(() => {}));
		const view = await mountProjects();

		expect(view.text()).not.toContain("No projects yet");
		expect(view.find(".projects-list").exists()).toBe(false);
		expect(view.find('[role="alert"]').exists()).toBe(false);
	});

	it("shows a load error with Try again, which queries again", async () => {
		db.select.mockResolvedValueOnce({ data: null, error: { message: "down" } });
		const view = await mountProjects();

		expect(view.find('[role="alert"]').text()).toBe(
			"Projects could not be loaded. Nothing was lost.",
		);
		expect(view.find(".projects-list").exists()).toBe(false);

		await button(view, "Try again")?.trigger("click");
		await flushPromises();

		expect(db.select).toHaveBeenCalledTimes(2);
		expect(view.find('[role="alert"]').exists()).toBe(false);
		expect(rows(view)).toHaveLength(5);
	});
});

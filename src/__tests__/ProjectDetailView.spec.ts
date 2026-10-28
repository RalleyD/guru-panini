import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import router from "../router";
import ProjectDetailView from "../views/ProjectDetailView.vue";

const db = vi.hoisted(() => ({
	getSession: vi.fn(),
	from: vi.fn(),
	maybeSingle: vi.fn(),
	settings: vi.fn(),
	upsert: vi.fn(),
	update: vi.fn(),
	single: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
	supabase: { auth: { getSession: db.getSession }, from: db.from },
}));

const projectId = "de000000-0000-4000-8000-0000000000a1";

type Result = { data: unknown; error: unknown };

function step(
	id: string,
	fields: {
		milestone?: string;
		title?: string;
		due_date?: string;
		completed?: boolean;
		created_at?: string;
	},
) {
	return {
		id,
		milestone: fields.milestone ?? null,
		title: fields.title ?? null,
		due_date: fields.due_date ?? null,
		completed_at: fields.completed ? "2026-10-20T09:00:00Z" : null,
		created_at: fields.created_at ?? "2026-10-01T09:00:00Z",
	};
}

function allocation(
	id: string,
	name: string,
	role: "translator" | "reviewer",
	startDate: string,
	isProposed = false,
) {
	return {
		id,
		role,
		is_proposed: isProposed,
		start_date: startDate,
		translator: { name },
	};
}

function project(overrides = {}) {
	return {
		id: projectId,
		title: "Demo lease & sale",
		source_language: "nl",
		target_language: "en",
		document_type: "legal",
		word_count: 12400,
		due_date: "2026-11-04",
		notes: "Keep metric units.\nNo imperial.",
		client: {
			id: "client-a",
			name: "Demo Legal Client",
			contact_name: "Demo Contact One",
			contact_email: "contact-one@example.com",
			has_glossary: true,
			archived_at: null,
		},
		allocations: [
			allocation("al-3", "Demo Reviewer Late", "reviewer", "2026-10-30"),
			allocation("al-2", "Demo Translator One", "reviewer", "2026-10-25", true),
			allocation("al-1", "Demo Translator Two", "translator", "2026-10-20"),
		],
		project_steps: [
			step("st-draft", { milestone: "draft", completed: true }),
			step("st-later", {
				title: "Demo later step",
				due_date: "2026-11-02",
				created_at: "2026-10-02T09:00:00Z",
			}),
			step("st-undated", {
				title: "Demo undated step",
				completed: true,
				created_at: "2026-10-01T09:00:00Z",
			}),
			step("st-first", {
				title: "Demo first step",
				due_date: "2026-11-01",
				created_at: "2026-10-03T09:00:00Z",
			}),
			step("st-same-day", {
				title: "Demo same-day step",
				due_date: "2026-11-01",
				created_at: "2026-10-04T09:00:00Z",
			}),
		],
		feedback_entries: [{ status: "open" }, { status: "applied" }],
		...overrides,
	};
}

// One chain per table: projects is select().eq().maybeSingle(); project_steps is
// upsert().select().single() or update().eq().select().single(); settings is
// select().maybeSingle(), resolved by db.settings.
const chains = {
	projects: {} as Record<string, ReturnType<typeof vi.fn>>,
	project_steps: {} as Record<string, ReturnType<typeof vi.fn>>,
	settings: {} as Record<string, ReturnType<typeof vi.fn>>,
};

function mockTables() {
	db.from.mockReset().mockImplementation((name: keyof typeof chains) => {
		const chain: Record<string, ReturnType<typeof vi.fn>> = {
			select: vi.fn(() => chain),
			eq: vi.fn(() => chain),
			maybeSingle: name === "settings" ? db.settings : db.maybeSingle,
			upsert: db.upsert.mockImplementation(() => chain),
			update: db.update.mockImplementation(() => chain),
			single: db.single,
		};
		chains[name] = chain;
		return chain;
	});
}

function loads(result: Result) {
	db.maybeSingle.mockResolvedValue(result);
}

function tablesLoaded() {
	return db.from.mock.calls.map(([name]) => name);
}

async function mountProject(id = projectId) {
	await router.push(`/projects/${id}`);
	const wrapper = mount(ProjectDetailView, {
		attachTo: document.body,
		global: { plugins: [router] },
	});
	await flushPromises();
	return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountProject>>;

function stageChip(wrapper: Wrapper) {
	return wrapper.find(".project-chips .chip");
}

function stepRows(wrapper: Wrapper) {
	return wrapper.findAll(".project-step");
}

function checkbox(wrapper: Wrapper, label: string) {
	const row = stepRows(wrapper).find((r) =>
		r.find(".project-step-label").text().startsWith(label),
	);
	return row?.find("input") as ReturnType<Wrapper["find"]>;
}

function stages(wrapper: Wrapper) {
	return wrapper.findAll(".project-stages li").map((li) => ({
		text: li.text(),
		current: li.attributes("aria-current"),
		tick: li.find("svg").exists(),
	}));
}

function savedStep(milestone: string | null, completed: boolean) {
	return {
		data: {
			...step(`st-${milestone}`, { milestone: milestone ?? undefined }),
			completed_at: completed ? "2026-10-28T10:00:00Z" : null,
		},
		error: null,
	};
}

describe("ProjectDetailView", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		db.getSession.mockResolvedValue({
			data: { session: { access_token: "token" } },
			error: null,
		});
		db.maybeSingle.mockReset();
		db.settings.mockReset().mockResolvedValue({
			data: { email_provider: "default_app", sign_off: "Kind regards," },
			error: null,
		});
		db.upsert.mockReset();
		db.update.mockReset();
		db.single.mockReset();
		mockTables();
		loads({ data: project(), error: null });
	});

	it("loads the project with its client, allocations, steps and feedback in one query", async () => {
		await mountProject();

		expect(tablesLoaded()).toEqual(["projects", "settings"]);
		const columns = chains.projects.select.mock.calls[0][0];
		for (const part of [
			"client:clients (",
			"allocations (",
			"translator:translators (name)",
			"project_steps (",
			"feedback_entries (status)",
		]) {
			expect(columns).toContain(part);
		}
		expect(chains.projects.eq).toHaveBeenCalledWith("id", projectId);
		expect(db.maybeSingle).toHaveBeenCalledTimes(1);
	});

	it("shows the breadcrumb with the client linked, or plain when the client is archived", async () => {
		const wrapper = await mountProject();
		const crumbs = wrapper.find('nav[aria-label="Breadcrumb"]');

		expect(crumbs.text()).toBe("Projects/Demo Legal Client/Demo lease & sale");
		expect(
			crumbs.findAll("a").map((a) => [a.text(), a.attributes("href")]),
		).toEqual([
			["Projects", "/projects"],
			["Demo Legal Client", "/clients?client=client-a#client"],
		]);

		loads({
			data: project({
				client: { ...project().client, archived_at: "2026-10-01T00:00:00Z" },
			}),
			error: null,
		});
		const archived = await mountProject();
		const links = archived.find('nav[aria-label="Breadcrumb"]').findAll("a");
		expect(links.map((a) => a.text())).toEqual(["Projects"]);
		expect(archived.find('nav[aria-label="Breadcrumb"]').text()).toContain(
			"Demo Legal Client",
		);
	});

	it("shows the title, the stage, pair and document type chips and the words line", async () => {
		const wrapper = await mountProject();

		expect(wrapper.find("h1").text()).toBe("Demo lease & sale");
		const chips = wrapper.findAll(".project-chips .chip");
		expect(chips.map((chip) => chip.text())).toEqual([
			"In review",
			"NL → EN",
			"Legal",
		]);
		expect(chips[0].classes()).toContain("chip-duck");
		expect(chips[1].classes()).toEqual(["chip"]);
		expect(chips[2].classes()).toContain("chip-lavender");
		expect(wrapper.find(".project-words").text()).toBe(
			"12,400 words · Due 4 Nov 2026",
		);

		loads({
			data: project({ word_count: null, document_type: "technical" }),
			error: null,
		});
		const noWords = await mountProject();
		expect(noWords.find(".project-words").text()).toBe("Due 4 Nov 2026");
		expect(noWords.findAll(".project-chips .chip")[2].classes()).toContain(
			"chip-duck",
		);
	});

	function messageClient(wrapper: Wrapper) {
		return wrapper.findAll("a").find((a) => a.text() === "Message client");
	}

	it("links Message client to the contact with the title as subject and the sign-off as body", async () => {
		const wrapper = await mountProject();
		const message = messageClient(wrapper);

		expect(chains.settings.select).toHaveBeenCalledWith(
			"email_provider, sign_off, owner_name, agency_name",
		);
		expect(message?.classes()).toContain("btn");
		expect(message?.attributes("href")).toBe(
			"mailto:contact-one@example.com?subject=Demo%20lease%20%26%20sale&body=Kind%20regards%2C",
		);
		expect(message?.attributes("target")).toBeUndefined();
		expect(message?.attributes("rel")).toBeUndefined();
	});

	it("opens Message client in Outlook on the web in a new tab when that is the provider", async () => {
		db.settings.mockResolvedValue({
			data: { email_provider: "outlook", sign_off: "Kind regards," },
			error: null,
		});
		const wrapper = await mountProject();
		const message = messageClient(wrapper);

		expect(message?.attributes("href")).toBe(
			"https://outlook.office.com/mail/deeplink/compose?to=contact-one%40example.com&subject=Demo%20lease%20%26%20sale&body=Kind%20regards%2C",
		);
		expect(message?.attributes("target")).toBe("_blank");
		expect(message?.attributes("rel")).toBe("noopener noreferrer");
	});

	it.each([
		["the owner has no settings row", { data: null, error: null }],
		["the settings fail to load", { data: null, error: { message: "down" } }],
	])("uses the default provider and sign-off when %s", async (_, result) => {
		db.settings.mockResolvedValue(result);
		const wrapper = await mountProject();

		expect(wrapper.find("h1").text()).toBe("Demo lease & sale");
		expect(messageClient(wrapper)?.attributes("href")).toBe(
			"mailto:contact-one@example.com?subject=Demo%20lease%20%26%20sale&body=Kind%20regards%2C",
		);
	});

	it("uses the saved owner and agency names in the default sign-off", async () => {
		db.settings.mockResolvedValue({
			data: {
				email_provider: null,
				sign_off: null,
				owner_name: "Demo Owner",
				agency_name: "Demo Agency",
			},
			error: null,
		});
		const wrapper = await mountProject();

		expect(messageClient(wrapper)?.attributes("href")).toBe(
			`mailto:contact-one@example.com?subject=Demo%20lease%20%26%20sale&body=${encodeURIComponent("Kind regards,\nDemo Owner\nDemo Agency")}`,
		);
	});

	it("draws the tracker with done and current stages and nothing to click", async () => {
		const wrapper = await mountProject();
		const tracker = wrapper.find('ol[aria-label="Project stages"]');

		expect(wrapper.find("section#now").attributes("aria-label")).toBe(
			"Where this project is",
		);
		expect(stages(wrapper)).toEqual([
			{ text: "Intake, done", current: undefined, tick: true },
			{ text: "Allocated, done", current: undefined, tick: true },
			{ text: "Draft, done", current: undefined, tick: true },
			{ text: "Review, current stage", current: "step", tick: false },
			{ text: "Client feedback", current: undefined, tick: false },
			{ text: "Delivery", current: undefined, tick: false },
		]);
		expect(tracker.find(".project-stage-current .sr-only").text()).toBe(
			", current stage",
		);
		expect(tracker.findAll("button, a, input, [onclick]")).toHaveLength(0);
	});

	it("lists the milestones, then free-form steps by due date (undated last) then creation", async () => {
		const wrapper = await mountProject();

		expect(
			stepRows(wrapper).map((row) => ({
				label: row.find(".project-step-label").text(),
				date: row.find(".project-step-date").exists()
					? row.find(".project-step-date").text()
					: null,
				checked: (row.find("input").element as HTMLInputElement).checked,
			})),
		).toEqual([
			{ label: "Draft finished", date: null, checked: true },
			{ label: "Review finished", date: null, checked: false },
			{ label: "Client feedback dealt with", date: null, checked: false },
			{ label: "Delivered", date: null, checked: false },
			{ label: "Demo first step", date: "By 1 Nov 2026", checked: false },
			{ label: "Demo same-day step", date: "By 1 Nov 2026", checked: false },
			{ label: "Demo later step", date: "By 2 Nov 2026", checked: false },
			{ label: "Demo undated step", date: null, checked: true },
		]);
		expect(stepRows(wrapper)[0].element.tagName).toBe("LABEL");
		expect(wrapper.find("h2.h3").text()).toBe("Next steps");
	});

	it("upserts a ticked milestone, disables it while saving and updates the stage chip", async () => {
		let finish: (value: Result) => void = () => {};
		db.single.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		const wrapper = await mountProject();
		const review = checkbox(wrapper, "Review finished");

		await review.setValue(true);

		expect(db.from).toHaveBeenLastCalledWith("project_steps");
		expect(db.upsert).toHaveBeenCalledWith(
			{
				project_id: projectId,
				milestone: "review",
				completed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
			},
			{ onConflict: "project_id,milestone" },
		);
		expect(review.attributes("disabled")).toBeDefined();

		finish(savedStep("review", true));
		await flushPromises();

		expect(review.attributes("disabled")).toBeUndefined();
		expect(document.activeElement).toBe(review.element);
		expect((review.element as HTMLInputElement).checked).toBe(true);
		expect(stageChip(wrapper).text()).toBe("With client");
		expect(stageChip(wrapper).classes()).toContain("chip-blue");
		expect(stages(wrapper)[3]).toEqual({
			text: "Review, done",
			current: undefined,
			tick: true,
		});
		expect(stages(wrapper)[4].current).toBe("step");
	});

	it("sends completed_at null when a milestone is un-ticked", async () => {
		db.single.mockResolvedValue(savedStep("draft", false));
		const wrapper = await mountProject();

		await checkbox(wrapper, "Draft finished").setValue(false);
		await flushPromises();

		expect(db.upsert).toHaveBeenCalledWith(
			{ project_id: projectId, milestone: "draft", completed_at: null },
			{ onConflict: "project_id,milestone" },
		);
		expect(stageChip(wrapper).text()).toBe("In translation");
		expect(stages(wrapper)[2].current).toBe("step");
	});

	it("updates a free-form step by id", async () => {
		db.single.mockResolvedValue({
			data: {
				...step("st-first", {
					title: "Demo first step",
					due_date: "2026-11-01",
					created_at: "2026-10-03T09:00:00Z",
				}),
				completed_at: "2026-10-28T10:00:00Z",
			},
			error: null,
		});
		const wrapper = await mountProject();

		await checkbox(wrapper, "Demo first step").setValue(true);
		await flushPromises();

		expect(db.upsert).not.toHaveBeenCalled();
		expect(db.update).toHaveBeenCalledWith({
			completed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
		});
		expect(chains.project_steps.eq).toHaveBeenCalledWith("id", "st-first");
		expect(
			(checkbox(wrapper, "Demo first step").element as HTMLInputElement)
				.checked,
		).toBe(true);
		expect(stageChip(wrapper).text()).toBe("In review");
	});

	it("restores the checkbox and shows the alert when a save fails, until the next success", async () => {
		db.single.mockResolvedValue({ data: null, error: { message: "down" } });
		const wrapper = await mountProject();
		const review = checkbox(wrapper, "Review finished");

		await review.setValue(true);
		await flushPromises();

		expect((review.element as HTMLInputElement).checked).toBe(false);
		expect(review.attributes("disabled")).toBeUndefined();
		expect(document.activeElement).toBe(review.element);
		expect(wrapper.find('#now [role="alert"]').text()).toBe(
			"Your changes were not saved. Nothing was lost. Try again.",
		);
		expect(stageChip(wrapper).text()).toBe("In review");

		db.single.mockResolvedValue(savedStep("review", true));
		await review.setValue(true);
		await flushPromises();

		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
		expect(stageChip(wrapper).text()).toBe("With client");
	});

	it.each([
		[[], "Nothing needs attention."],
		[[{ status: "open" }, { status: "applied" }], "1 open feedback point"],
		[[{ status: "open" }, { status: "open" }], "2 open feedback points"],
	])("words Needs attention for %j", async (entries, text) => {
		loads({ data: project({ feedback_entries: entries }), error: null });
		const wrapper = await mountProject();
		const column = wrapper.findAll(".project-now-column")[1];

		expect(column.find("h2").text()).toBe("Needs attention");
		expect(column.find("p").text()).toBe(text);
		expect(column.find(".project-attention").exists()).toBe(
			entries.some((entry) => entry.status === "open"),
		);
		expect(column.find("a").exists()).toBe(false);
	});

	it("lists translators before reviewers by start date, then the client contact", async () => {
		const wrapper = await mountProject();
		const team = wrapper.find("section#team");

		expect(team.attributes("aria-labelledby")).toBe(
			team.find("h2").attributes("id"),
		);
		expect(team.find("h2").text()).toBe("Who is on this");
		expect(
			team.findAll(".project-person").map((person) => ({
				initials: person.find(".project-avatar").text(),
				name: person.find(".project-person-name").text(),
				role: person.find(".project-person-role").text(),
			})),
		).toEqual([
			{ initials: "DT", name: "Demo Translator Two", role: "Translator" },
			{
				initials: "DO",
				name: "Demo Translator One",
				role: "Reviewer, proposed",
			},
			{ initials: "DL", name: "Demo Reviewer Late", role: "Reviewer" },
			{ initials: "DO", name: "Demo Contact One", role: "Client contact" },
		]);
		const avatars = team.findAll(".project-avatar");
		expect(avatars[0].classes()).toContain("project-avatar-translator");
		expect(avatars[1].classes()).toContain("project-avatar-reviewer");
		expect(avatars[3].classes()).toEqual(["project-avatar"]);
		expect(team.text()).not.toContain("No translator yet.");
	});

	it("says there is no translator yet when the project has no allocation", async () => {
		loads({ data: project({ allocations: [] }), error: null });
		const wrapper = await mountProject();
		const team = wrapper.find("section#team");

		expect(team.find("p").text()).toBe("No translator yet.");
		expect(
			team.findAll(".project-person-name").map((name) => name.text()),
		).toEqual(["Demo Contact One"]);
		expect(stageChip(wrapper).text()).toBe("Intake");
		expect(stages(wrapper)[1].current).toBe("step");
	});

	it("shows the details, with Words only when there is a word count", async () => {
		const wrapper = await mountProject();
		const details = () =>
			wrapper
				.find("section#details dl")
				.findAll("dt")
				.map((dt) => [dt.text(), dt.element.nextElementSibling?.textContent]);

		expect(details()).toEqual([
			["Client", "Demo Legal Client"],
			["Languages", "Dutch to English"],
			["Document type", "Legal"],
			["Words", "12,400"],
			["Glossary", "Supplied by client"],
			["Deadline", "4 Nov 2026"],
		]);

		loads({
			data: project({
				word_count: null,
				client: { ...project().client, has_glossary: false },
			}),
			error: null,
		});
		const other = await mountProject();
		expect(
			other
				.find("section#details dl")
				.findAll("dt")
				.map((dt) => [dt.text(), dt.element.nextElementSibling?.textContent]),
		).toEqual([
			["Client", "Demo Legal Client"],
			["Languages", "Dutch to English"],
			["Document type", "Legal"],
			["Glossary", "None yet"],
			["Deadline", "4 Nov 2026"],
		]);
	});

	it("shows the notes, or No notes yet.", async () => {
		const wrapper = await mountProject();
		expect(wrapper.find("section#notes h2").text()).toBe("Notes");
		expect(wrapper.find("section#notes p").element.textContent).toBe(
			"Keep metric units.\nNo imperial.",
		);

		loads({ data: project({ notes: null }), error: null });
		const empty = await mountProject();
		expect(empty.find("section#notes p").text()).toBe("No notes yet.");
	});

	it.each([
		["an id that is not a GUID", "not-a-uuid"],
		["a project that does not exist", projectId],
	])("shows Project not found for %s", async (_, id) => {
		loads({ data: null, error: null });
		const wrapper = await mountProject(id);

		expect(wrapper.find("h1").text()).toBe("Project not found");
		expect(wrapper.text()).toContain(
			"Check the link, or find the project on Projects.",
		);
		const back = wrapper
			.findAll("a")
			.find((a) => a.text() === "Back to projects");
		expect(back?.attributes("href")).toBe("/projects");
		expect(tablesLoaded()).toEqual(
			id === projectId ? ["projects", "settings"] : [],
		);
		expect(wrapper.find("#now").exists()).toBe(false);
	});

	it("renders nothing while the project loads", async () => {
		db.maybeSingle.mockReturnValue(new Promise(() => {}));
		const wrapper = await mountProject();

		expect(wrapper.text()).toBe("");
	});

	it("shows a load error with Try again, which loads again", async () => {
		db.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: { message: "down" },
		});
		const wrapper = await mountProject();

		expect(wrapper.find('[role="alert"]').text()).toBe(
			"This project could not be loaded. Nothing was lost.",
		);
		expect(wrapper.text()).not.toContain("Project not found");

		const retry = wrapper
			.findAll("button")
			.find((button) => button.text() === "Try again");
		await retry?.trigger("click");
		await flushPromises();

		expect(db.maybeSingle).toHaveBeenCalledTimes(2);
		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
		expect(wrapper.find("h1").text()).toBe("Demo lease & sale");
	});

	it("has no feedback log, archive, allocation, cover-mode or assistant UI", async () => {
		const wrapper = await mountProject();

		for (const text of [
			"Feedback log",
			"Archive project",
			"Change allocation",
			"Assisted draft",
			"Cover mode",
			"Ask the assistant",
		]) {
			expect(wrapper.text()).not.toContain(text);
		}
		expect(
			wrapper.findAll("section[id]").map((section) => section.attributes("id")),
		).toEqual(["now", "team", "details", "notes"]);
	});
});

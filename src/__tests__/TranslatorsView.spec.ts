import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import router from "../router";
import TranslatorsView from "../views/TranslatorsView.vue";

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

function allocation(
	project_id: string,
	end_date: string,
	options: { proposed?: boolean; archived?: boolean } = {},
) {
	return {
		project_id,
		end_date,
		is_proposed: options.proposed ?? false,
		projects: {
			archived_at: options.archived ? "2026-10-01T00:00:00Z" : null,
		},
	};
}

function translator(id: string, name: string, overrides = {}) {
	return {
		id,
		name,
		language_pairs: [],
		specialisms: [],
		availability: null,
		allocations: [],
		...overrides,
	};
}

// The query orders by name; the mock returns rows already in that order.
const anna = translator("a", "Anna Alpha", {
	language_pairs: ["nl-en", "en-nl"],
	specialisms: ["legal", "real estate"],
	availability: "Weekdays only, not available 10 to 14 Nov.",
	allocations: [
		allocation("p1", "2026-10-28"),
		allocation("p1", "2026-11-30"),
		allocation("p2", "2026-10-27"),
		allocation("p3", "2026-12-01", { proposed: true }),
		allocation("p4", "2026-12-01", { archived: true }),
		allocation("p5", "2026-12-01"),
	],
});
const bram = translator("b", "Bram", {
	language_pairs: ["es-en", "fr-en"],
	specialisms: ["technical"],
	// Ends today, so it still counts.
	allocations: [allocation("p6", "2026-10-28")],
});
const cleo = translator("c", "Cleo de Vries");
const dirk = translator("d", "Dirk Delta", { language_pairs: ["en-es"] });
const eva = translator("e", "Eva Echo");

const all = [anna, bram, cleo, dirk, eva];

function loads(data: unknown[]) {
	db.order.mockResolvedValue({ data, error: null });
}

async function mountTranslators() {
	await router.push("/translators");
	const wrapper = mount(TranslatorsView, { global: { plugins: [router] } });
	await flushPromises();
	return wrapper;
}

function cards(wrapper: Awaited<ReturnType<typeof mountTranslators>>) {
	return wrapper.findAll("article");
}

function textOf(
	card: ReturnType<typeof cards>[number],
	selector: string,
): string | null {
	const found = card.find(selector);
	return found.exists() ? found.text() : null;
}

describe("TranslatorsView", () => {
	beforeEach(() => {
		// The view reads today's local date when it is set up.
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 9, 28, 23, 30));
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

	afterEach(() => {
		vi.useRealTimers();
	});

	it("queries non-archived translators by name with their allocations", async () => {
		await mountTranslators();

		expect(db.from).toHaveBeenCalledWith("translators");
		expect(db.select).toHaveBeenCalledWith(
			"id, name, language_pairs, specialisms, availability, allocations (project_id, end_date, is_proposed, projects (archived_at))",
		);
		expect(db.is).toHaveBeenCalledWith("archived_at", null);
		expect(db.order).toHaveBeenCalledWith("name");
	});

	it("shows the heading, intro and Add translator link", async () => {
		const wrapper = await mountTranslators();

		expect(wrapper.find("h1").text()).toBe("Translators");
		expect(wrapper.find(".translators-intro").text()).toBe(
			"5 translators across 5 language pairs.",
		);
		const add = wrapper
			.find("header")
			.findAll("a")
			.find((link) => link.text() === "Add translator");
		expect(add?.attributes("href")).toBe("/translators/new");
	});

	it("shows one card per translator in query order with its details", async () => {
		const wrapper = await mountTranslators();

		expect(wrapper.find("section").attributes("aria-label")).toBe("People");
		const shown = cards(wrapper).map((card) => ({
			avatar: card.find(".translators-avatar").text(),
			name: card.find("h2").text(),
			pairs: textOf(card, ".translators-pairs"),
			chips: card.findAll(".translators-specialism").map((chip) => chip.text()),
			availability: textOf(card, ".translators-availability"),
			load: card.find(".translators-load").text(),
		}));
		expect(shown).toEqual([
			{
				avatar: "AA",
				name: "Anna Alpha",
				pairs: "Dutch ↔ English",
				chips: ["Legal", "Real estate"],
				availability: "Weekdays only, not available 10 to 14 Nov.",
				load: "2 projects",
			},
			{
				avatar: "B",
				name: "Bram",
				pairs: "Spanish → English, French → English",
				chips: ["Technical"],
				availability: null,
				load: "1 project",
			},
			{
				avatar: "CV",
				name: "Cleo de Vries",
				pairs: null,
				chips: [],
				availability: null,
				load: "No projects",
			},
			{
				avatar: "DD",
				name: "Dirk Delta",
				pairs: "English → Spanish",
				chips: [],
				availability: null,
				load: "No projects",
			},
			{
				avatar: "EE",
				name: "Eva Echo",
				pairs: null,
				chips: [],
				availability: null,
				load: "No projects",
			},
		]);
		expect(cards(wrapper)[2].find(".translators-specialisms").exists()).toBe(
			false,
		);
	});

	it("styles the chips and cycles the avatar colours by card position", async () => {
		const wrapper = await mountTranslators();
		const first = cards(wrapper)[0];

		expect(first.find(".translators-specialism").classes()).toContain("chip");
		expect(first.find(".translators-availability").classes()).toEqual(
			expect.arrayContaining(["chip", "chip-blue"]),
		);
		const avatars = wrapper.findAll(".translators-avatar");
		expect(avatars[0].attributes("aria-hidden")).toBe("true");
		expect(avatars.map((avatar) => avatar.classes()[1])).toEqual([
			"translators-avatar-lavender",
			"translators-avatar-duck",
			"translators-avatar-blue",
			"translators-avatar-neutral",
			"translators-avatar-lavender",
		]);
	});

	it("shows no email, buttons or archive control on the cards", async () => {
		const wrapper = await mountTranslators();

		for (const card of cards(wrapper)) {
			expect(card.find("button").exists()).toBe(false);
			expect(card.find("a").exists()).toBe(false);
			expect(card.text()).not.toContain("@");
			expect(card.text()).not.toContain("Archive");
		}
	});

	it("ends the people section with the Add a translator card", async () => {
		const wrapper = await mountTranslators();
		const section = wrapper.find("section");
		const last = section.element.lastElementChild;

		expect(last?.textContent).toBe("Add a translator");
		expect(last?.getAttribute("href")).toBe("/translators/new");
	});

	it.each([
		[[bram], "1 translator across 2 language pairs."],
		[[dirk], "1 translator across 1 language pair."],
		[[cleo, eva], "2 translators."],
	])("words the intro for %#", async (data, intro) => {
		loads(data);
		const wrapper = await mountTranslators();

		expect(wrapper.find(".translators-intro").text()).toBe(intro);
	});

	it("shows the no-translators state with an Add translator link and no intro", async () => {
		loads([]);
		const wrapper = await mountTranslators();

		expect(wrapper.text()).toContain("No translators yet");
		expect(wrapper.text()).toContain(
			"Add the people you work with so you can allocate them to projects.",
		);
		const add = wrapper.find(".translators-message a");
		expect(add.text()).toBe("Add translator");
		expect(add.attributes("href")).toBe("/translators/new");
		expect(wrapper.find(".translators-intro").exists()).toBe(false);
		expect(wrapper.find("section").exists()).toBe(false);
		expect(wrapper.text()).not.toContain("Add a translator");
	});

	it("shows no empty state while the first load is in flight", async () => {
		db.order.mockReturnValue(new Promise(() => {}));
		const wrapper = await mountTranslators();

		expect(wrapper.text()).not.toContain("No translators yet");
		expect(wrapper.find("section").exists()).toBe(false);
		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
	});

	it("shows a load error with Try again, which queries again", async () => {
		db.order.mockResolvedValueOnce({ data: null, error: { message: "down" } });
		const wrapper = await mountTranslators();

		expect(wrapper.find('[role="alert"]').text()).toBe(
			"Translators could not be loaded. Nothing was lost.",
		);
		expect(wrapper.find("section").exists()).toBe(false);
		expect(wrapper.text()).not.toContain("No translators yet");

		const retry = wrapper
			.findAll("button")
			.find((button) => button.text() === "Try again");
		await retry?.trigger("click");
		await flushPromises();

		expect(db.order).toHaveBeenCalledTimes(2);
		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
		expect(cards(wrapper)).toHaveLength(5);
	});
});

import { describe, expect, it } from "vitest";
import {
	type AddTranslatorForm,
	activeProjectCount,
	addTranslatorSchema,
	initials,
	introLine,
	languagePairOptions,
	loadLabel,
	pairsLabel,
	specialismLabel,
} from "../lib/translators";

const today = "2026-10-28";

function allocation(
	project_id: string,
	end_date: string,
	is_proposed = false,
	archived_at: string | null = null,
) {
	return { project_id, end_date, is_proposed, projects: { archived_at } };
}

const validForm: AddTranslatorForm = {
	name: "  Demo New Translator ",
	email: " new-translator@example.com ",
	language_pairs: ["en-es"],
	specialisms: "legal, Commercial, , legal",
	availability: " Demo availability note ",
};

function fieldErrors(form: AddTranslatorForm) {
	const result = addTranslatorSchema.safeParse(form);
	expect(result.success).toBe(false);
	return result.error?.issues.map((issue) => [issue.path, issue.message]);
}

describe("languagePairOptions", () => {
	it("offers the three pairs in order", () => {
		expect(languagePairOptions).toEqual([
			{ label: "Dutch → English", value: "nl-en" },
			{ label: "English → Dutch", value: "en-nl" },
			{ label: "English → Spanish", value: "en-es" },
		]);
	});
});

describe("pairsLabel", () => {
	it("shows a pair stored in both directions once, from the first", () => {
		expect(pairsLabel(["nl-en", "en-nl"])).toBe("Dutch ↔ English");
		expect(pairsLabel(["en-nl", "nl-en"])).toBe("English ↔ Dutch");
	});

	it("shows one-way pairs with an arrow, joined by commas", () => {
		expect(pairsLabel(["es-en", "fr-en"])).toBe(
			"Spanish → English, French → English",
		);
	});

	it("gives no label for no pairs", () => {
		expect(pairsLabel([])).toBeUndefined();
	});
});

describe("initials", () => {
	it("takes the first letters of the first and last words", () => {
		expect(initials("Demo Translator One")).toBe("DO");
		expect(initials("  demo new translator ")).toBe("DT");
	});

	it("takes one letter for a one-word name", () => {
		expect(initials("Demo")).toBe("D");
	});
});

describe("specialismLabel", () => {
	it("upper-cases the first letter only", () => {
		expect(specialismLabel("real estate")).toBe("Real estate");
		expect(specialismLabel("Legal")).toBe("Legal");
	});
});

describe("activeProjectCount", () => {
	it("counts confirmed allocations that have not ended on active projects", () => {
		expect(
			activeProjectCount(
				{
					allocations: [
						allocation("a", today),
						allocation("b", "2026-11-30"),
						allocation("c", "2026-11-30", true),
						allocation("d", "2026-10-27"),
						allocation("e", "2026-11-30", false, "2026-10-01T00:00:00Z"),
					],
				},
				today,
			),
		).toBe(2);
	});

	it("counts a project once when the translator has two roles on it", () => {
		expect(
			activeProjectCount(
				{
					allocations: [
						allocation("a", "2026-11-05"),
						allocation("a", "2026-11-10"),
					],
				},
				today,
			),
		).toBe(1);
	});

	it("is zero with no allocations", () => {
		expect(activeProjectCount({ allocations: [] }, today)).toBe(0);
	});
});

describe("loadLabel", () => {
	it("words the count", () => {
		expect(loadLabel(0)).toBe("No projects");
		expect(loadLabel(1)).toBe("1 project");
		expect(loadLabel(4)).toBe("4 projects");
	});
});

describe("introLine", () => {
	it("counts translators and distinct stored pairs", () => {
		expect(
			introLine([
				{ language_pairs: ["nl-en", "en-nl"] },
				{ language_pairs: ["en-nl", "nl-en"] },
				{ language_pairs: ["es-en", "fr-en"] },
			]),
		).toBe("3 translators across 4 language pairs.");
	});

	it("uses the singular for one translator and one pair", () => {
		expect(introLine([{ language_pairs: ["nl-en"] }])).toBe(
			"1 translator across 1 language pair.",
		);
	});

	it("leaves out the pairs when there are none", () => {
		expect(introLine([{ language_pairs: [] }, { language_pairs: [] }])).toBe(
			"2 translators.",
		);
	});
});

describe("addTranslatorSchema", () => {
	it("parses a full form into the translators insert payload", () => {
		const payload = addTranslatorSchema.parse(validForm);
		expect(payload).toEqual({
			name: "Demo New Translator",
			email: "new-translator@example.com",
			language_pairs: ["en-es"],
			specialisms: ["legal", "Commercial"],
			availability: "Demo availability note",
		});
		expect(payload).not.toHaveProperty("owner_id");
	});

	it("drops empty and case-insensitive duplicate specialisms, keeping the first", () => {
		expect(
			addTranslatorSchema.parse({
				...validForm,
				specialisms: " Legal ,technical,LEGAL, Technical ,",
			}).specialisms,
		).toEqual(["Legal", "technical"]);
	});

	it("turns empty optional fields into empty lists and null", () => {
		expect(
			addTranslatorSchema.parse({
				...validForm,
				language_pairs: [],
				specialisms: "  ",
				availability: "   ",
			}),
		).toMatchObject({
			language_pairs: [],
			specialisms: [],
			availability: null,
		});
	});

	it("requires the name", () => {
		expect(fieldErrors({ ...validForm, name: "  " })).toEqual([
			[["name"], "Enter the translator's name"],
		]);
	});

	it("requires a valid email", () => {
		expect(fieldErrors({ ...validForm, email: "" })).toEqual([
			[["email"], "Enter a valid email address"],
		]);
		expect(fieldErrors({ ...validForm, email: "not-an-email" })).toEqual([
			[["email"], "Enter a valid email address"],
		]);
	});

	it("rejects a language pair that is not an option", () => {
		expect(
			addTranslatorSchema.safeParse({
				...validForm,
				language_pairs: [
					"fr-en",
				] as unknown as AddTranslatorForm["language_pairs"],
			}).success,
		).toBe(false);
	});

	it("reports every missing required field at once", () => {
		expect(fieldErrors({ ...validForm, name: "", email: "" })).toEqual([
			[["name"], "Enter the translator's name"],
			[["email"], "Enter a valid email address"],
		]);
	});
});

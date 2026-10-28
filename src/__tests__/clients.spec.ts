import { describe, expect, it } from "vitest";
import {
	type AddClientForm,
	activeProjectCount,
	addClientSchema,
	isFollowUpDue,
	languagePairOptions,
	longPairLabel,
	searchClients,
	shortPairLabel,
	workTypeLabels,
	workTypeOptions,
} from "../lib/clients";

function project(
	archived_at: string | null,
	...states: ("ready" | "opened" | "done")[]
) {
	return { archived_at, follow_ups: states.map((state) => ({ state })) };
}

const validForm: AddClientForm = {
	name: "  Demo New Client ",
	contact_name: " Demo New Contact",
	contact_email: " new-contact@example.com ",
	language_pair: "EN → ES",
	work_type: "Business",
	notes: " Demo note ",
};

function fieldErrors(form: AddClientForm) {
	const result = addClientSchema.safeParse(form);
	expect(result.success).toBe(false);
	return result.error?.issues.map((issue) => [issue.path, issue.message]);
}

describe("form options", () => {
	it("offers the language pairs, with Not sure yet first and no pair", () => {
		expect(languagePairOptions.map((option) => option.label)).toEqual([
			"Not sure yet",
			"NL → EN",
			"EN → NL",
			"EN → ES",
		]);
		expect(languagePairOptions[0]).toMatchObject({
			source: null,
			target: null,
		});
		expect(languagePairOptions[1]).toMatchObject({
			source: "nl",
			target: "en",
		});
		expect(languagePairOptions[2]).toMatchObject({
			source: "en",
			target: "nl",
		});
		expect(languagePairOptions[3]).toMatchObject({
			source: "en",
			target: "es",
		});
	});

	it("offers the work types mapped to the enum, with Not sure yet as null", () => {
		expect(workTypeOptions).toEqual([
			{ label: "Not sure yet", value: null },
			{ label: "Legal", value: "legal" },
			{ label: "Real estate", value: "real_estate" },
			{ label: "Technical", value: "technical" },
			{ label: "Business", value: "business" },
			{ label: "Mixed", value: "mixed" },
		]);
		expect(workTypeLabels.real_estate).toBe("Real estate");
	});
});

describe("pair labels", () => {
	it("formats the short pair in upper case", () => {
		expect(shortPairLabel("nl", "en")).toBe("NL → EN");
		expect(shortPairLabel("es", "en")).toBe("ES → EN");
	});

	it("formats the long pair with English language names", () => {
		expect(longPairLabel("nl", "en")).toBe("Dutch to English");
		expect(longPairLabel("en", "es")).toBe("English to Spanish");
	});

	it("returns nothing when either code is missing", () => {
		expect(shortPairLabel(null, "en")).toBeUndefined();
		expect(shortPairLabel("nl", null)).toBeUndefined();
		expect(longPairLabel(null, "en")).toBeUndefined();
		expect(longPairLabel("nl", null)).toBeUndefined();
	});
});

describe("isFollowUpDue", () => {
	it("is true for a ready or opened follow-up on an active project", () => {
		expect(isFollowUpDue({ projects: [project(null, "ready")] })).toBe(true);
		expect(isFollowUpDue({ projects: [project(null, "done", "opened")] })).toBe(
			true,
		);
	});

	it("is false when every follow-up is done", () => {
		expect(isFollowUpDue({ projects: [project(null, "done")] })).toBe(false);
	});

	it("ignores follow-ups on archived projects", () => {
		expect(
			isFollowUpDue({ projects: [project("2026-10-01T00:00:00Z", "ready")] }),
		).toBe(false);
	});

	it("is false with no projects or no follow-ups", () => {
		expect(isFollowUpDue({ projects: [] })).toBe(false);
		expect(isFollowUpDue({ projects: [project(null)] })).toBe(false);
	});
});

describe("activeProjectCount", () => {
	it("counts projects that are not archived", () => {
		expect(
			activeProjectCount({
				projects: [
					project(null),
					project("2026-10-01T00:00:00Z"),
					project(null),
				],
			}),
		).toBe(2);
		expect(activeProjectCount({ projects: [] })).toBe(0);
	});
});

describe("searchClients", () => {
	const clients = [
		{ name: "Demo Legal Client", contact_name: "Demo Contact One" },
		{ name: "Demo Property Client", contact_name: "Demo Contact Two" },
	];

	it("matches the client name, ignoring case and surrounding spaces", () => {
		expect(searchClients(clients, "  LEGAL ")).toEqual([clients[0]]);
	});

	it("matches the contact name", () => {
		expect(searchClients(clients, "contact two")).toEqual([clients[1]]);
	});

	it("matches every client for an empty query", () => {
		expect(searchClients(clients, "")).toEqual(clients);
		expect(searchClients(clients, "   ")).toEqual(clients);
	});

	it("matches nothing for an unknown query", () => {
		expect(searchClients(clients, "zzz")).toEqual([]);
	});
});

describe("addClientSchema", () => {
	it("parses a full form into the clients insert payload", () => {
		const payload = addClientSchema.parse(validForm);
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
	});

	it("turns empty optional fields and Not sure yet into null", () => {
		expect(
			addClientSchema.parse({
				...validForm,
				language_pair: "Not sure yet",
				work_type: "Not sure yet",
				notes: "   ",
			}),
		).toMatchObject({
			usual_source_language: null,
			usual_target_language: null,
			usual_work_type: null,
			notes: null,
		});
	});

	it("requires the client name", () => {
		expect(fieldErrors({ ...validForm, name: "  " })).toEqual([
			[["name"], "Enter the client name"],
		]);
	});

	it("requires the contact name", () => {
		expect(fieldErrors({ ...validForm, contact_name: "" })).toEqual([
			[["contact_name"], "Enter the contact name"],
		]);
	});

	it("requires a valid contact email", () => {
		expect(fieldErrors({ ...validForm, contact_email: "" })).toEqual([
			[["contact_email"], "Enter a valid email address"],
		]);
		expect(
			fieldErrors({ ...validForm, contact_email: "not-an-email" }),
		).toEqual([[["contact_email"], "Enter a valid email address"]]);
	});

	it("reports every missing required field at once", () => {
		expect(
			fieldErrors({
				...validForm,
				name: "",
				contact_name: "",
				contact_email: "",
			}),
		).toEqual([
			[["name"], "Enter the client name"],
			[["contact_name"], "Enter the contact name"],
			[["contact_email"], "Enter a valid email address"],
		]);
	});
});

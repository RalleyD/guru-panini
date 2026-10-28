import { describe, expect, it } from "vitest";
import {
	documentTypeLabels,
	type NewProjectForm,
	newProjectSchema,
	pairHint,
	pairLabel,
	pairOptions,
	sourceFileKind,
	usualPair,
	wordCountLine,
} from "../lib/projects";

const legalClient = {
	name: "Demo Legal Client",
	usual_source_language: "nl",
	usual_target_language: "en",
};
const frenchClient = {
	name: "Demo French Client",
	usual_source_language: "fr",
	usual_target_language: "en",
};
const noPairClient = {
	name: "Demo No Pair Client",
	usual_source_language: null,
	usual_target_language: null,
};

const validForm: NewProjectForm = {
	client_id: "c1",
	title: "  Demo Spec Project ",
	document_type: "legal",
	due_date: "2026-11-15",
	language_pair: "nl-en",
	translator_id: "",
};

function fieldErrors(form: NewProjectForm) {
	const result = newProjectSchema.safeParse(form);
	expect(result.success).toBe(false);
	return result.error?.issues.map((issue) => [issue.path, issue.message]);
}

describe("documentTypeLabels", () => {
	it("labels the document types in order", () => {
		expect(Object.entries(documentTypeLabels)).toEqual([
			["legal", "Legal"],
			["real_estate", "Real estate"],
			["technical", "Technical"],
			["business", "Business"],
			["other", "Other"],
		]);
	});
});

describe("pairs", () => {
	it("reads a client's usual pair, or none", () => {
		expect(usualPair(legalClient)).toBe("nl-en");
		expect(usualPair(noPairClient)).toBeUndefined();
	});

	it("labels a pair with short codes", () => {
		expect(pairLabel("es-en")).toBe("ES → EN");
	});

	it("offers the four base pairs", () => {
		const base = [
			{ label: "NL → EN", value: "nl-en" },
			{ label: "EN → NL", value: "en-nl" },
			{ label: "EN → ES", value: "en-es" },
			{ label: "ES → EN", value: "es-en" },
		];
		expect(pairOptions()).toEqual(base);
		expect(pairOptions(legalClient)).toEqual(base);
		expect(pairOptions(noPairClient)).toEqual(base);
	});

	it("adds the client's usual pair when it is not a base pair", () => {
		expect(pairOptions(frenchClient).map((option) => option.label)).toEqual([
			"NL → EN",
			"EN → NL",
			"EN → ES",
			"ES → EN",
			"FR → EN",
		]);
		expect(pairOptions(frenchClient)[4].value).toBe("fr-en");
	});
});

describe("pairHint", () => {
	it("says the pair was set from the client when it matches", () => {
		expect(pairHint(legalClient, "nl-en")).toBe(
			"Set from Demo Legal Client. Change it if this project differs.",
		);
	});

	it("names the client's usual pair when the pair differs", () => {
		expect(pairHint(legalClient, "en-nl")).toBe(
			"Different from Demo Legal Client’s usual pair (NL → EN).",
		);
	});

	it("gives no hint without a client or a usual pair", () => {
		expect(pairHint(undefined, "nl-en")).toBeUndefined();
		expect(pairHint(noPairClient, "nl-en")).toBeUndefined();
	});
});

describe("wordCountLine", () => {
	it("formats the count in British English", () => {
		expect(wordCountLine(6)).toBe("6 words in this file.");
		expect(wordCountLine(12345)).toBe("12,345 words in this file.");
		expect(wordCountLine(0)).toBe("0 words in this file.");
	});

	it("says word for one", () => {
		expect(wordCountLine(1)).toBe("1 word in this file.");
	});
});

describe("newProjectSchema", () => {
	it("parses the form into the create_project arguments", () => {
		expect(newProjectSchema.parse(validForm)).toEqual({
			client_id: "c1",
			title: "Demo Spec Project",
			document_type: "legal",
			due_date: "2026-11-15",
			source_language: "nl",
			target_language: "en",
			translator_id: undefined,
		});
	});

	it("passes the chosen translator", () => {
		expect(
			newProjectSchema.parse({ ...validForm, translator_id: "t1" }),
		).toMatchObject({ translator_id: "t1" });
	});

	it("gives the five messages for an empty form, in field order", () => {
		expect(
			fieldErrors({
				client_id: "",
				title: "  ",
				document_type: "",
				due_date: "",
				language_pair: "",
				translator_id: "",
			}),
		).toEqual([
			[["client_id"], "Choose a client"],
			[["title"], "Enter a title"],
			[["document_type"], "Choose a document type"],
			[["due_date"], "Choose a due date"],
			[["language_pair"], "Choose a language pair"],
		]);
	});

	it("rejects a due date that is not YYYY-MM-DD", () => {
		expect(fieldErrors({ ...validForm, due_date: "15/11/2026" })).toEqual([
			[["due_date"], "Choose a due date"],
		]);
	});
});

describe("sourceFileKind", () => {
	it("accepts .docx and .pdf, ignoring case, with their MIME types", () => {
		expect(sourceFileKind("demo.docx")).toEqual({
			extension: "docx",
			contentType:
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		});
		expect(sourceFileKind("Demo Report.PDF")).toEqual({
			extension: "pdf",
			contentType: "application/pdf",
		});
	});

	it("treats anything else as unreadable", () => {
		expect(sourceFileKind("demo.txt")).toBeUndefined();
		expect(sourceFileKind("demo.doc")).toBeUndefined();
		expect(sourceFileKind("demo.docx.txt")).toBeUndefined();
		expect(sourceFileKind("docx")).toBeUndefined();
	});
});

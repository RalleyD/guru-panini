import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { countDocxWords } from "../lib/docx";

function docx(body: string): Uint8Array {
	const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><w:body>${body}</w:body></w:document>`;
	return zipSync({
		"[Content_Types].xml": strToU8("<Types/>"),
		"word/document.xml": strToU8(xml),
	});
}

function paragraph(...runs: string[]): string {
	return `<w:p>${runs.map((run) => `<w:r>${run}</w:r>`).join("")}</w:p>`;
}

function text(value: string): string {
	return `<w:t xml:space="preserve">${value}</w:t>`;
}

describe("countDocxWords", () => {
	it("counts the words in plain paragraphs", () => {
		expect(
			countDocxWords(
				docx(
					paragraph(text("Demo source one two")) +
						paragraph(text("three four")),
				),
			),
		).toBe(6);
	});

	it("separates the last word of a paragraph from the first of the next", () => {
		expect(
			countDocxWords(docx(paragraph(text("one")) + paragraph(text("two")))),
		).toBe(2);
	});

	it("counts a word split across two runs once", () => {
		expect(countDocxWords(docx(paragraph(text("Dem"), text("o word"))))).toBe(
			2,
		);
	});

	it("separates words at tabs and line breaks", () => {
		expect(
			countDocxWords(
				docx(
					paragraph(
						text("one"),
						"<w:tab/>",
						text("two"),
						"<w:br/>",
						text("three"),
						"<w:cr/>",
						text("four"),
					),
				),
			),
		).toBe(4);
	});

	it("does not count punctuation-only tokens", () => {
		expect(countDocxWords(docx(paragraph(text("one – two ... 3 !"))))).toBe(3);
	});

	it("counts a text box in mc:AlternateContent once", () => {
		const textBox = `<mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wps:txbx><w:txbxContent>${paragraph(text("boxed words"))}</w:txbxContent></wps:txbx></w:drawing></mc:Choice><mc:Fallback><w:pict><w:txbxContent>${paragraph(text("boxed words"))}</w:txbxContent></w:pict></mc:Fallback></mc:AlternateContent>`;
		expect(
			countDocxWords(docx(paragraph(text("before"), textBox, text("after")))),
		).toBe(4);
	});

	it("does not count deleted text or field codes", () => {
		expect(
			countDocxWords(
				docx(
					paragraph(
						text("kept"),
						'<w:delText xml:space="preserve"> removed words</w:delText>',
						'<w:instrText xml:space="preserve"> PAGE </w:instrText>',
					),
				),
			),
		).toBe(1);
	});

	it("counts nothing in an empty document", () => {
		expect(countDocxWords(docx(""))).toBe(0);
	});

	it("throws for bytes that are not a zip", () => {
		expect(() => countDocxWords(strToU8("Demo plain text"))).toThrow();
	});

	it("throws for a zip without word/document.xml", () => {
		expect(() =>
			countDocxWords(zipSync({ "other.xml": strToU8("<a/>") })),
		).toThrow();
	});

	it("throws when the document XML does not parse", () => {
		expect(() =>
			countDocxWords(zipSync({ "word/document.xml": strToU8("<w:document") })),
		).toThrow();
	});
});

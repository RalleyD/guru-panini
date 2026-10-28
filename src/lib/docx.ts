import { strFromU8, unzipSync } from "fflate";

const documentPath = "word/document.xml";
const wordNamespace =
	"http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const compatibilityNamespace =
	"http://schemas.openxmlformats.org/markup-compatibility/2006";
const wordBreaks = new Set(["p", "tab", "br", "cr"]);

function collectText(element: Element, parts: string[]) {
	for (const child of element.children) {
		// A text box is stored twice, as the drawing and as its fallback.
		if (
			child.namespaceURI === compatibilityNamespace &&
			child.localName === "Fallback"
		)
			continue;
		const isWord = child.namespaceURI === wordNamespace;
		if (isWord && child.localName === "t") {
			parts.push(child.textContent ?? "");
			continue;
		}
		const isBreak = isWord && wordBreaks.has(child.localName);
		if (isBreak) parts.push(" ");
		collectText(child, parts);
		if (isBreak) parts.push(" ");
	}
}

export function countDocxWords(data: Uint8Array): number {
	const files = unzipSync(data, {
		filter: (file) => file.name === documentPath,
	});
	const xml = files[documentPath];
	if (!xml) throw new Error(`The file has no ${documentPath}`);
	const document = new DOMParser().parseFromString(
		strFromU8(xml),
		"application/xml",
	);
	if (document.getElementsByTagName("parsererror").length > 0) {
		throw new Error(`${documentPath} could not be parsed`);
	}
	const parts: string[] = [];
	collectText(document.documentElement, parts);
	return parts
		.join("")
		.split(/\s+/)
		.filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

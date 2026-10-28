import { z } from "zod";
import type { TablesInsert } from "../types/database.types";
import { optionalText } from "./clients";

export const languagePairOptions = [
	{ label: "Dutch → English", value: "nl-en" },
	{ label: "English → Dutch", value: "en-nl" },
	{ label: "English → Spanish", value: "en-es" },
] as const;

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

export function pairsLabel(pairs: string[]): string | undefined {
	const items: string[] = [];
	const shown = new Set<string>();
	for (const pair of pairs) {
		if (shown.has(pair)) continue;
		const [source, target] = pair.split("-");
		const reverse = `${target}-${source}`;
		const both = reverse !== pair && pairs.includes(reverse);
		shown.add(pair);
		if (both) shown.add(reverse);
		items.push(
			[source, target]
				.map((code) => languageNames.of(code) ?? code)
				.join(both ? " ↔ " : " → "),
		);
	}
	return items.length ? items.join(", ") : undefined;
}

export function initials(name: string): string {
	const words = name.trim().split(/\s+/);
	const first = words[0]?.[0] ?? "";
	const last = words.length > 1 ? words[words.length - 1][0] : "";
	return (first + last).toUpperCase();
}

export function specialismLabel(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

type AllocationSummary = {
	project_id: string;
	end_date: string;
	is_proposed: boolean;
	projects: { archived_at: string | null } | null;
};

export function activeProjectCount(
	translator: { allocations: AllocationSummary[] },
	today: string,
): number {
	const projectIds = translator.allocations
		.filter(
			(allocation) =>
				!allocation.is_proposed &&
				allocation.end_date >= today &&
				allocation.projects?.archived_at === null,
		)
		.map((allocation) => allocation.project_id);
	return new Set(projectIds).size;
}

export function loadLabel(count: number): string {
	if (count === 0) return "No projects";
	return count === 1 ? "1 project" : `${count} projects`;
}

export function introLine(translators: { language_pairs: string[] }[]): string {
	const count = translators.length;
	const people = count === 1 ? "1 translator" : `${count} translators`;
	const pairCount = new Set(translators.flatMap((t) => t.language_pairs)).size;
	if (pairCount === 0) return `${people}.`;
	const pairs =
		pairCount === 1 ? "1 language pair" : `${pairCount} language pairs`;
	return `${people} across ${pairs}.`;
}

export const addTranslatorSchema = z
	.object({
		name: z.string().trim().min(1, "Enter the translator's name"),
		email: z.string().trim().pipe(z.email("Enter a valid email address")),
		language_pairs: z.array(
			z.enum(languagePairOptions.map((option) => option.value)),
		),
		specialisms: z.string().transform((value) => {
			const seen = new Set<string>();
			return value
				.split(",")
				.map((part) => part.trim())
				.filter((part) => {
					const key = part.toLowerCase();
					if (!part || seen.has(key)) return false;
					seen.add(key);
					return true;
				});
		}),
		availability: optionalText,
	})
	.transform((form): TablesInsert<"translators"> => form);

export type AddTranslatorForm = z.input<typeof addTranslatorSchema>;

import { z } from "zod";
import type { Database, Enums } from "../types/database.types";
import { shortPairLabel } from "./clients";

export type DocumentType = Enums<"document_type">;

export const documentTypeLabels: Record<DocumentType, string> = {
	legal: "Legal",
	real_estate: "Real estate",
	technical: "Technical",
	business: "Business",
	other: "Other",
};

type ClientPair = {
	usual_source_language: string | null;
	usual_target_language: string | null;
};

// Pairs are stored as "<source>-<target>" codes, e.g. "nl-en".
export function usualPair(client: ClientPair): string | undefined {
	const { usual_source_language: source, usual_target_language: target } =
		client;
	return source && target ? `${source}-${target}` : undefined;
}

export function pairLabel(pair: string): string | undefined {
	const [source, target] = pair.split("-");
	return shortPairLabel(source ?? null, target ?? null);
}

const basePairs = ["nl-en", "en-nl", "en-es", "es-en"];

export function pairOptions(
	client?: ClientPair,
): { label: string; value: string }[] {
	const usual = client && usualPair(client);
	const pairs =
		usual && !basePairs.includes(usual) ? [...basePairs, usual] : basePairs;
	return pairs.map((value) => ({ label: pairLabel(value) ?? value, value }));
}

export function pairHint(
	client: (ClientPair & { name: string }) | undefined,
	pair: string,
): string | undefined {
	const usual = client && usualPair(client);
	if (!client || !usual) return undefined;
	if (pair === usual) {
		return `Set from ${client.name}. Change it if this project differs.`;
	}
	return `Different from ${client.name}’s usual pair (${pairLabel(usual)}).`;
}

export function wordCountLine(count: number): string {
	const words = count === 1 ? "word" : "words";
	return `${count.toLocaleString("en-GB")} ${words} in this file.`;
}

type CreateProjectArgs =
	Database["public"]["Functions"]["create_project"]["Args"];

export const newProjectSchema = z
	.object({
		client_id: z.string().min(1, "Choose a client"),
		title: z.string().trim().min(1, "Enter a title"),
		// A string input, so the form can start at "" ("Choose one").
		document_type: z
			.string()
			.pipe(
				z.enum(
					Object.keys(documentTypeLabels) as DocumentType[],
					"Choose a document type",
				),
			),
		due_date: z.iso.date("Choose a due date"),
		language_pair: z
			.string()
			.regex(/^[a-z]{2}-[a-z]{2}$/, "Choose a language pair"),
		translator_id: z.string(),
	})
	.transform(
		(
			form,
		): Omit<
			CreateProjectArgs,
			"word_count" | "source_file_path" | "source_file_name"
		> => {
			const [source_language, target_language] = form.language_pair.split("-");
			return {
				client_id: form.client_id,
				title: form.title,
				document_type: form.document_type,
				due_date: form.due_date,
				source_language,
				target_language,
				// Left out when empty, so the function's null default applies.
				translator_id: form.translator_id || undefined,
			};
		},
	);

export type NewProjectForm = z.input<typeof newProjectSchema>;

const sourceFileTypes = {
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	pdf: "application/pdf",
} as const;

export type SourceFileKind = {
	extension: keyof typeof sourceFileTypes;
	contentType: string;
};

// Undefined means the file cannot be read.
export function sourceFileKind(fileName: string): SourceFileKind | undefined {
	const match = /\.(docx|pdf)$/.exec(fileName.toLowerCase());
	if (!match) return undefined;
	const extension = match[1] as SourceFileKind["extension"];
	return { extension, contentType: sourceFileTypes[extension] };
}

export type Milestone = Enums<"project_milestone">;

export const milestoneLabels: Record<Milestone, string> = {
	draft: "Draft finished",
	review: "Review finished",
	client_feedback: "Client feedback dealt with",
	delivery: "Delivered",
};

export const stageNames = [
	"Intake",
	"Allocated",
	"Draft",
	"Review",
	"Client feedback",
	"Delivery",
] as const;

export type StageName = (typeof stageNames)[number];

export type BoardColumn =
	| "Intake"
	| "In translation"
	| "In review"
	| "With client"
	| "Delivered";

type StageAllocation = {
	role: Enums<"allocation_role">;
	is_proposed: boolean;
};

type StageStep = { milestone: Milestone | null; completed_at: string | null };

export type ProjectStage = {
	stages: { name: StageName; done: boolean; current: boolean }[];
	doneCount: number;
	column: BoardColumn;
};

const stageMilestones: Partial<Record<StageName, Milestone>> = {
	Draft: "draft",
	Review: "review",
	"Client feedback": "client_feedback",
	Delivery: "delivery",
};

const stageColumns: Record<StageName, BoardColumn> = {
	Intake: "Intake",
	Allocated: "Intake",
	Draft: "In translation",
	Review: "In review",
	"Client feedback": "With client",
	Delivery: "With client",
};

// Stage and progress are derived from allocations and ticked steps, never stored.
export function projectStage(
	allocations: StageAllocation[],
	steps: StageStep[],
): ProjectStage {
	const allocated = allocations.some(
		(allocation) => allocation.role === "translator" && !allocation.is_proposed,
	);
	const ticked = new Set(
		steps
			.filter((step) => step.milestone && step.completed_at)
			.map((step) => step.milestone),
	);
	const done = stageNames.map((name) => {
		if (name === "Intake") return true;
		if (name === "Allocated") return allocated;
		return ticked.has(stageMilestones[name] ?? null);
	});
	const currentIndex = done.indexOf(false);
	return {
		stages: stageNames.map((name, index) => ({
			name,
			done: done[index],
			current: index === currentIndex,
		})),
		doneCount: done.filter(Boolean).length,
		column:
			currentIndex === -1
				? "Delivered"
				: stageColumns[stageNames[currentIndex]],
	};
}

// Full class lists, so a chip is just `:class="columnChipClasses[column]"`.
export const columnChipClasses: Record<BoardColumn, string> = {
	Intake: "chip",
	"In translation": "chip chip-lavender",
	"In review": "chip chip-duck",
	"With client": "chip chip-blue",
	Delivered: "chip",
};

export const documentTypeChipClasses: Record<DocumentType, string> = {
	legal: "chip chip-lavender",
	real_estate: "chip chip-blue",
	technical: "chip chip-duck",
	business: "chip",
	other: "chip",
};

// en-US because en-GB abbreviates September as "Sept"; UTC so the date never shifts a day.
const dateParts = new Intl.DateTimeFormat("en-US", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

// "2026-11-04" -> "4 Nov 2026".
export function formatDate(date: string): string {
	const parts = Object.fromEntries(
		dateParts
			.formatToParts(new Date(`${date}T00:00:00Z`))
			.map((part) => [part.type, part.value]),
	);
	return `${parts.day} ${parts.month} ${parts.year}`;
}

import { z } from "zod";
import type { Enums, TablesInsert } from "../types/database.types";

export type ClientWorkType = Enums<"client_work_type">;

export const workTypeLabels: Record<ClientWorkType, string> = {
	legal: "Legal",
	real_estate: "Real estate",
	technical: "Technical",
	business: "Business",
	mixed: "Mixed",
};

export const notSureYet = "Not sure yet";

// The form's select values are the option labels.
export const languagePairOptions = [
	{ label: notSureYet, source: null, target: null },
	{ label: "NL → EN", source: "nl", target: "en" },
	{ label: "EN → NL", source: "en", target: "nl" },
	{ label: "EN → ES", source: "en", target: "es" },
] as const;

export const workTypeOptions = [
	{ label: notSureYet, value: null },
	...(Object.keys(workTypeLabels) as ClientWorkType[]).map((value) => ({
		label: workTypeLabels[value],
		value,
	})),
];

export function shortPairLabel(
	source: string | null,
	target: string | null,
): string | undefined {
	if (!source || !target) return undefined;
	return `${source.toUpperCase()} → ${target.toUpperCase()}`;
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

export function longPairLabel(
	source: string | null,
	target: string | null,
): string | undefined {
	if (!source || !target) return undefined;
	return `${languageNames.of(source)} to ${languageNames.of(target)}`;
}

type ProjectSummary = {
	archived_at: string | null;
	follow_ups: { state: Enums<"follow_up_state"> }[];
};

export function isFollowUpDue(client: { projects: ProjectSummary[] }): boolean {
	return client.projects.some(
		(project) =>
			project.archived_at === null &&
			project.follow_ups.some(
				(f) => f.state === "ready" || f.state === "opened",
			),
	);
}

export function activeProjectCount(client: {
	projects: { archived_at: string | null }[];
}): number {
	return client.projects.filter((project) => project.archived_at === null)
		.length;
}

export function searchClients<T extends { name: string; contact_name: string }>(
	clients: T[],
	query: string,
): T[] {
	const needle = query.trim().toLowerCase();
	return clients.filter(
		(client) =>
			client.name.toLowerCase().includes(needle) ||
			client.contact_name.toLowerCase().includes(needle),
	);
}

const optionalText = z
	.string()
	.trim()
	.transform((value) => value || null);

export const addClientSchema = z
	.object({
		name: z.string().trim().min(1, "Enter the client name"),
		contact_name: z.string().trim().min(1, "Enter the contact name"),
		contact_email: z
			.string()
			.trim()
			.pipe(z.email("Enter a valid email address")),
		language_pair: z.enum(languagePairOptions.map((option) => option.label)),
		work_type: z.enum(workTypeOptions.map((option) => option.label)),
		notes: optionalText,
	})
	.transform((form): TablesInsert<"clients"> => {
		const pair = languagePairOptions.find(
			(option) => option.label === form.language_pair,
		);
		const workType = workTypeOptions.find(
			(option) => option.label === form.work_type,
		);
		return {
			name: form.name,
			contact_name: form.contact_name,
			contact_email: form.contact_email,
			usual_source_language: pair?.source ?? null,
			usual_target_language: pair?.target ?? null,
			usual_work_type: workType?.value ?? null,
			notes: form.notes,
		};
	});

export type AddClientForm = z.input<typeof addClientSchema>;

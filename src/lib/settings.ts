import { ref } from "vue";
import { z } from "zod";
import { Constants, type Enums, type Tables } from "../types/database.types";
import { optionalText } from "./clients";

export type EmailProvider = Enums<"email_provider">;
export type FollowUpReason = Enums<"follow_up_reason">;
type SettingsRow = Tables<"settings">;

export const defaultFollowUpAfterDays = 5;
export const defaultEmailProvider: EmailProvider = "default_app";

export const defaultReminderTexts: Record<FollowUpReason, string> = {
	draft_waiting:
		"Dear [contact name],\n\nI hope you are well. A gentle reminder that the draft of [project] was sent on [date]. When you have a moment, we would be glad to hear your comments.",
	quote_not_accepted:
		"Dear [contact name],\n\nThank you for your interest in a translation of [project]. I wanted to check whether the quote we sent on [date] suits you.",
	question_waiting:
		"Dear [contact name],\n\nA question came up in [project] on [date]. Could you let us know your preference when you have a moment?",
};

export function defaultSignOff(
	ownerName: string | null | undefined,
	agencyName: string | null | undefined,
): string {
	return ["Kind regards,", ownerName?.trim(), agencyName?.trim()]
		.filter(Boolean)
		.join("\n");
}

export type ResolvedSettings = {
	agency_name: string;
	owner_name: string;
	photo_path: string | null;
	email_provider: EmailProvider;
	sign_off: string;
	follow_up_after_days: number;
	reminder_draft_waiting: string;
	reminder_quote_not_accepted: string;
	reminder_question_waiting: string;
};

// A missing row or a null (or unselected) column falls back to its default.
// An empty-string sign-off means "no sign-off" and stays empty.
export function resolveSettings(
	row: Partial<SettingsRow> | null | undefined,
): ResolvedSettings {
	const agencyName = row?.agency_name ?? "";
	const ownerName = row?.owner_name ?? "";
	return {
		agency_name: agencyName,
		owner_name: ownerName,
		photo_path: row?.photo_path ?? null,
		email_provider: row?.email_provider ?? defaultEmailProvider,
		sign_off: row?.sign_off ?? defaultSignOff(ownerName, agencyName),
		follow_up_after_days: row?.follow_up_after_days ?? defaultFollowUpAfterDays,
		reminder_draft_waiting:
			row?.reminder_draft_waiting ?? defaultReminderTexts.draft_waiting,
		reminder_quote_not_accepted:
			row?.reminder_quote_not_accepted ??
			defaultReminderTexts.quote_not_accepted,
		reminder_question_waiting:
			row?.reminder_question_waiting ?? defaultReminderTexts.question_waiting,
	};
}

const reminderText = z.string().trim().min(1, "Enter the reminder text");
const daysMessage = "Enter a whole number from 1 to 30";

// One rule per editable column; each parses the field's value into what is saved.
export const settingsFieldSchemas = {
	agency_name: optionalText,
	owner_name: optionalText,
	sign_off: z.string().trim(),
	email_provider: z.enum(Constants.public.Enums.email_provider),
	follow_up_after_days: z.coerce
		.number({ error: daysMessage })
		.int(daysMessage)
		.min(1, daysMessage)
		.max(30, daysMessage),
	reminder_draft_waiting: reminderText,
	reminder_quote_not_accepted: reminderText,
	reminder_question_waiting: reminderText,
};

export type SettingsField = keyof typeof settingsFieldSchemas;

export const fallbackBrandName = "guru-panini";

// The brand text in the shell: empty until App.vue has loaded the settings row.
export const agencyName = ref("");

export function setAgencyName(name: string | null | undefined): void {
	agencyName.value = name?.trim() || fallbackBrandName;
}

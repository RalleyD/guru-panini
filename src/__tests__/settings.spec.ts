import { describe, expect, it } from "vitest";
import {
	agencyName,
	defaultReminderTexts,
	defaultSignOff,
	resolveSettings,
	setAgencyName,
	settingsFieldSchemas,
} from "../lib/settings";

const draftWaiting =
	"Dear [contact name],\n\nI hope you are well. A gentle reminder that the draft of [project] was sent on [date]. When you have a moment, we would be glad to hear your comments.";
const quoteNotAccepted =
	"Dear [contact name],\n\nThank you for your interest in a translation of [project]. I wanted to check whether the quote we sent on [date] suits you.";
const questionWaiting =
	"Dear [contact name],\n\nA question came up in [project] on [date]. Could you let us know your preference when you have a moment?";

describe("defaultReminderTexts", () => {
	it("are the wireframe texts word for word", () => {
		expect(defaultReminderTexts).toEqual({
			draft_waiting: draftWaiting,
			quote_not_accepted: quoteNotAccepted,
			question_waiting: questionWaiting,
		});
	});
});

describe("defaultSignOff", () => {
	it("puts the owner and agency names on their own lines", () => {
		expect(defaultSignOff("Demo Owner", "Demo Agency")).toBe(
			"Kind regards,\nDemo Owner\nDemo Agency",
		);
	});

	it("skips whichever name is empty", () => {
		expect(defaultSignOff("", "Demo Agency")).toBe(
			"Kind regards,\nDemo Agency",
		);
		expect(defaultSignOff("Demo Owner", null)).toBe(
			"Kind regards,\nDemo Owner",
		);
		expect(defaultSignOff(null, " ")).toBe("Kind regards,");
	});
});

describe("resolveSettings", () => {
	it("gives the defaults when there is no row", () => {
		expect(resolveSettings(null)).toEqual({
			agency_name: "",
			owner_name: "",
			photo_path: null,
			email_provider: "default_app",
			sign_off: "Kind regards,",
			follow_up_after_days: 5,
			reminder_draft_waiting: draftWaiting,
			reminder_quote_not_accepted: quoteNotAccepted,
			reminder_question_waiting: questionWaiting,
		});
	});

	it("falls back to the default for each null column", () => {
		const settings = resolveSettings({
			agency_name: "Demo Agency",
			owner_name: "Demo Owner",
			photo_path: null,
			email_provider: "outlook",
			sign_off: null,
			follow_up_after_days: 9,
			reminder_draft_waiting: "Demo draft text",
			reminder_quote_not_accepted: null,
			reminder_question_waiting: null,
		});
		expect(settings.sign_off).toBe("Kind regards,\nDemo Owner\nDemo Agency");
		expect(settings.email_provider).toBe("outlook");
		expect(settings.follow_up_after_days).toBe(9);
		expect(settings.reminder_draft_waiting).toBe("Demo draft text");
		expect(settings.reminder_quote_not_accepted).toBe(quoteNotAccepted);
		expect(settings.reminder_question_waiting).toBe(questionWaiting);
	});

	it("falls back for columns that were not selected", () => {
		const settings = resolveSettings({ sign_off: "Demo sign-off" });
		expect(settings.sign_off).toBe("Demo sign-off");
		expect(settings.email_provider).toBe("default_app");
		expect(settings.follow_up_after_days).toBe(5);
	});

	it("keeps an empty-string sign-off empty", () => {
		expect(
			resolveSettings({ owner_name: "Demo Owner", sign_off: "" }).sign_off,
		).toBe("");
	});
});

describe("settingsFieldSchemas", () => {
	const daysMessage = "Enter a whole number from 1 to 30";

	it.each([0, 31, 2.5, "", "abc"])("rejects %j days", (days) => {
		const result = settingsFieldSchemas.follow_up_after_days.safeParse(days);
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.message).toBe(daysMessage);
	});

	it("accepts days from 1 to 30, as numbers or strings", () => {
		expect(settingsFieldSchemas.follow_up_after_days.parse(1)).toBe(1);
		expect(settingsFieldSchemas.follow_up_after_days.parse("30")).toBe(30);
	});

	it("rejects an empty reminder text", () => {
		for (const field of [
			"reminder_draft_waiting",
			"reminder_quote_not_accepted",
			"reminder_question_waiting",
		] as const) {
			const result = settingsFieldSchemas[field].safeParse("  \n ");
			expect(result.success).toBe(false);
			expect(result.error?.issues[0]?.message).toBe("Enter the reminder text");
		}
	});

	it("trims a reminder text", () => {
		expect(
			settingsFieldSchemas.reminder_draft_waiting.parse("  Demo text \n"),
		).toBe("Demo text");
	});

	it("saves an empty agency name or your name as null", () => {
		expect(settingsFieldSchemas.agency_name.parse("  ")).toBeNull();
		expect(settingsFieldSchemas.owner_name.parse("")).toBeNull();
		expect(settingsFieldSchemas.agency_name.parse(" Demo Agency ")).toBe(
			"Demo Agency",
		);
	});

	it("allows an empty sign-off and saves it as an empty string", () => {
		expect(settingsFieldSchemas.sign_off.parse("  ")).toBe("");
		expect(settingsFieldSchemas.sign_off.parse(" Kind regards, \n")).toBe(
			"Kind regards,",
		);
	});

	it("accepts only the three providers", () => {
		for (const provider of ["default_app", "gmail", "outlook"]) {
			expect(settingsFieldSchemas.email_provider.parse(provider)).toBe(
				provider,
			);
		}
		expect(settingsFieldSchemas.email_provider.safeParse("yahoo").success).toBe(
			false,
		);
	});
});

describe("agencyName", () => {
	it("is empty until loaded, then the trimmed name or guru-panini", () => {
		expect(agencyName.value).toBe("");
		setAgencyName(" Demo Agency ");
		expect(agencyName.value).toBe("Demo Agency");
		setAgencyName("");
		expect(agencyName.value).toBe("guru-panini");
		setAgencyName(null);
		expect(agencyName.value).toBe("guru-panini");
	});
});

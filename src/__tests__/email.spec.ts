import { describe, expect, it } from "vitest";
import {
	composeUrl,
	opensInNewTab,
	reportProblemSubject,
	supportAddress,
	supportSubject,
	withSignOff,
} from "../lib/email";

const draft = {
	to: "contact@example.com",
	subject: "Demo Lease & Terms",
	body: "Dear Demo Contact,\n\nKind regards,\nDemo Owner",
};
const encodedSubject = "Demo%20Lease%20%26%20Terms";
const encodedBody =
	"Dear%20Demo%20Contact%2C%0A%0AKind%20regards%2C%0ADemo%20Owner";

describe("composeUrl", () => {
	it("builds a mailto link with an unencoded address", () => {
		expect(composeUrl("default_app", draft)).toBe(
			`mailto:contact@example.com?subject=${encodedSubject}&body=${encodedBody}`,
		);
	});

	it("builds a Gmail compose URL", () => {
		expect(composeUrl("gmail", draft)).toBe(
			`https://mail.google.com/mail/?view=cm&fs=1&to=contact%40example.com&su=${encodedSubject}&body=${encodedBody}`,
		);
	});

	it("builds an Outlook on the web compose URL", () => {
		expect(composeUrl("outlook", draft)).toBe(
			`https://outlook.office.com/mail/deeplink/compose?to=contact%40example.com&subject=${encodedSubject}&body=${encodedBody}`,
		);
	});

	it("leaves out an empty body or subject", () => {
		expect(composeUrl("default_app", { ...draft, body: "" })).toBe(
			`mailto:contact@example.com?subject=${encodedSubject}`,
		);
		expect(composeUrl("default_app", { ...draft, subject: "" })).toBe(
			`mailto:contact@example.com?body=${encodedBody}`,
		);
		expect(composeUrl("default_app", { ...draft, subject: "", body: "" })).toBe(
			"mailto:contact@example.com",
		);
		expect(composeUrl("gmail", { ...draft, body: "" })).toBe(
			`https://mail.google.com/mail/?view=cm&fs=1&to=contact%40example.com&su=${encodedSubject}`,
		);
		expect(composeUrl("outlook", { ...draft, subject: "" })).toBe(
			`https://outlook.office.com/mail/deeplink/compose?to=contact%40example.com&body=${encodedBody}`,
		);
	});

	it("opens a draft with no recipient", () => {
		expect(
			composeUrl("default_app", { to: "", subject: "Test email", body: "" }),
		).toBe("mailto:?subject=Test%20email");
		expect(
			composeUrl("gmail", { to: "", subject: "Test email", body: "" }),
		).toBe("https://mail.google.com/mail/?view=cm&fs=1&su=Test%20email");
	});
});

describe("withSignOff", () => {
	it("adds the sign-off after a blank line", () => {
		expect(withSignOff("Hello.", "Kind regards,\nDemo Owner")).toBe(
			"Hello.\n\nKind regards,\nDemo Owner",
		);
	});

	it("returns the sign-off alone when the body is empty", () => {
		expect(withSignOff("", "Kind regards,")).toBe("Kind regards,");
	});

	it("returns the body alone when the sign-off is empty", () => {
		expect(withSignOff("Hello.", "")).toBe("Hello.");
	});
});

describe("opensInNewTab", () => {
	it("opens Gmail and Outlook in a new tab but not the default app", () => {
		expect(opensInNewTab("gmail")).toBe(true);
		expect(opensInNewTab("outlook")).toBe(true);
		expect(opensInNewTab("default_app")).toBe(false);
	});
});

describe("support constants", () => {
	it("has no support address yet and the two subjects", () => {
		expect(supportAddress).toBe("");
		expect(supportSubject).toBe("Support request");
		expect(reportProblemSubject).toBe("Something looks wrong");
	});
});

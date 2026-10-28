import type { EmailProvider } from "./settings";

type Draft = { to: string; subject: string; body: string };

// The owner must supply the support address; until then the draft has no recipient.
export const supportAddress = "";
export const supportSubject = "Support request";
export const reportProblemSubject = "Something looks wrong";

// Empty values are left out of the URL.
function query(params: [string, string][]): string {
	return params
		.filter(([, value]) => value)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join("&");
}

// Every email link the app opens is built here, so it follows the provider setting.
export function composeUrl(
	provider: EmailProvider,
	{ to, subject, body }: Draft,
): string {
	if (provider === "gmail") {
		return `https://mail.google.com/mail/?view=cm&fs=1&${query([
			["to", to],
			["su", subject],
			["body", body],
		])}`;
	}
	if (provider === "outlook") {
		return `https://outlook.office.com/mail/deeplink/compose?${query([
			["to", to],
			["subject", subject],
			["body", body],
		])}`;
	}
	// The address is left unencoded, as the Message client link always was.
	const rest = query([
		["subject", subject],
		["body", body],
	]);
	return `mailto:${to}${rest && `?${rest}`}`;
}

export function withSignOff(body: string, signOff: string): string {
	return [body, signOff].filter(Boolean).join("\n\n");
}

export function opensInNewTab(provider: EmailProvider): boolean {
	return provider !== "default_app";
}

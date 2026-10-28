import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agencyName, defaultReminderTexts } from "../lib/settings";
import router from "../router";
import SettingsView from "../views/SettingsView.vue";

const db = vi.hoisted(() => ({
	getSession: vi.fn(),
	from: vi.fn(),
	maybeSingle: vi.fn(),
	upsert: vi.fn(),
	storageFrom: vi.fn(),
	upload: vi.fn(),
	createSignedUrl: vi.fn(),
}));
vi.mock("../lib/supabase", () => ({
	supabase: {
		auth: { getSession: db.getSession },
		from: db.from,
		storage: { from: db.storageFrom },
	},
}));

const userId = "de000000-0000-4000-8000-0000000000aa";

const row = {
	agency_name: "Demo Agency",
	owner_name: "Demo Owner",
	photo_path: null,
	email_provider: "default_app",
	sign_off: "Kind regards,\nDemo Owner",
	follow_up_after_days: 7,
	reminder_draft_waiting: "Demo draft reminder",
	reminder_quote_not_accepted: null,
	reminder_question_waiting: null,
};

async function mountSettings(path = "/settings") {
	await router.push(path);
	const wrapper = mount(SettingsView, {
		attachTo: document.body,
		global: { plugins: [router] },
	});
	await flushPromises();
	return wrapper;
}

type Wrapper = Awaited<ReturnType<typeof mountSettings>>;

function fieldFor(wrapper: Wrapper, label: string) {
	const labelEl = wrapper.findAll("label").find((l) => l.text() === label);
	return wrapper.find(`#${labelEl?.attributes("for")}`);
}

// setValue fires input and then change, as a typed edit followed by leaving the field does.
async function change(wrapper: Wrapper, label: string, value: string) {
	await fieldFor(wrapper, label).setValue(value);
	await flushPromises();
}

async function choosePhoto(wrapper: Wrapper, file: File) {
	const input = fieldFor(wrapper, "Profile photo");
	Object.defineProperty(input.element, "files", {
		value: [file],
		configurable: true,
	});
	await input.trigger("change");
	await flushPromises();
}

function link(wrapper: Wrapper, text: string) {
	const found = wrapper.findAll("a").find((a) => a.text() === text);
	if (!found) throw new Error(`No link "${text}"`);
	return found;
}

function card(wrapper: Wrapper, id: string) {
	return wrapper.find(`section#${id}`);
}

const pngBytes = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

describe("SettingsView", () => {
	let wrapper: Wrapper | undefined;

	afterEach(() => {
		wrapper?.unmount();
	});

	beforeEach(() => {
		// jsdom does not implement scrolling, which the router's scrollBehavior calls.
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		Element.prototype.scrollIntoView = vi.fn();
		db.getSession.mockResolvedValue({
			data: { session: { access_token: "token", user: { id: userId } } },
			error: null,
		});
		db.maybeSingle.mockReset().mockResolvedValue({ data: row, error: null });
		db.upsert.mockReset().mockResolvedValue({ data: null, error: null });
		db.from.mockReset().mockReturnValue({
			select: () => ({ maybeSingle: db.maybeSingle }),
			upsert: db.upsert,
		});
		db.upload.mockReset().mockResolvedValue({ data: {}, error: null });
		db.createSignedUrl.mockReset().mockResolvedValue({
			data: { signedUrl: "https://example.com/signed.png" },
			error: null,
		});
		db.storageFrom.mockReset().mockReturnValue({
			upload: db.upload,
			createSignedUrl: db.createSignedUrl,
		});
		agencyName.value = "";
	});

	it("shows the header and the four cards in order, with no Your data or Cover mode", async () => {
		wrapper = await mountSettings();

		expect(wrapper.find("h1").text()).toBe("Settings");
		expect(wrapper.text()).toContain("Just the essentials.");
		expect(wrapper.findAll("h2").map((h) => h.text())).toEqual([
			"Profile",
			"Email",
			"Follow-ups",
			"Support",
		]);
		expect(wrapper.findAll("section").map((s) => s.attributes("id"))).toEqual([
			"profile",
			"email",
			"followups",
			"support",
		]);
		expect(wrapper.text()).not.toContain("Your data");
		expect(wrapper.text()).not.toContain("Export");
		expect(wrapper.text()).not.toContain("Cover mode");
	});

	it("shows the wireframe copy and controls", async () => {
		wrapper = await mountSettings();

		const text = wrapper.text();
		expect(text).toContain(
			"Choose what “Open in email app” does. It always opens a draft for you to read and send. Nothing is sent for you.",
		);
		expect(wrapper.find("legend").text()).toBe("Open drafts in");
		expect(
			wrapper.findAll(".settings-option-title").map((t) => t.text()),
		).toEqual([
			"My default email app",
			"Gmail in my browser",
			"Outlook in my browser",
		]);
		expect(text).toContain("Shown at the top of every page.");
		expect(text).toContain(
			"Files can't be attached this way, and very long emails may be cut short. “Copy text” is always there as a fallback.",
		);
		expect(text).toContain(
			"When a client has been quiet for this long, the project appears in Needs you with an email ready to open.",
		);
		expect(text).toContain("days without a reply");
		expect(wrapper.find("h3").text()).toBe("Reminder text");
		expect(text).toContain(
			"Stuck, or something looks wrong? Write to us and a person will reply.",
		);
		expect(fieldFor(wrapper, "Profile photo").attributes("accept")).toBe(
			"image/jpeg,image/png,image/webp",
		);
		const days = fieldFor(wrapper, "Follow up after");
		expect(days.attributes()).toMatchObject({
			type: "number",
			min: "1",
			max: "30",
		});
		expect(fieldFor(wrapper, "Sign-off for emails").attributes("rows")).toBe(
			"3",
		);
		expect(fieldFor(wrapper, "Quote not accepted").attributes("rows")).toBe(
			"4",
		);
	});

	it("shows nothing below the header until the load ends", async () => {
		db.maybeSingle.mockReturnValue(new Promise(() => {}));
		wrapper = await mountSettings();

		expect(wrapper.find("h1").exists()).toBe(true);
		expect(wrapper.find("section").exists()).toBe(false);
	});

	it("shows the loaded values, with defaults for null columns", async () => {
		wrapper = await mountSettings();

		const value = (label: string) =>
			(fieldFor(wrapper as Wrapper, label).element as HTMLInputElement).value;
		expect(value("Your name")).toBe("Demo Owner");
		expect(value("Agency name")).toBe("Demo Agency");
		expect(value("Sign-off for emails")).toBe("Kind regards,\nDemo Owner");
		expect(value("Follow up after")).toBe("7");
		expect(value("Draft waiting for feedback")).toBe("Demo draft reminder");
		expect(value("Quote not accepted")).toBe(
			defaultReminderTexts.quote_not_accepted,
		);
		expect(value("Question waiting for the client")).toBe(
			defaultReminderTexts.question_waiting,
		);
		expect(wrapper.find(".settings-avatar").text()).toBe("DO");
		const checked = wrapper.find<HTMLInputElement>("input[type=radio]:checked");
		expect(checked.element.value).toBe("default_app");
		expect(checked.element.closest("label")?.className).toContain(
			"settings-option-selected",
		);
	});

	it("shows the resolver's defaults when there is no row", async () => {
		db.maybeSingle.mockResolvedValue({ data: null, error: null });
		wrapper = await mountSettings();

		const value = (label: string) =>
			(fieldFor(wrapper as Wrapper, label).element as HTMLInputElement).value;
		expect(value("Your name")).toBe("");
		expect(value("Agency name")).toBe("");
		expect(value("Sign-off for emails")).toBe("Kind regards,");
		expect(value("Follow up after")).toBe("5");
		expect(value("Draft waiting for feedback")).toBe(
			defaultReminderTexts.draft_waiting,
		);
		expect(value("Quote not accepted")).toBe(
			defaultReminderTexts.quote_not_accepted,
		);
		expect(value("Question waiting for the client")).toBe(
			defaultReminderTexts.question_waiting,
		);
		expect(wrapper.find(".settings-avatar").text()).toBe("");
		expect(
			wrapper.find<HTMLInputElement>("input[type=radio]:checked").element.value,
		).toBe("default_app");
	});

	it("shows the load error and loads again on Try again", async () => {
		db.maybeSingle.mockResolvedValueOnce({
			data: null,
			error: { message: "boom" },
		});
		wrapper = await mountSettings();

		expect(wrapper.find('[role="alert"]').text()).toBe(
			"Settings could not be loaded. Nothing was lost.",
		);
		expect(wrapper.find("section").exists()).toBe(false);

		const retry = wrapper
			.findAll("button")
			.find((b) => b.text() === "Try again");
		await retry?.trigger("click");
		await flushPromises();

		expect(db.maybeSingle).toHaveBeenCalledTimes(2);
		expect(wrapper.find('[role="alert"]').exists()).toBe(false);
		expect(wrapper.findAll("h2")).toHaveLength(4);
	});

	it("scrolls the section in the hash into view once the cards render", async () => {
		wrapper = await mountSettings("/settings#support");

		expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
		expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(
			card(wrapper, "support").element,
		);
	});

	it("saves the agency name on change, shows Saved. and updates the brand", async () => {
		wrapper = await mountSettings();

		await change(wrapper, "Agency name", "  Demo Agency Renamed ");

		expect(db.from).toHaveBeenCalledWith("settings");
		expect(db.upsert).toHaveBeenCalledWith(
			{ owner_id: userId, agency_name: "Demo Agency Renamed" },
			{ onConflict: "owner_id" },
		);
		expect(card(wrapper, "profile").find('[role="status"]').text()).toBe(
			"Saved.",
		);
		expect(agencyName.value).toBe("Demo Agency Renamed");
	});

	it("saves an empty agency name as null and the brand falls back", async () => {
		wrapper = await mountSettings();

		await change(wrapper, "Agency name", " ");

		expect(db.upsert).toHaveBeenCalledWith(
			{ owner_id: userId, agency_name: null },
			{ onConflict: "owner_id" },
		);
		expect(agencyName.value).toBe("guru-panini");
	});

	it("saves days, sign-off and a reminder text on change", async () => {
		wrapper = await mountSettings();

		await change(wrapper, "Follow up after", "9");
		await change(wrapper, "Sign-off for emails", "");
		await change(wrapper, "Quote not accepted", "Demo new text ");

		expect(db.upsert.mock.calls.map(([columns]) => columns)).toEqual([
			{ owner_id: userId, follow_up_after_days: 9 },
			{ owner_id: userId, sign_off: "" },
			{ owner_id: userId, reminder_quote_not_accepted: "Demo new text" },
		]);
		expect(card(wrapper, "followups").find('[role="status"]').text()).toBe(
			"Saved.",
		);
	});

	it("does not save days of 31 and shows the message on the field", async () => {
		wrapper = await mountSettings();

		await change(wrapper, "Follow up after", "31");

		const days = fieldFor(wrapper, "Follow up after");
		expect(days.attributes("aria-invalid")).toBe("true");
		expect(wrapper.find(`#${days.attributes("aria-describedby")}`).text()).toBe(
			"Enter a whole number from 1 to 30",
		);
		expect(db.upsert).not.toHaveBeenCalled();
		expect((days.element as HTMLInputElement).value).toBe("31");

		await change(wrapper, "Follow up after", "12");
		expect(days.attributes("aria-invalid")).toBeUndefined();
		expect(wrapper.text()).not.toContain("Enter a whole number from 1 to 30");
		expect(db.upsert).toHaveBeenCalledTimes(1);
	});

	it("does not save an empty reminder text", async () => {
		wrapper = await mountSettings();

		await change(wrapper, "Draft waiting for feedback", "  ");

		const field = fieldFor(wrapper, "Draft waiting for feedback");
		expect(field.attributes("aria-invalid")).toBe("true");
		expect(
			wrapper.find(`#${field.attributes("aria-describedby")}`).text(),
		).toBe("Enter the reminder text");
		expect(db.upsert).not.toHaveBeenCalled();
	});

	it("shows the save error on a failed upsert and Try again resends it", async () => {
		db.upsert.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
		wrapper = await mountSettings();

		await change(wrapper, "Your name", "Demo Renamed Owner");

		const profile = card(wrapper, "profile");
		const alert = profile.find('[role="alert"]');
		expect(alert.text()).toContain("Your changes were not saved");
		expect(alert.text()).toContain(
			"Nothing was lost. Your edits are still on this page. Try again.",
		);
		expect(
			(fieldFor(wrapper, "Your name").element as HTMLInputElement).value,
		).toBe("Demo Renamed Owner");

		await alert.find("button").trigger("click");
		await flushPromises();

		expect(db.upsert).toHaveBeenCalledTimes(2);
		expect(db.upsert.mock.calls[1]).toEqual(db.upsert.mock.calls[0]);
		expect(db.upsert.mock.calls[1][0]).toEqual({
			owner_id: userId,
			owner_name: "Demo Renamed Owner",
		});
		expect(profile.find('[role="alert"]').exists()).toBe(false);
		expect(profile.find('[role="status"]').text()).toBe("Saved.");
	});

	it("builds Open a test email from the values on the page", async () => {
		wrapper = await mountSettings();

		expect(link(wrapper, "Open a test email").attributes()).toMatchObject({
			href: `mailto:?subject=Test%20email%20from%20Demo%20Agency&body=${encodeURIComponent("This is how an email will open.\n\nKind regards,\nDemo Owner")}`,
		});
		expect(
			link(wrapper, "Open a test email").attributes("target"),
		).toBeUndefined();

		await fieldFor(wrapper, "Agency name").setValue("");
		await fieldFor(wrapper, "Sign-off for emails").setValue("");
		expect(link(wrapper, "Open a test email").attributes("href")).toBe(
			`mailto:?subject=Test%20email&body=${encodeURIComponent("This is how an email will open.")}`,
		);
	});

	it("saves the Gmail choice and the test email opens Gmail in a new tab", async () => {
		wrapper = await mountSettings();

		await wrapper.find('input[type=radio][value="gmail"]').setValue();
		await flushPromises();

		expect(db.upsert).toHaveBeenCalledWith(
			{ owner_id: userId, email_provider: "gmail" },
			{ onConflict: "owner_id" },
		);
		expect(card(wrapper, "email").find('[role="status"]').text()).toBe(
			"Saved.",
		);
		const testEmail = link(wrapper, "Open a test email");
		expect(testEmail.attributes("href")).toMatch(
			/^https:\/\/mail\.google\.com\/mail\/\?view=cm/,
		);
		expect(testEmail.attributes("target")).toBe("_blank");
		expect(testEmail.attributes("rel")).toBe("noopener noreferrer");
		expect(
			wrapper.find('input[type=radio][value="gmail"]').element.closest("label")
				?.className,
		).toContain("settings-option-selected");
	});

	it("builds the Support links with their subjects, the saved provider and the sign-off", async () => {
		wrapper = await mountSettings();

		const body = encodeURIComponent("Kind regards,\nDemo Owner");
		const support = link(wrapper, "Email support");
		expect(support.attributes("href")).toBe(
			`mailto:?subject=Support%20request&body=${body}`,
		);
		expect(support.classes()).toEqual(["btn", "btn-primary"]);
		const report = link(wrapper, "Report a problem");
		expect(report.attributes("href")).toBe(
			`mailto:?subject=Something%20looks%20wrong&body=${body}`,
		);
		expect(report.classes()).toEqual(["btn"]);

		await wrapper.find('input[type=radio][value="outlook"]').setValue();
		await flushPromises();
		expect(link(wrapper, "Email support").attributes("href")).toBe(
			`https://outlook.office.com/mail/deeplink/compose?subject=Support%20request&body=${body}`,
		);
		expect(link(wrapper, "Email support").attributes("target")).toBe("_blank");
	});

	it.each([
		["a .gif", new File(["GIF89a"], "demo.gif", { type: "image/gif" })],
		[
			"a 6 MB image",
			new File([new Uint8Array(6 * 1024 * 1024)], "demo.png", {
				type: "image/png",
			}),
		],
		[
			"a text file named .png",
			new File(["Demo notes"], "demo.png", { type: "image/png" }),
		],
	])("does not upload %s and shows the photo message", async (_name, file) => {
		wrapper = await mountSettings();

		await choosePhoto(wrapper, file);

		const input = fieldFor(wrapper, "Profile photo");
		expect(input.attributes("aria-invalid")).toBe("true");
		expect(
			wrapper.find(`#${input.attributes("aria-describedby")}`).text(),
		).toBe("Choose a JPG, PNG or WebP image up to 5 MB.");
		expect(db.upload).not.toHaveBeenCalled();
		expect(db.upsert).not.toHaveBeenCalled();
	});

	it("uploads a PNG to the owner's folder, saves its path and shows it", async () => {
		wrapper = await mountSettings();

		await choosePhoto(
			wrapper,
			new File([pngBytes], "me.png", { type: "image/png" }),
		);

		expect(db.storageFrom).toHaveBeenCalledWith("profile-photos");
		const [path, , options] = db.upload.mock.calls[0];
		expect(path).toMatch(new RegExp(`^${userId}/[0-9a-f-]{36}\\.png$`));
		expect(options).toEqual({ contentType: "image/png" });
		expect(db.upsert).toHaveBeenCalledWith(
			{ owner_id: userId, photo_path: path },
			{ onConflict: "owner_id" },
		);
		expect(db.createSignedUrl).toHaveBeenCalledWith(path, 3600);
		const img = wrapper.find(".settings-avatar img");
		expect(img.attributes("src")).toBe("https://example.com/signed.png");
		expect(img.attributes("alt")).toBe("Profile photo");
	});

	it("shows the saved photo from a signed URL", async () => {
		db.maybeSingle.mockResolvedValue({
			data: { ...row, photo_path: `${userId}/demo.png` },
			error: null,
		});
		wrapper = await mountSettings();

		expect(db.createSignedUrl).toHaveBeenCalledWith(`${userId}/demo.png`, 3600);
		expect(wrapper.find(".settings-avatar img").attributes("src")).toBe(
			"https://example.com/signed.png",
		);
	});

	it("does not upload the photo again when Try again resends a failed save", async () => {
		db.upsert.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
		wrapper = await mountSettings();

		await choosePhoto(
			wrapper,
			new File([pngBytes], "me.png", { type: "image/png" }),
		);
		const alert = card(wrapper, "profile").find('[role="alert"]');
		expect(alert.text()).toContain("Your changes were not saved");

		await alert.find("button").trigger("click");
		await flushPromises();

		expect(db.upload).toHaveBeenCalledTimes(1);
		expect(db.upsert).toHaveBeenCalledTimes(2);
		expect(wrapper.find(".settings-avatar img").exists()).toBe(true);
	});
});

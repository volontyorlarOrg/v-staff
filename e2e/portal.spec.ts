import { expect, test, type Page } from "@playwright/test";

const LOCALES = ["uz", "ru", "en"] as const;

const COORDINATOR = "coordinator@example.org";
const OTHER_COORDINATOR = "other@example.org";
const TEMPORARY_COORDINATOR = "temporary@example.org";
const ADMINISTRATOR = "administrator@example.org";
const VOLUNTEER = "dilnoza@example.org";
const PASSWORD = "stub-password";

const STUB = `http://127.0.0.1:${process.env.E2E_STUB_PORT ?? 3603}`;

async function resetBackend(page: Page) {
  await page.request.post(`${STUB}/__stub/reset`);
}

async function signIn(page: Page, email = COORDINATOR, password = PASSWORD) {
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function signedIn(page: Page) {
  await signIn(page);
  await expect(page).toHaveURL(/\/en\/dashboard$/);
}

function formMessage(page: Page) {
  return page.locator('[data-slot="form-message"]');
}

function statePanel(page: Page) {
  return page.locator('[data-slot="state-panel"]');
}

function fieldError(page: Page) {
  return page.locator('[data-slot="field-error"]');
}

function dialog(page: Page) {
  return page.getByRole("dialog");
}

function decision(page: Page, subject: string) {
  return page.getByRole("group", { name: `Decision: ${subject}` });
}

function toast(page: Page) {
  return page.locator("[data-sonner-toast]");
}

async function openDialog(page: Page, name: string | RegExp) {
  const control = page
    .getByRole("button", { name })
    .or(page.getByRole("link", { name }));
  await control.first().click();
  await expect(dialog(page)).toBeVisible();
}

async function sessionCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find((cookie) => cookie.name === "volontyorlar_staff_session");
}

test.beforeEach(async ({ page }) => {
  await resetBackend(page);
});

test.describe("sign-in", () => {
  test("a coordinator signs in and lands on their desk for today", async ({ page }) => {
    await signedIn(page);
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "On your desk" }),
    ).toBeVisible();
  });

  test("a wrong password is refused without saying which half was wrong", async ({
    page,
  }) => {
    await signIn(page, COORDINATOR, "not-the-password");

    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(formMessage(page)).toContainText(
      "do not match an account for this portal",
    );
    expect(await sessionCookie(page)).toBeUndefined();
  });

  test("an administrator cannot sign in to the coordinator portal", async ({
    page,
  }) => {
    await signIn(page, ADMINISTRATOR);

    await expect(page).toHaveURL(/\/en\/login$/);
    await expect(formMessage(page)).toBeVisible();
    expect(await sessionCookie(page)).toBeUndefined();
  });

  test("a volunteer cannot sign in to the coordinator portal", async ({ page }) => {
    await signIn(page, VOLUNTEER);

    await expect(page).toHaveURL(/\/en\/login$/);
    expect(await sessionCookie(page)).toBeUndefined();
  });

  test("the sign-in page offers no way to create an account", async ({ page }) => {
    await page.goto("/en/login");

    await expect(
      page.getByRole("link", { name: /create|sign up|register/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /create|sign up|register/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Coordinator accounts are created by an administrator"),
    ).toBeVisible();
  });

  test("there is no signup or password-recovery route", async ({ page }) => {
    for (const path of ["/en/signup", "/en/register", "/en/forgot-password"]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });
});

test.describe("the session", () => {
  test("keeps the session token out of the browser", async ({ page }) => {
    await signedIn(page);

    const cookie = await sessionCookie(page);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Strict");
    expect(cookie?.value).not.toContain("access-");
    expect(cookie?.value).not.toContain("refresh-");

    const html = await page.content();
    expect(html).not.toContain("access-");
    expect(html).not.toContain("refresh-");

    const stored = await page.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
    }));
    expect(stored.local).toBe("{}");
    expect(stored.session).toBe("{}");
  });

  test("carries one unchanged session as the coordinator moves around", async ({
    page,
  }) => {
    await signedIn(page);
    const first = await sessionCookie(page);

    await page.goto("/en/vacancies");
    await expect(page).toHaveURL(/\/en\/vacancies$/);

    const second = await sessionCookie(page);
    expect(second?.value).toBe(first?.value);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vacancies");

    await page.goto("/en/applications");
    await expect(page).toHaveURL(/\/en\/applications$/);
    expect((await sessionCookie(page))?.value).toBe(first?.value);
  });

  test("sends an unauthenticated visitor to sign-in and remembers where they wanted to go", async ({
    page,
  }) => {
    await page.goto("/en/applications");

    await expect(page).toHaveURL(/\/en\/login\?next=%2Fen%2Fapplications/);
  });

  test("ends when the cookie no longer decrypts", async ({ page }) => {
    await signedIn(page);
    await page.context().clearCookies({ name: "volontyorlar_staff_session" });
    await page.context().addCookies([
      {
        name: "volontyorlar_staff_session",
        value: "tampered-value",
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/en/dashboard");
    await expect(page).toHaveURL(/\/en\/login/);
    await expect(formMessage(page)).toContainText("session");
  });

  test("keeps the session when a guest page redirects a signed-in coordinator", async ({
    page,
  }) => {
    await signedIn(page);
    const before = await sessionCookie(page);

    await page.goto("/en/login");
    await expect(page).toHaveURL(/\/en\/dashboard$/);

    const after = await sessionCookie(page);
    expect(after?.value).toBe(before?.value);

    await page.goto("/en/vacancies");
    await expect(page).toHaveURL(/\/en\/vacancies$/);
  });

  test("keeps the session while a required password change redirects", async ({
    page,
  }) => {
    await signIn(page, TEMPORARY_COORDINATOR);
    await expect(page).toHaveURL(/\/en\/account\/change-password$/);
    const before = await sessionCookie(page);

    await page.goto("/en/vacancies");
    await expect(page).toHaveURL(/\/en\/account\/change-password$/);

    const after = await sessionCookie(page);
    expect(after?.value).toBe(before?.value);
  });

  test("signs out and clears the cookie", async ({ page }) => {
    await signedIn(page);
    if ((page.viewportSize()?.width ?? 1280) < 1024) {
      await page.getByRole("button", { name: "Open the menu" }).click();
    }
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/en\/login\?session=signedOut/);
    expect(await sessionCookie(page)).toBeFalsy();

    await page.goto("/en/dashboard");
    await expect(page).toHaveURL(/\/en\/login/);
  });
});

test.describe("a coordinator only sees their own work", () => {
  test("lists only the vacancies they created", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/vacancies");

    await expect(page.getByRole("row", { name: /Winter book drive/ })).toHaveCount(1);
    await expect(page.getByRole("row", { name: /Reading room weekends/ })).toHaveCount(
      1,
    );
    await expect(page.getByRole("row", { name: /City sports day/ })).toHaveCount(0);
  });

  test("lists only applications to their own vacancies", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/applications");

    const rows = page.getByRole("row");
    await expect(rows.filter({ hasText: "Winter book drive" })).not.toHaveCount(0);
    await expect(rows.filter({ hasText: "City sports day" })).toHaveCount(0);
  });

  test("cannot open a vacancy belonging to another coordinator", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/00000000-0000-4000-8000-000000000403");

    await expect(page.getByText("Not found")).toBeVisible();
  });
});

test.describe("the vacancy approval workflow", () => {
  const RETURNED = "00000000-0000-4000-8000-000000000404";

  async function fillDraft(page: Page, title: string, organization: string) {
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill(`${title} description`);
    await page
      .getByRole("combobox", { name: "Organization" })
      .selectOption({ label: organization });
    await page.getByRole("combobox", { name: "Region" }).selectOption("tashkent-city");
    await page.getByLabel("City or district").fill("Tashkent");
    await page.getByLabel("Place", { exact: true }).fill("Chilonzor library");
    await page.getByLabel("Places", { exact: true }).fill("12");
    await page.getByLabel("Estimated hours").fill("6");
    await page.getByLabel("Starts").fill("2026-11-01T09:00");
    await page.getByLabel("Ends").fill("2026-11-01T15:00");
    await page.getByLabel("Applications close").fill("2026-10-20T18:00");
  }

  test("saves a short draft and sends it for review without optional logistics", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/new");
    await page.getByLabel("Title").fill("Neighborhood reading help");
    await page.getByLabel("Description").fill("Help children choose books.");
    await page
      .getByRole("combobox", { name: "Organization" })
      .selectOption({ label: "Chilonzor Reading Corners" });
    await page.getByRole("combobox", { name: "Region" }).selectOption("tashkent-city");
    await page.getByRole("combobox", { name: "Format" }).selectOption("onsite");
    await page.getByLabel("Starts").fill("2099-11-01T09:00");
    await page.getByLabel("Applications close").fill("2099-10-20T18:00");
    await page.getByRole("button", { name: "Create the draft" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Neighborhood reading help",
    );
    const send = decision(page, "Neighborhood reading help");
    await send.getByRole("button", { name: "Send for approval" }).click();
    await send.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Waiting for approval").first()).toBeVisible();
  });

  test("creates a draft, sends it for approval, and is locked out until a decision", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/vacancies");

    await page.getByRole("link", { name: "New vacancy" }).click();
    await expect(page).toHaveURL(/\/en\/vacancies\/new$/);
    await fillDraft(page, "Library shelving day", "Chilonzor Reading Corners");
    await expect(page.getByRole("radio", { name: /^Manually/ })).toBeChecked();
    await page.getByRole("radio", { name: /^Automatically/ }).check();
    await page.getByRole("button", { name: "Create the draft" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Library shelving day",
    );
    await expect(page.getByText("Automatically", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit vacancy" })).toBeVisible();

    const send = decision(page, "Library shelving day");
    await send.getByRole("button", { name: "Send for approval" }).click();
    await expect(send).toContainText("Send it to an administrator now?");
    await send.getByRole("button", { name: "Send", exact: true }).click();

    await expect(toast(page)).toContainText("sent for approval");
    await expect(page.getByText("Waiting for approval").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Waiting for an administrator" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit vacancy" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send for approval" })).toHaveCount(
      0,
    );
  });

  test("will not send a vacancy whose organization is unverified, and says why", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/new");

    await fillDraft(page, "Riverbank clean-up", "Green Corridor Group — not verified");
    await expect(page.getByText("not verified yet").first()).toBeVisible();
    await page.getByRole("button", { name: "Create the draft" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Riverbank clean-up",
    );
    const slip = page.getByRole("region", { name: "Send for approval" });
    await expect(slip).toContainText("Fill these in before sending it");
    await expect(slip).toContainText("a verified organization");
    await expect(
      slip.getByRole("button", { name: "Send for approval" }),
    ).toBeDisabled();
  });

  test("shows the administrator's note and reopens editing after changes are requested", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/en/vacancies/${RETURNED}`);

    await expect(page.getByText("Changes requested").first()).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Changes were requested" }),
    ).toContainText("Name the venue and the hours");
    await expect(page.getByRole("link", { name: "Edit vacancy" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send for approval" })).toBeVisible();
  });

  test("keeps a rejected vacancy read-only", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/00000000-0000-4000-8000-000000000406");

    await expect(statePanel(page).first()).toContainText("was rejected");
    await expect(page.getByRole("link", { name: "Edit vacancy" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send for approval" })).toHaveCount(
      0,
    );
  });

  test("edits a returned vacancy on its own page and sends it again", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/en/vacancies/${RETURNED}`);

    await page.getByRole("link", { name: "Edit vacancy" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.getByLabel("Place", { exact: true }).fill("Central library");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(new RegExp(`/en/vacancies/${RETURNED}$`));

    const send = decision(page, "Photo archive week");
    await send.getByRole("button", { name: "Send for approval" }).click();
    await send.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Waiting for approval").first()).toBeVisible();
  });

  test("keeps an edited vacancy intact after repeated invalid saves", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto(`/en/vacancies/${RETURNED}`);

    await page.getByRole("link", { name: "Edit vacancy" }).click();
    await page.getByLabel("Title").fill("Revised photo archive week");
    await page.getByLabel("Applications close").fill("2099-11-05T18:00");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByLabel("Title")).toHaveValue("Revised photo archive week");
    await expect(page.getByLabel("Applications close")).toHaveValue(
      "2099-11-05T18:00",
    );
    await expect(fieldError(page)).toContainText(
      "deadline must fall before the vacancy starts",
    );

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByLabel("Title")).toHaveValue("Revised photo archive week");
    await expect(page.getByLabel("Applications close")).toHaveValue(
      "2099-11-05T18:00",
    );
  });

  test("returns a published coordinator edit to approval without losing details", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/00000000-0000-4000-8000-000000000401");

    await page.getByRole("link", { name: "Edit vacancy" }).click();
    await page.getByLabel("Title").fill("Winter book drive, revised");
    await page.getByLabel("Starts").fill("2099-11-01T09:00");
    await page.getByLabel("Ends").fill("2099-11-01T15:00");
    await page.getByLabel("Applications close").fill("2099-10-20T18:00");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText("revised");
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
    const send = decision(page, "Winter book drive, revised");
    await send.getByRole("button", { name: "Send for approval" }).click();
    await send.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Waiting for approval").first()).toBeVisible();
  });

  test("sends a published photo change back through approval", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/00000000-0000-4000-8000-000000000401");

    await page.getByLabel("Choose a photo").setInputFiles({
      name: "vacancy.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/fscAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await page.getByRole("button", { name: "Upload photo" }).click();

    await expect(page.getByText("The photo was saved.")).toBeVisible();
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove photo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send for approval" })).toBeVisible();
  });

  test("archives an approved vacancy and closes what nobody decided", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/00000000-0000-4000-8000-000000000401");

    await openDialog(page, "Archive");
    await expect(dialog(page)).toContainText("nobody decided will be closed");
    await dialog(page).getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByText("This vacancy is archived")).toBeVisible();

    await page.goto("/en/applications?view=waiting");
    await expect(
      page.getByRole("row").filter({ hasText: "Winter book drive" }),
    ).toHaveCount(0);
  });

  test("rejects a deadline that falls after the vacancy starts", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/new");

    await fillDraft(page, "Late deadline", "Chilonzor Reading Corners");
    await page.getByLabel("Applications close").fill("2026-11-05T18:00");
    await page.getByRole("button", { name: "Create the draft" }).click();

    await expect(fieldError(page)).toContainText(
      "deadline must fall before the vacancy starts",
    );
    await expect(page.getByLabel("Title")).toHaveValue("Late deadline");
    await expect(page.getByLabel("Place", { exact: true })).toHaveValue(
      "Chilonzor library",
    );
  });

  test("refuses meeting credentials in the public online location", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/new");

    await fillDraft(page, "Remote help", "Chilonzor Reading Corners");
    await page.getByRole("combobox", { name: "Format" }).selectOption("remote");
    await page.getByLabel("Place", { exact: true }).fill("Zoom, passcode 4821");
    await page.getByRole("button", { name: "Create the draft" }).click();

    await expect(fieldError(page)).toContainText("Remove the meeting password");
  });
});

test.describe("the desk", () => {
  test("shows what came back, what is still a draft and what is with an administrator", async ({
    page,
  }) => {
    await signedIn(page);

    await expect(page.locator("#returned")).toContainText("Photo archive week");
    await expect(page.locator("#returned")).toContainText(
      "Name the venue and the hours",
    );
    await expect(page.locator("#drafts")).toContainText("Reading room weekends");
    await expect(page.getByText("1 vacancy is with an administrator")).toBeVisible();
    await expect(page.locator("#decide")).toContainText("Winter book drive");
    await expect(page.locator("#roll-calls")).toContainText("Winter book drive");
  });

  test("sends a finished draft for approval without opening it", async ({ page }) => {
    await signedIn(page);

    const send = decision(page, "Reading room weekends");
    await send.getByRole("button", { name: "Send for approval" }).click();
    await send.getByRole("button", { name: "Send", exact: true }).click();

    await expect(toast(page)).toContainText("sent for approval");
    await expect(page.getByText("2 vacancies are with an administrator")).toBeVisible();
    await expect(page.locator("#drafts")).toHaveCount(0);
  });

  test("decides an application in its row and files it under Cleared today", async ({
    page,
  }) => {
    await signedIn(page);

    const row = page.locator("#decide li").first();
    await row.getByRole("button", { name: "Accept" }).click();
    await row.getByRole("button", { name: "Accept" }).click();

    await expect(toast(page)).toContainText("was accepted");
    await expect(
      page.getByRole("region", { name: "Cleared today" }).or(page.locator("#cleared")),
    ).toContainText("Accepted");
  });
});

test.describe("review and attendance", () => {
  test("leaves out applications a volunteer has not sent", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/applications");

    const rows = page.getByRole("row");
    await expect(rows.filter({ hasText: "Dilnoza Karimova" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "Jasur Qodirov" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Draft" })).toHaveCount(0);
  });

  test("shows a profile-only application without an empty answers panel", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/applications/00000000-0000-4000-8000-000000000607");

    await expect(
      page.getByRole("heading", { level: 2, name: "Profile as submitted" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Answers" })).toHaveCount(
      0,
    );
    await expect(page.getByText("Tashkent city")).toBeVisible();
    await expect(page.getByText("Uzbek, Russian")).toBeVisible();
    await expect(page.getByText("@dilnoza_k")).toBeVisible();
    await expect(page.getByText("Phone", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "Decide this application" }),
    ).toBeVisible();
  });

  test("explains that an unsent draft has nothing to decide", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/applications/00000000-0000-4000-8000-000000000606");

    await expect(statePanel(page).first()).toContainText("Not sent yet");
    await expect(page.getByText("can no longer be reviewed")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "Decide this application" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "Profile as submitted" }),
    ).toHaveCount(0);
  });

  test("records a decision on an application with a note the volunteer reads", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/applications/00000000-0000-4000-8000-000000000601");

    await expect(
      page.getByRole("heading", { level: 2, name: "Answers" }),
    ).toBeVisible();
    const choice = page.getByRole("group", { name: /^Decision: / });
    await choice.getByRole("button", { name: "Accept" }).click();
    await page.getByLabel("Note to the volunteer").fill("See you on the day.");
    await page.getByRole("button", { name: "Accept", exact: true }).last().click();

    await expect(toast(page)).toContainText("was accepted");
    await expect(page.getByText("See you on the day.")).toBeVisible();
  });

  test("lists only ended events as due and links straight to the roll call", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/attendance");

    const due = page.locator("#due");
    await expect(
      due.getByRole("link", { name: "Winter book drive", exact: true }),
    ).toBeVisible();
    await expect(due).not.toContainText("Reading room weekends");
    await expect(page.locator("#upcoming")).toContainText("Reading room weekends");

    await due
      .getByRole("link", { name: /Take roll call/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/en\/vacancies\/[0-9a-f-]+#roll-call$/);
  });

  test("confirms a batch of accepted volunteers, then corrects one row", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/00000000-0000-4000-8000-000000000401");

    const roster = page.locator("#roll-call");
    await expect(
      roster.getByRole("button", { name: "Confirm selected" }),
    ).toBeVisible();

    await roster.getByLabel("Outcome for everyone selected").selectOption("attended");
    const hours = roster.getByLabel("Hours for everyone selected");
    await expect(hours).toHaveValue("6");
    await hours.fill("");
    await roster.getByRole("button", { name: "Confirm selected" }).click();
    await expect(roster.locator('[data-slot="field-error"]').first()).toContainText(
      "Enter the hours",
    );

    await roster.getByLabel("Hours for everyone selected").fill("4");
    await roster.getByRole("button", { name: "Confirm selected" }).click();
    await expect(roster.locator('[data-slot="form-message"]').first()).toContainText(
      "Attendance was confirmed",
    );

    await page.reload();
    await expect(roster.getByText("Attended").first()).toBeVisible();

    await roster.locator("summary").first().click();
    await roster.getByLabel("Outcome", { exact: true }).first().selectOption("excused");
    await roster.getByRole("button", { name: "Save the decision" }).first().click();
    await expect(roster.locator('[data-slot="form-message"]').first()).toContainText(
      "Attendance was confirmed",
    );
  });

  test("keeps attendance shut until the event has ended", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/00000000-0000-4000-8000-000000000402");

    await expect(page.locator("#roll-call")).toContainText(
      "Attendance is not open yet",
    );
    await expect(page.getByRole("button", { name: "Confirm selected" })).toHaveCount(0);
  });
});

test.describe("volunteers and passwords", () => {
  test("shows password-login state without ever offering the password", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/users");
    await page.getByRole("link", { name: "Dilnoza Karimova" }).first().click();

    await expect(page.getByText("Password last changed")).toBeVisible();
    await expect(
      page.getByText("An existing password can never be read"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /show the password|reveal/i }),
    ).toHaveCount(0);
  });

  test("assigns a replacement temporary password", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/users");
    await page.getByRole("link", { name: "Dilnoza Karimova" }).first().click();

    await page.getByLabel("Temporary password").fill("a-temporary-password");
    await page.getByRole("button", { name: "Assign it" }).click();

    await expect(formMessage(page)).toContainText("temporary password was assigned");
  });

  test("refuses a temporary password the backend would reject", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/users");
    await page.getByRole("link", { name: "Dilnoza Karimova" }).first().click();

    await page.getByLabel("Temporary password").fill("short");
    await page.getByRole("button", { name: "Assign it" }).click();

    await expect(fieldError(page)).toContainText("at least 8 characters");
  });

  test("cannot open a volunteer who never applied to their vacancies", async ({
    page,
  }) => {
    await signedIn(page);
    await page.goto("/en/users/00000000-0000-4000-8000-000000000203");

    await expect(page.getByText("Not found", { exact: true })).toBeVisible();
    await expect(page.getByText("Waiting for the API")).toHaveCount(0);
  });
});

test.describe("the first password change", () => {
  test("blocks the portal until the temporary password is replaced", async ({
    page,
  }) => {
    await signIn(page, TEMPORARY_COORDINATOR);
    await expect(page).toHaveURL(/\/en\/account\/change-password$/);

    await page.goto("/en/vacancies");
    await expect(page).toHaveURL(/\/en\/account\/change-password$/);
    await expect(page.getByText("temporary password").first()).toBeVisible();

    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill("a-brand-new-password");
    await page.getByLabel("Repeat the new password").fill("a-brand-new-password");
    await page.getByRole("button", { name: "Change the password" }).click();

    await expect(formMessage(page)).toContainText("password was changed");
    await page.getByRole("link", { name: "Go to the dashboard" }).click();
    await expect(page).toHaveURL(/\/en\/dashboard$/);
  });

  test("refuses a mismatched confirmation", async ({ page }) => {
    await signIn(page, TEMPORARY_COORDINATOR);
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill("a-brand-new-password");
    await page.getByLabel("Repeat the new password").fill("something-else");
    await page.getByRole("button", { name: "Change the password" }).click();

    await expect(fieldError(page)).toContainText("do not match");
  });
});

test.describe("activity", () => {
  test("lists only what this coordinator did", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/activity");

    await expect(
      page.getByRole("cell", { name: "Vacancy published directly" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "Coordinator created" })).toHaveCount(
      0,
    );
  });

  test("keeps its filters in the URL", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/activity");

    await page.getByLabel("Action").selectOption("opportunity.published");
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page).toHaveURL(/action=opportunity.published/);
    await expect(
      page.getByRole("cell", { name: "Vacancy published directly" }),
    ).toBeVisible();
  });
});

test.describe("every locale and the keyboard", () => {
  for (const locale of LOCALES) {
    test(`signs in and renders the dashboard in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/login`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const email = page.locator("#email");
      const password = page.locator("#password");
      await email.fill(COORDINATOR);
      await password.fill(PASSWORD);
      await page.locator("form button[type=submit]").click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
    });
  }

  test("keeps one h1 per page and a labelled navigation", async ({ page }) => {
    await signedIn(page);

    for (const path of [
      "/en/dashboard",
      "/en/vacancies",
      "/en/applications",
      "/en/users",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveCount(1);
    }

    const narrow = (page.viewportSize()?.width ?? 1280) < 1024;

    if (narrow) {
      await page.getByRole("button", { name: "Open the menu" }).click();
      await expect(
        page.getByRole("navigation", { name: "Portal sections" }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close the menu" }).click();
    } else {
      await expect(
        page.getByRole("navigation", { name: "Portal sections" }).first(),
      ).toBeVisible();
    }
  });

  test("reaches the sign-in form and submits it with the keyboard alone", async ({
    page,
  }) => {
    await page.goto("/en/login");

    await page.locator("#email").focus();
    await page.keyboard.type(COORDINATOR);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/en\/dashboard$/);
  });

  test("gives every form control a label", async ({ page }) => {
    await signedIn(page);
    await page.goto("/en/vacancies/new");

    const unlabelled = await page.evaluate(
      () =>
        [...document.querySelectorAll("input, select, textarea")].filter((element) => {
          if (element instanceof HTMLInputElement && element.type === "hidden")
            return false;
          const id = element.getAttribute("id");
          const labelled =
            (id && document.querySelector(`label[for="${id}"]`)) ||
            element.getAttribute("aria-label") ||
            element.getAttribute("aria-labelledby") ||
            element.closest("label");
          return !labelled;
        }).length,
    );

    expect(unlabelled).toBe(0);
  });

  test("keeps every response out of search indexes", async ({ page }) => {
    const login = await page.request.get("/en/login");
    expect(login.headers()["x-robots-tag"]).toContain("noindex");

    const robots = await page.request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /");
  });
});

test.describe("other coordinators", () => {
  test("sign in to their own scope", async ({ page }) => {
    await signIn(page, OTHER_COORDINATOR);
    await expect(page).toHaveURL(/\/en\/dashboard$/);

    await page.goto("/en/vacancies");
    await expect(page.getByRole("row", { name: /City sports day/ })).toHaveCount(1);
    await expect(page.getByRole("row", { name: /Winter book drive/ })).toHaveCount(0);
  });
});

test.describe("failures a screen has to explain", () => {
  test("offers the password page once the API starts requiring a change", async ({
    page,
  }) => {
    await signedIn(page);
    await page.request.post(`${STUB}/__stub/require-password-change`, {
      data: { email: COORDINATOR },
    });

    await page.goto("/en/vacancies");

    await expect(statePanel(page)).toContainText("Change your password first");
    await statePanel(page).getByRole("link", { name: "Change password" }).click();
    await expect(page).toHaveURL(/\/en\/account\/change-password$/);
  });

  test("explains a required password change the session has not learned about yet", async ({
    page,
  }) => {
    await signedIn(page);
    await page.request.post(`${STUB}/__stub/break`, {
      data: {
        path: "/staff/opportunities",
        status: 403,
        code: "passwordChangeRequired",
      },
    });

    await page.goto("/en/vacancies");

    await expect(statePanel(page)).toContainText("Change your password first");
    await expect(
      statePanel(page).getByRole("link", { name: "Change password" }),
    ).toBeVisible();

    await page.request.post(`${STUB}/__stub/break`, { data: { path: null } });
  });

  test("explains a backend failure with its own code, not a blank panel", async ({
    page,
  }) => {
    await signedIn(page);
    await page.request.post(`${STUB}/__stub/break`, {
      data: {
        path: "/staff/opportunities",
        status: 503,
        code: "adminWorkflowsDisabled",
      },
    });

    await page.goto("/en/vacancies");

    await expect(statePanel(page)).toContainText(
      "The API has these workflows switched off",
    );

    await page.request.post(`${STUB}/__stub/break`, { data: { path: null } });
  });
});

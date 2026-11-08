import { expect, test, type Page } from "@playwright/test";

/** A date a month from now, typed as the masked field expects (ddmmyyyy). */
function futureDate(): { typed: string; shown: string } {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return { typed: `${dd}${mm}${yyyy}`, shown: `${dd}/${mm}/${yyyy}` };
}

const nextYear = String(new Date().getFullYear() + 1);

async function openProvider(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: `Get started with ${name}` }).click();
  const flyout = page.getByRole("dialog");
  await expect(flyout.getByText("Connecting...")).toBeVisible();
  await expect(flyout.getByText("Retrieving data...")).toBeVisible();
  await expect(flyout.getByRole("heading", { name: `${name} Purchase Form` })).toBeVisible();
  return flyout;
}

async function fillCard(page: Page) {
  await page.getByLabel("Card number").fill("1234567891011121");
  await expect(page.getByLabel("Card number")).toHaveValue("1234 5678 9101 1121");
  await page.getByLabel("Expiration date").fill(`12${nextYear}`);
  await page.getByLabel("Name on card").fill("Steven Baker");
  await page.getByLabel("CVV").fill("334");
}

test("lists the providers with the cheapest marked", async ({ page }) => {
  await page.goto("/");
  const rows = page.getByRole("row");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(1)).toContainText("$106.88");
  await expect(rows.nth(2)).toContainText("Cheapest");
  await expect(rows.nth(2)).toContainText("$98.45");
  await expect(page.getByText("Cheapest")).toHaveCount(1);
  await expect(rows.nth(3)).toContainText("Free VPN");
});

test("buys Cloudid end to end and sends feedback", async ({ page }) => {
  const date = futureDate();
  const flyout = await openProvider(page, "Cloudid");
  const continueButton = flyout.getByRole("button", { name: "Continue" });
  await expect(continueButton).toBeDisabled();

  await flyout.getByLabel("First name").fill("Steven");
  await flyout.getByLabel("Surname").fill("Baker");
  await flyout.getByLabel("Address").fill("100 Queen");
  await flyout.getByRole("option", { name: "100 Queen Street #B" }).click();
  await expect(flyout.getByLabel("Address")).toHaveValue("100 Queen Street #B");
  await flyout.getByRole("radio", { name: "30 Gb" }).click();
  await flyout.getByLabel("Contract start date").fill(date.typed);
  await flyout.getByRole("button", { name: "Dedicated IP" }).click();
  await expect(flyout.getByRole("button", { name: "Dedicated IP" })).toHaveAttribute("aria-pressed", "true");
  await expect(continueButton).toBeDisabled();

  // The dropdown works from the keyboard.
  await flyout.getByRole("button", { name: /current Internet provider/ }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(flyout.getByRole("button", { name: /current Internet provider/ })).toContainText("Spark");

  await continueButton.click();
  await expect(flyout.getByRole("heading", { name: "Cloudid Purchase" })).toBeVisible();
  const pay = flyout.getByRole("button", { name: "Confirm & Pay" });
  await expect(pay).toBeDisabled();
  await fillCard(page);

  await expect(flyout.getByRole("note")).toContainText("Demo payment");

  const orderResponse = page.waitForResponse((r) => r.url().endsWith("/api/orders"));
  await pay.click();
  const response = await orderResponse;
  expect(response.status()).toBe(201);
  // Only the last four digits leave the browser; never the full number or CVV.
  const sent = response.request().postDataJSON() as { payment: Record<string, unknown> };
  expect(sent.payment).toEqual({ cardLast4: "1121", expiryMonth: 12, expiryYear: Number(nextYear), cardHolder: "Steven Baker" });
  expect(response.request().postData()).not.toContain("12345678");
  expect(response.request().postData()).not.toContain("334");
  await expect(flyout.getByText(`Your contract starts from ${date.shown}`)).toBeVisible();
  await expect(flyout.getByText("Cloudid specialists will contact you with further steps.")).toBeVisible();

  await flyout.getByRole("button", { name: "Back to Dashboard" }).click();
  const popup = page.getByRole("dialog", { name: "How did it go?" });
  await expect(popup).toBeVisible();
  const submit = popup.getByRole("button", { name: "Submit" });
  await expect(submit).toBeDisabled();
  await popup.getByLabel("Your feedback").fill("I loved the experience overall.");
  const feedbackResponse = page.waitForResponse((r) => r.url().endsWith("/api/feedback"));
  await submit.click();
  expect((await feedbackResponse).status()).toBe(204);
  await expect(popup).toBeHidden();
});

test("Pronete asks about a router instead of services", async ({ page }) => {
  const flyout = await openProvider(page, "Pronete");
  await expect(flyout.getByText("Additional services")).toHaveCount(0);
  await expect(flyout.getByText("What is your current Internet provider?")).toHaveCount(0);

  await flyout.getByLabel("First name").fill("Steven");
  await flyout.getByLabel("Surname").fill("Baker");
  await flyout.getByLabel("Address").fill("100 Queen Street");
  await flyout.getByLabel("Contract start date").fill(futureDate().typed);
  await flyout.getByRole("radio", { name: "Unlimited" }).click();
  await expect(flyout.getByRole("button", { name: "Continue" })).toBeDisabled();
  await flyout.getByRole("radio", { name: "Yes" }).click();
  await expect(flyout.getByRole("radio", { name: "Yes" })).toHaveAttribute("aria-checked", "true");
  await flyout.getByRole("button", { name: "Continue" }).click();

  await fillCard(page);
  await flyout.getByRole("button", { name: "Confirm & Pay" }).click();
  await expect(flyout.getByRole("heading", { name: "Pronete Purchase Confirmed!" })).toBeVisible();

  // Closing with × after a purchase also asks for feedback.
  await flyout.getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByRole("dialog", { name: "How did it go?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("shows field errors and keeps the buttons disabled", async ({ page }) => {
  const flyout = await openProvider(page, "Tebiobio");
  const start = flyout.getByLabel("Contract start date");
  await start.fill("01012020");
  await start.blur();
  await expect(flyout.getByText("Choose today or a later date")).toBeVisible();
  await expect(start).toHaveAttribute("aria-invalid", "true");
  await start.fill("31022030");
  await start.blur();
  await expect(flyout.getByText("Enter a valid date")).toBeVisible();

  const first = flyout.getByLabel("First name");
  await first.focus();
  await first.blur();
  await expect(flyout.getByText("Required").first()).toBeVisible();
  await expect(flyout.getByRole("button", { name: "Continue" })).toBeDisabled();
});

test("every way of closing the fly-out works", async ({ page }) => {
  // Overlay click.
  await openProvider(page, "Cloudid");
  await page.getByTestId("flyout-overlay").click({ position: { x: 100, y: 300 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Escape, while still connecting.
  await page.getByRole("button", { name: "Get started with Cloudid" }).click();
  await expect(page.getByText("Connecting...")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Cancel.
  await page.getByRole("button", { name: "Get started with Tebiobio" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Disconnect ends the session on the server. No order, so no feedback popup.
  await page.getByRole("button", { name: "Get started with Pronete" }).click();
  await expect(page.getByRole("heading", { name: "Pronete Purchase Form" })).toBeVisible();
  const disconnect = page.waitForResponse((r) => r.request().method() === "DELETE");
  await page.getByRole("button", { name: "Disconnect" }).click();
  expect((await disconnect).status()).toBe(204);
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Focus returns to the button that opened it.
  await expect(page.getByRole("button", { name: "Get started with Pronete" })).toBeFocused();
});

test("fits a phone screen and scrolls the table sideways @mobile", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Cheapest")).toBeVisible();
  const pageOverflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(pageOverflows).toBe(false);
  const tableScrolls = await page
    .getByRole("region", { name: "Compare internet providers" })
    .evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(tableScrolls).toBe(true);

  await page.getByRole("button", { name: "Get started with Cloudid" }).click();
  await expect(page.getByRole("heading", { name: "Cloudid Purchase Form" })).toBeVisible();
  const flyoutWidth = await page.getByRole("dialog").evaluate((el) => el.getBoundingClientRect().width);
  expect(flyoutWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
});

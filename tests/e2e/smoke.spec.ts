import { expect, test } from "@playwright/test";

// These run against a dev server with valid .env.local values. They do not need a Buffer account.
// Full-flow tests (register, create campaign, audit, correction) need a real Supabase project;
// see docs/TESTING.md for the manual checklist and the optional authenticated test below.

test("landing page explains the product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("wrong discount");
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
});

test("protected routes redirect to login", async ({ page }) => {
  for (const path of ["/dashboard", "/campaigns", "/audits", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
});

test("login form validates short passwords before calling the server", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("at least 8 characters")).toBeVisible();
});

test("API rejects unauthenticated and cross-origin requests", async ({ request }) => {
  expect((await request.get("/api/buffer/channels")).status()).toBe(401);
  const res = await request.post("/api/campaigns", { data: { name: "x" }, headers: { origin: "https://evil.example" } });
  expect([401, 403]).toContain(res.status());
});

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test.describe("authenticated flow (set E2E_EMAIL and E2E_PASSWORD to a confirmed test user)", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "no test user configured");

  test("demo campaign: audit finds the planted errors", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_EMAIL!);
    await page.getByLabel("Password").fill(E2E_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole("button", { name: "Load demo campaign" }).first().click();
    await expect(page.getByText("Demo data").first()).toBeVisible();
    await page.getByRole("button", { name: "Run audit" }).click();
    await expect(page).toHaveURL(/\/audits\//);
    await expect(page.getByText("Prohibited phrase").first()).toBeVisible();
    await expect(page.getByText("Discount").first()).toBeVisible();
  });
});

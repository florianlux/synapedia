import { test, expect } from "@playwright/test";

/**
 * Smoke tests: verify every public page loads without errors (HTTP 200)
 * and renders essential content.
 */

const publicRoutes = [
  { path: "/", text: "Synapedia" },
  { path: "/articles", text: "Artikel" },
  { path: "/brain", text: "Brain Explorer" },
  { path: "/interactions", text: "Interaktions-Checker" },
  { path: "/compare", text: "Substanz-Vergleich" },
  { path: "/glossary", text: "Glossar" },
  { path: "/categories", text: "Kategorien" },
  { path: "/neuro", text: "NeuroMap" },
  { path: "/safer-use", text: "Safer-Use" },
  { path: "/hilfe", text: "Hilfe" },
  { path: "/hilfe/notfall", text: "Notfall" },
  { path: "/hilfe/beratung", text: "Beratung" },
  { path: "/hilfe/selbsttest", text: "Selbstreflexions-Test" },
  { path: "/feed", text: "Feed" },
  { path: "/auth/login", text: "Anmelden" },
  { path: "/auth/signup", text: "Registrieren" },
  { path: "/register", text: "Registrieren" },
];

test.describe("Smoke tests – public routes", () => {
  for (const { path, text } of publicRoutes) {
    test(`${path} loads successfully and contains "${text}"`, async ({
      page,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toContainText(text);
    });
  }
});

test.describe("Smoke tests – critical UI elements", () => {
  test("homepage shows header and footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("homepage displays article cards in demo mode", async ({ page }) => {
    await page.goto("/");
    // Demo mode should show at least one article link
    const articleLinks = page.locator('a[href^="/articles/"]');
    await expect(articleLinks.first()).toBeVisible();
  });

  test("search bar is present on homepage", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByPlaceholder(/such/i)
    ).toBeVisible();
  });

  test("glossary page shows glossary entries", async ({ page }) => {
    await page.goto("/glossary");
    // Should have at least one glossary entry link
    const entries = page.locator('a[href^="/glossary/"]');
    await expect(entries.first()).toBeVisible();
  });

  test("brain explorer loads with tabs", async ({ page }) => {
    await page.goto("/brain");
    await expect(page.getByRole("tab").first()).toBeVisible();
  });

  test("interactions page is functional", async ({ page }) => {
    await page.goto("/interactions");
    await expect(page.locator("body")).toContainText("Interaktion");
  });

  test("no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(1000);
    // Filter out known benign errors (e.g., favicon, Supabase connection in demo mode)
    const realErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("supabase") &&
        !e.includes("Failed to fetch")
    );
    expect(realErrors).toEqual([]);
  });
});

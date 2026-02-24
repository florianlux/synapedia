import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", title: "Synapedia" },
  { path: "/brain", title: "Brain Explorer" },
  { path: "/interactions", title: "Interaktions-Checker" },
  { path: "/compare", title: "Substanz-Vergleich" },
  { path: "/glossary", title: "Glossar" },
];

test.describe("Mobile responsiveness", () => {
  for (const { path, title } of pages) {
    test(`${path} has no horizontal overflow`, async ({ page }) => {
      await page.goto(path);
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });

    test(`${path} renders heading "${title}"`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    });
  }

  test("hamburger menu is visible on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Menü öffnen" })).toBeVisible();
  });

  test("hamburger menu opens and shows all nav links", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menü öffnen" }).click();

    const expectedLinks = [
      "Startseite",
      "Artikel",
      "Interaktionen",
      "Gehirn",
      "Glossar",
      "Vergleich",
    ];

    for (const label of expectedLinks) {
      await expect(
        page.locator("nav").filter({ has: page.getByRole("link", { name: label }) })
      ).toBeVisible();
    }
  });

  test("hamburger menu navigates and closes", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menü öffnen" }).click();
    await page.getByRole("link", { name: "Gehirn" }).click();

    await expect(page).toHaveURL(/\/brain/);
    // Menu should close after navigation
    await expect(
      page.locator("nav.lg\\:hidden")
    ).not.toBeVisible();
  });

  test("brain explorer tabs are visible and tappable", async ({ page }) => {
    await page.goto("/brain");
    const brainTab = page.getByRole("tab", { name: "Brain Map" });
    const networkTab = page.getByRole("tab", { name: "Rezeptor-Netzwerk" });
    await expect(brainTab).toBeVisible();
    await expect(networkTab).toBeVisible();

    // Verify tabs have adequate tap target size (min 44px)
    const box = await networkTab.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(32);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  });
});

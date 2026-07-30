import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };

const PANEL = '[data-slot="thumbnails-panel"]';
const TOGGLE = '[data-slot="thumbnails-toggle"]';

// Review shots land next to the other Playwright artifacts (gitignored). This is
// UI work, so the assertions below are not the whole story -- someone still has
// to look at the panel. Shooting from the tests that already navigate to each
// state avoids a second harness that would drift from the feature.
const SHOTS = "tests/test-results/screenshots";

async function shoot(page: import("@playwright/test").Page, name: string) {
    // Thumbnail cells load lazily (IntersectionObserver, see thumbnail-cell/),
    // so give them a beat or the shot catches empty cells.
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(USER.email);
    await page.locator('input[type="password"]').fill(USER.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
    // The video list loads after the client-side auth guard resolves.
    await expect(page.locator(TOGGLE)).toBeVisible();
}

test.describe("thumbnails float panel", () => {
    test("is closed until the header button opens it", async ({ page }) => {
        await login(page);

        await expect(page.locator(PANEL)).toHaveCount(0);
        await shoot(page, "01-panel-closed");

        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();
        await shoot(page, "02-panel-open-beside-tree");
    });

    test("stays open while the tree is used, and Escape closes it", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        // The tree drives what the panel shows, so clicking in the sidebar must
        // not dismiss it — only clicks outside the sidebar do.
        await page.locator('[data-slot="sidebar"]').click({ position: { x: 10, y: 200 } });
        await expect(page.locator(PANEL)).toBeVisible();
        await shoot(page, "03-tree-usable-while-open");

        await page.keyboard.press("Escape");
        await expect(page.locator(PANEL)).toHaveCount(0);
    });

    test("does not push the player area aside", async ({ page }) => {
        await login(page);

        const player = page.getByText("Please select a video");
        const before = await player.boundingBox();

        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        // The panel overlays; it must not reflow the main layout.
        expect(await player.boundingBox()).toEqual(before);
    });
});

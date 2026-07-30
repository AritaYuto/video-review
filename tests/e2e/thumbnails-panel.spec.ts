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

    test("closes on a click in the review area", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        // The other half of the dismissal rule. Click in viewport coordinates,
        // clear of the panel's right edge: review/layout.tsx is a `w-screen` grid
        // that starts after the sidebar and so overflows the viewport, which
        // makes element-relative positions land off-screen.
        // Click in viewport coordinates, to the right of the panel's edge. The
        // sidebar is 26rem and the panel 46rem, so only the last ~128px of a
        // 1280 viewport is review area that the panel does not cover; element-
        // relative positions are no good here because review/layout.tsx sizes
        // itself with `w-screen` while sitting after the sidebar.
        const panelBox = await page.locator(PANEL).boundingBox();
        await page.mouse.click(panelBox!.x + panelBox!.width + 40, 400);
        await expect(page.locator(PANEL)).toHaveCount(0);
    });

    test("survives the filter popover, which renders in a portal", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        // Radix renders popovers at the document root, outside the sidebar. Using
        // the date filter while comparing frames is the point of a panel that
        // sits beside the tree, so neither opening it nor clicking inside it may
        // be read as an outside click.
        await page.locator('[data-slot="sidebar"] [data-slot="popover-trigger"]').first().click();
        const popover = page.locator('[data-slot="popover-content"]');
        await expect(popover).toBeVisible();
        await expect(page.locator(PANEL)).toBeVisible();

        await popover.click({ position: { x: 5, y: 5 } });
        await expect(page.locator(PANEL)).toBeVisible();

        // Escape belongs to the topmost layer: it dismisses the popover only.
        await page.keyboard.press("Escape");
        await expect(popover).toHaveCount(0);
        await expect(page.locator(PANEL)).toBeVisible();

        // With the popover gone, Escape reaches the panel.
        await page.keyboard.press("Escape");
        await expect(page.locator(PANEL)).toHaveCount(0);
    });

    test("closes when a video is picked, and reopens where it left off", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();

        // Picking a video is the primary close path (PLAN.md task 4).
        await page.locator(PANEL).getByText("Archived Playtest", { exact: false }).first().click();
        await expect(page.locator(PANEL)).toHaveCount(0);
        await page.waitForURL(/\/video-review\/review\/[0-9a-f-]+/);

        // The zoom level and the resolved-thumbnail cache outlive the unmount,
        // so reopening is not a cold start.
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        // Toggling the header button again closes it.
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toHaveCount(0);
    });

    test("flags videos with unread comments", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        // The panel reads the same unread list the tree does, so seeded videos
        // with unread comments must be badged here too. Cards all render up
        // front (only the thumbnail image is lazy), so the badge exists in the
        // DOM even for rows far down the grid -- scroll one into view to make
        // the shot show what the assertion checks.
        const badged = page.locator(PANEL).getByText("NEW").first();
        await expect(badged).toBeVisible();
        await badged.scrollIntoViewIfNeeded();
        await shoot(page, "04-unread-badge");
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

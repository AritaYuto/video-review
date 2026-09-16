import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };

const PANEL = '[data-slot="thumbnails-panel"]';
const TOGGLE = '[data-slot="thumbnails-toggle"]';

const SHOTS = "tests/test-results/screenshots";

async function shoot(page: import("@playwright/test").Page, name: string) {
    // Cells load lazily; wait so the shot is not empty.
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

        // Viewport coordinates: review/layout.tsx is w-screen after the sidebar, so
        // element-relative positions land off-screen.
        const panelBox = await page.locator(PANEL).boundingBox();
        await page.mouse.click(panelBox!.x + panelBox!.width + 40, 400);
        await expect(page.locator(PANEL)).toHaveCount(0);
    });

    test("survives the filter popover, which renders in a portal", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        await page.locator('[data-slot="sidebar"] [data-slot="popover-trigger"]').first().click();
        const popover = page.locator('[data-slot="popover-content"]');
        await expect(popover).toBeVisible();
        await expect(page.locator(PANEL)).toBeVisible();

        await popover.click({ position: { x: 5, y: 5 } });
        await expect(page.locator(PANEL)).toBeVisible();

        // Escape goes to the topmost layer: first press closes the popover, second the panel.
        await page.keyboard.press("Escape");
        await expect(popover).toHaveCount(0);
        await expect(page.locator(PANEL)).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(page.locator(PANEL)).toHaveCount(0);
    });

    test("closes when a video is picked, and reopens from the toggle", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();

        await page.locator(PANEL).getByRole("button", { name: /Archived Playtest/ }).first().click();
        await expect(page.locator(PANEL)).toHaveCount(0);
        await page.waitForURL(/\/video-review\/review\/[0-9a-f-]+/);

        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toHaveCount(0);
    });

    test("flags videos with unread comments", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        // Cards render up front (only the image is lazy); scroll the badge into the shot.
        const badged = page.locator(PANEL).getByText("NEW").first();
        await expect(badged).toBeVisible();
        await badged.scrollIntoViewIfNeeded();
        await shoot(page, "04-unread-badge");
    });

    test("keeps the shelf to pictures and opens the detail card on hover", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        const card = page.locator(`${PANEL} [data-slot="thumbnail-card"]`).first();
        const title = (await card.getAttribute("aria-label"))!;
        expect(title).toMatch(/Archived Playtest/);
        await expect(card).not.toContainText(title);
        await shoot(page, "05-shelf-at-rest");

        await card.hover();
        const detail = page.locator('[data-slot="thumbnail-detail"]');
        await expect(detail).toBeVisible();
        await expect(detail).toContainText(title);
        await expect(detail).toContainText(/v\d+/);
        await expect(detail).toContainText("01_prototype");
        const cardBox = await card.boundingBox();
        const detailBox = await detail.boundingBox();
        expect(detailBox!.x).toBeGreaterThanOrEqual(cardBox!.x + cardBox!.width);
        await shoot(page, "06-detail-card-on-hover");

        // Escape goes to the hover card, not the panel.
        await page.keyboard.press("Escape");
        await expect(detail).toHaveCount(0);
        await expect(page.locator(PANEL)).toBeVisible();

        // Leave the cell first: hovering the same spot fires no pointerenter.
        await page.mouse.move(0, 0);
        await card.hover();
        await detail.click();
        await expect(page.locator(PANEL)).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 2 })).toContainText(title);
    });

    test.describe("with touch", () => {
        test.use({ hasTouch: true });

        test("a tap on a cell still picks the video", async ({ page }) => {
            await login(page);
            await page.locator(TOGGLE).click();

            // HoverCardTrigger cancels the click synthesized from touchstart.
            const card = page.locator(`${PANEL} [data-slot="thumbnail-card"]`).first();
            const title = (await card.getAttribute("aria-label"))!;
            await card.tap();
            await expect(page.locator(PANEL)).toHaveCount(0);
            await expect(page.getByRole("heading", { level: 2 })).toContainText(title);
        });
    });

    test("does not push the player area aside", async ({ page }) => {
        await login(page);

        const player = page.getByText("Please select a video");
        const before = await player.boundingBox();

        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        expect(await player.boundingBox()).toEqual(before);
    });
});

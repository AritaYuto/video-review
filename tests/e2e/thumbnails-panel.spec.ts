import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Seeded admin user (see prisma/seed.ts).
const USER = { email: "Bocchi@example.com", password: "pass123" };

const PANEL = '[data-slot="thumbnails-panel"]';
const TOGGLE = '[data-slot="thumbnails-toggle"]';

const SHOTS = "tests/test-results/screenshots";

// Every seeded revision points at videos/demo/rev_001.mp4 (prisma/seed.ts). The preview
// width is inlined at build time from NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS, so the
// spec needs the same value in .env.test.
const PRESETS = (process.env.NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS ?? "").split(",").map(Number).filter(w => w > 0);
const VARIANT_KEY = PRESETS.length > 0 ? `videos/demo/rev_001_${Math.min(...PRESETS)}p.mp4` : undefined;
const LOCAL_ROOT = process.env.VIDEO_REVIEW_STORAGE === "local" ? process.env.VIDEO_REVIEW_LOCAL_ROOTDIR : undefined;
const VARIANT_PATH = VARIANT_KEY && LOCAL_ROOT ? path.join(LOCAL_ROOT, VARIANT_KEY) : undefined;

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
    // A run killed before afterAll would leave the variant behind and break the fallback test.
    test.beforeAll(() => { if (VARIANT_PATH) fs.rmSync(VARIANT_PATH, { force: true }); });

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

    test("groups cells by folder and follows the list filter", async ({ page }) => {
        await login(page);
        await page.locator(TOGGLE).click();
        await expect(page.locator(PANEL)).toBeVisible();

        const titles = page.locator(`${PANEL} [data-slot="thumbnail-group-title"]`);
        await expect(titles.first()).toContainText("01_prototype");
        expect(await titles.count()).toBeGreaterThan(1);
        // Each heading's count matches the cards under it.
        for (const group of await page.locator(`${PANEL} [data-slot="thumbnail-group"]`).all()) {
            const shown = Number((await group.locator('[data-slot="thumbnail-group-title"]').innerText()).trim().split(/\s+/).pop());
            expect(await group.locator('[data-slot="thumbnail-card"]').count()).toBe(shown);
        }
        await shoot(page, "08-grouped-by-folder");

        // The panel shows the same list the tree does, so the text filter narrows both.
        // The seed has exactly #010-#019 and no deleted rows in this batch.
        await page.getByPlaceholder("Filter video...").fill("Archived Playtest #01");
        const cards = page.locator(`${PANEL} [data-slot="thumbnail-card"]`);
        await expect(cards).toHaveCount(10);
        for (const label of await cards.evaluateAll(els => els.map(el => el.getAttribute("aria-label")))) {
            expect(label).toMatch(/Archived Playtest #01\d/);
        }
        await shoot(page, "09-grouped-and-filtered");
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

        const variantResolved = VARIANT_KEY
            ? page.waitForResponse(r => r.url().includes(encodeURI(VARIANT_KEY)))
            : undefined;
        await card.hover();
        const detail = page.locator('[data-slot="thumbnail-detail"]');
        await expect(detail).toBeVisible();
        await expect(detail).toContainText(title);
        await expect(detail).toContainText(/v\d+/);
        await expect(detail).toContainText("01_prototype");
        const cardBox = await card.boundingBox();
        const detailBox = await detail.boundingBox();
        expect(detailBox!.x).toBeGreaterThanOrEqual(cardBox!.x + cardBox!.width);
        // The seed has no media files, so the preview falls back to the still image.
        if (variantResolved) expect((await variantResolved).status()).toBe(404);
        await expect(detail.locator('[data-slot="thumbnail-preview"]')).toHaveCount(0);
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

    test.describe("with a preview variant in storage", () => {
        test.skip(!VARIANT_PATH, "needs local storage and NEXT_PUBLIC_VIDEO_REVIEW_RESOLUTION_PRESETS in .env.test");

        test.beforeAll(() => {
            fs.mkdirSync(path.dirname(VARIANT_PATH!), { recursive: true });
            // 3 s fade to orange, 64x36, VP9 (Playwright's Chromium has no H.264):
            // ffmpeg -f lavfi -i "color=c=#ff8800:s=64x36:r=10:d=3,fade=t=in:st=0:d=3" -pix_fmt yuv420p -c:v libvpx-vp9 -b:v 50k -movflags frag_keyframe+empty_moov -f mp4 preview.mp4
            fs.copyFileSync(path.join(import.meta.dirname, "fixtures", "preview.mp4"), VARIANT_PATH!);
        });
        test.afterAll(() => fs.rmSync(VARIANT_PATH!, { force: true }));

        test("plays a muted preview in the detail card and shows the duration", async ({ page }) => {
            await login(page);
            await page.locator(TOGGLE).click();
            await expect(page.locator(PANEL)).toBeVisible();
            await page.locator(`${PANEL} [data-slot="thumbnail-card"]`).first().hover();

            const preview = page.locator('[data-slot="thumbnail-preview"]');
            await expect(preview).toBeVisible();
            await expect.poll(() => preview.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
            expect(await preview.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
            expect(await preview.evaluate((v: HTMLVideoElement) => v.loop)).toBe(true);
            expect(await preview.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
            await expect(page.locator('[data-slot="thumbnail-duration"]')).toHaveText("00:03");
            await shoot(page, "07-detail-card-preview-playing");
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

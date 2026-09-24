import { test, expect } from "@playwright/test";

// Seeded admin user (see prisma/seed.ts).
const ADMIN = { email: "Bocchi@example.com", password: "pass123" };

// The gear button lives in the sidebar footer; the filter popover in the sidebar body uses the same slot.
const GEAR = '[data-slot="sidebar-footer"] [data-slot="popover-trigger"]';

async function loginAsAdmin(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByRole("tab", { name: "Email & Password" }).click();
    await page.locator('input[type="email"]').fill(ADMIN.email);
    await page.locator('input[type="password"]').fill(ADMIN.password);
    await page.locator('input[type="password"]').press("Enter");
    await page.waitForURL(/\/video-review\/review\b/);
    await expect(page.locator(GEAR)).toBeVisible();
}

async function loginAsGuest(page: import("@playwright/test").Page) {
    await page.goto("/login");
    // The default tab is configurable, so pick "Guest" explicitly.
    await page.getByRole("tab", { name: "Guest" }).click();
    await page.locator("#displayName").fill("E2E Guest");
    await page.getByRole("button", { name: "Login" }).click();
    await page.waitForURL(/\/video-review\/review\b/);
    await expect(page.locator(GEAR)).toBeVisible();
}

async function openSettings(page: import("@playwright/test").Page) {
    await page.locator(GEAR).click();
    const popover = page.locator('[data-slot="popover-content"]');
    await expect(popover).toBeVisible();
    // The rows appear once the popover's own auth check resolves.
    await expect(popover.getByText("Logout")).toBeVisible();
    return popover;
}

// A retry runs against the same seeded DB, so each attempt takes a different video.
function seededTitle(base: number) {
    return `Feature Review #${String(base + 9 * test.info().retry).padStart(3, "0")}`;
}

test.describe("admin settings dialog", () => {
    test("an admin opens it from the settings popover and switches sections", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);

        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading", { name: "Administration" })).toBeVisible();
        for (const name of ["Users", "API Token", "Integrations", "Videos"]) {
            await expect(dialog.getByRole("tab", { name })).toBeVisible();
        }

        await dialog.getByRole("tab", { name: "Videos" }).click();
        await expect(dialog.getByRole("heading", { name: "Videos" })).toBeVisible();
        await expect(dialog.getByRole("heading", { name: "Users" })).toHaveCount(0);
    });

    test("an admin lists users, creates a viewer and promotes them", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog.getByRole("row", { name: /Bocchi/ })).toBeVisible();

        // A retry runs against the same seeded DB, so neither field may collide with the first attempt.
        const name = `E2E Viewer ${test.info().retry}`;
        const email = `e2e-viewer-${test.info().retry}@example.com`;
        await dialog.getByLabel("Display name").fill(name);
        await dialog.getByLabel("Email").fill(email);
        await dialog.getByLabel("Password").fill("viewer-pass");
        await dialog.getByRole("button", { name: "Create" }).click();

        const row = dialog.getByRole("row", { name: email });
        await expect(row).toBeVisible();
        await expect(row.getByRole("combobox")).toHaveText("Viewer");

        // The select updates optimistically, so the server response is what proves the promotion.
        const patched = page.waitForResponse(r => r.url().endsWith("/admin/role-update"));
        await row.getByRole("combobox").click();
        await page.getByRole("option", { name: "Admin" }).click();
        expect((await patched).status()).toBe(200);
        await expect(row.getByRole("combobox")).toHaveText("Admin");
    });

    test("an admin finds a video with the filter", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Videos" }).click();

        // Lower case on purpose: an admin should not have to match the title's case.
        await dialog.getByPlaceholder("Filter by title or folder...").fill("archived playtest #100");
        await expect(dialog.getByRole("row", { name: /Archived Playtest #100/ })).toBeVisible();
        await expect(dialog.getByRole("row", { name: /Archived Playtest #101/ })).toHaveCount(0);
    });

    test("a single-revision video offers no disclosure", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Videos" }).click();

        // Every seeded video has one revision, whose row would only repeat what the video row says.
        const title = seededTitle(3);
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        await expect(dialog.getByRole("row", { name: new RegExp(title) })).toBeVisible();
        await expect(dialog.getByRole("button", { name: `Show the revisions of ${title}` })).toHaveCount(0);
    });

    test("deleting every revision hides the video, and the word must be typed", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Videos" }).click();

        const title = seededTitle(9);
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        await dialog.getByRole("button", { name: `Delete every revision of ${title}` }).click();

        const confirm = page.getByRole("dialog").filter({ hasText: "Type Delete to confirm" });
        const submit = confirm.getByRole("button", { name: "Delete", exact: true });
        await expect(submit).toBeDisabled();

        // The word has to be selectable, so it can be copied rather than retyped.
        await confirm.locator("code").click();
        expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("Delete");

        await confirm.getByLabel("Type Delete to confirm").fill("Delet");
        await expect(submit).toBeDisabled();
        await confirm.getByLabel("Type Delete to confirm").fill("delete");
        await expect(submit).toBeDisabled();
        await confirm.getByLabel("Type Delete to confirm").fill("Delete");
        await expect(submit).toBeEnabled();

        await submit.click();
        await expect(confirm).toHaveCount(0);
        // The test storage holds no real files, so purging reports partial success.
        await expect(dialog.getByText("Some files could not be removed and are still in storage.")).toBeVisible();

        // Losing its last revision takes the video out of the list, which a refetch proves.
        await expect(dialog.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
        await page.reload();
        const reopened = await openSettings(page);
        await reopened.getByRole("button", { name: "Administration" }).click();
        await dialog.getByRole("tab", { name: "Videos" }).click();
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        await expect(dialog.getByText("No video matches the filter.")).toBeVisible();
    });

    test("a guest does not see the entry", async ({ page }) => {
        await loginAsGuest(page);
        const popover = await openSettings(page);

        await expect(popover.getByRole("button", { name: "Administration" })).toHaveCount(0);
    });
});

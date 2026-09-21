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

// Rows are identified by their label text, so the labels must stay unique.
function statusValue(dialog: import("@playwright/test").Locator, label: string) {
    return dialog.locator("dl > div").filter({ hasText: label }).locator("dd");
}

test.describe("admin settings dialog", () => {
    test("an admin opens it from the settings popover and switches sections", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);

        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading", { name: "Administration" })).toBeVisible();
        for (const name of ["Users", "API Token", "Integrations", "Maintenance"]) {
            await expect(dialog.getByRole("tab", { name })).toBeVisible();
        }

        await dialog.getByRole("tab", { name: "Maintenance" }).click();
        await expect(dialog.getByRole("heading", { name: "Maintenance" })).toBeVisible();
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

    test("an admin sees the system status under Maintenance", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Maintenance" }).click();

        // The seeded DB has an admin and .env.test provides the JWT secret, so every flag is satisfied.
        for (const label of ["Admin user", "JWT secret", "Initialized"]) {
            await expect(statusValue(dialog, label)).toHaveText("Yes");
        }
    });

    test("an unsatisfied status flag is reported per row", async ({ page }) => {
        await loginAsAdmin(page);
        // Stub the route so the unsatisfied side of the mapping is exercised without breaking the DB.
        await page.route("**/admin/maintenance/status", route => route.fulfill({
            json: { hasAdmin: true, hasJwt: false, initialized: false },
        }));

        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Maintenance" }).click();

        await expect(statusValue(dialog, "Admin user")).toHaveText("Yes");
        await expect(statusValue(dialog, "JWT secret")).toHaveText("No");
        await expect(statusValue(dialog, "Initialized")).toHaveText("No");
    });

    test("an admin browses and filters the trash", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Maintenance" }).click();

        // The seed marks every "Discarded" video as deleted, so the trash is never empty here.
        await expect(dialog.getByRole("row", { name: /Discarded #001/ })).toBeVisible();

        await dialog.getByPlaceholder("Filter by title or folder...").fill("Discarded #007");
        await expect(dialog.getByRole("row", { name: /Discarded #007/ })).toBeVisible();
        await expect(dialog.getByRole("row", { name: /Discarded #001/ })).toHaveCount(0);
    });

    test("the trash filter matches the folder and ignores case", async ({ page }) => {
        await loginAsAdmin(page);
        // Stubbed so the two rows differ only in the fields the filter reads.
        await page.route("**/admin/maintenance/trash", route => route.fulfill({
            json: {
                videos: [
                    { id: "v1", title: "Alpha", folderKey: "01_prototype", latestUpdatedAt: "2026-03-01T00:00:00.000Z", revisions: [1] },
                    { id: "v2", title: "Beta", folderKey: "06_ui", latestUpdatedAt: "2026-03-02T00:00:00.000Z", revisions: [1, 2] },
                ],
            },
        }));

        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Maintenance" }).click();
        const filter = dialog.getByPlaceholder("Filter by title or folder...");

        await filter.fill("01_PROTOTYPE");
        await expect(dialog.getByRole("row", { name: /Alpha/ })).toBeVisible();
        await expect(dialog.getByRole("row", { name: /Beta/ })).toHaveCount(0);

        // An empty result is not an empty trash, and the two say different things.
        await filter.fill("no such video");
        await expect(dialog.getByText("No video matches the filter.")).toBeVisible();
        await expect(dialog.getByText("Nothing in the trash.")).toHaveCount(0);
    });

    test("a guest does not see the entry", async ({ page }) => {
        await loginAsGuest(page);
        const popover = await openSettings(page);

        await expect(popover.getByRole("button", { name: "Administration" })).toHaveCount(0);
    });
});

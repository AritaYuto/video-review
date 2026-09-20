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

    test("a guest does not see the entry", async ({ page }) => {
        await loginAsGuest(page);
        const popover = await openSettings(page);

        await expect(popover.getByRole("button", { name: "Administration" })).toHaveCount(0);
    });
});

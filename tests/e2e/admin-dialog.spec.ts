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

    test("an admin restores a video out of the trash", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Maintenance" }).click();

        // A retry runs against the same seeded DB, so each attempt restores a different video.
        // Counting down from #050 keeps clear of the videos the filter test expects to find.
        const title = `Discarded #${String(50 - test.info().retry).padStart(3, "0")}`;
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        const row = dialog.getByRole("row", { name: new RegExp(title) });
        await expect(row).toBeVisible();

        const restored = page.waitForResponse(r => r.url().endsWith("/admin/maintenance/video/delete"));
        await row.getByRole("button", { name: "Restore" }).click();
        expect((await restored).status()).toBe(200);
        await expect(row).toHaveCount(0);

        // Reopening refetches: proves the video really left the trash, not just the local list.
        await page.reload();
        const reopened = await openSettings(page);
        await reopened.getByRole("button", { name: "Administration" }).click();
        await dialog.getByRole("tab", { name: "Maintenance" }).click();
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        await expect(dialog.getByText("No video matches the filter.")).toBeVisible();
    });

    test("physical delete is gated behind typing Delete", async ({ page }) => {
        await loginAsAdmin(page);
        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Maintenance" }).click();

        // A retry runs against the same seeded DB, so each attempt purges a different video.
        // Counting up from #040 keeps clear of both the restore test and the filter test's #001.
        const title = `Discarded #${String(40 + test.info().retry).padStart(3, "0")}`;
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        const row = dialog.getByRole("row", { name: new RegExp(title) });
        await row.getByRole("button", { name: "Delete", exact: true }).click();

        const confirm = page.getByRole("dialog").filter({ hasText: "Type Delete to confirm" });
        const submit = confirm.getByRole("button", { name: "Delete permanently" });
        await expect(submit).toBeDisabled();

        await confirm.getByLabel("Type Delete to confirm").fill("Delet");
        await expect(submit).toBeDisabled();
        await confirm.getByLabel("Type Delete to confirm").fill("delete");
        await expect(submit).toBeDisabled();
        await confirm.getByLabel("Type Delete to confirm").fill("Delete");
        await expect(submit).toBeEnabled();

        const purged = page.waitForResponse(r => r.url().endsWith("/admin/maintenance/video/purge"));
        await submit.click();
        // Test storage holds no files, so purge answers 207.
        expect((await purged).status()).toBe(207);
        await expect(dialog.getByText(new RegExp(`${title}.*could not be removed`))).toBeVisible();

        // Reopening refetches: proves the revisions really went, not just the local list.
        await page.reload();
        const reopened = await openSettings(page);
        await reopened.getByRole("button", { name: "Administration" }).click();
        await dialog.getByRole("tab", { name: "Maintenance" }).click();
        await dialog.getByPlaceholder("Filter by title or folder...").fill(title);
        await expect(row.getByRole("cell", { name: "0", exact: true })).toBeVisible();
        await expect(row.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
    });

    test("physical delete purges every revision and keeps going after a 207", async ({ page }) => {
        await loginAsAdmin(page);
        // Seeded videos have a single revision, so the bundling only shows up against a stub.
        await page.route("**/admin/maintenance/trash", route => route.fulfill({
            json: {
                videos: [
                    { id: "v1", title: "Three Revisions", folderKey: "01_prototype", latestUpdatedAt: "2026-03-01T00:00:00.000Z", revisions: [1, 2, 3] },
                ],
            },
        }));
        const purged: number[] = [];
        await page.route("**/admin/maintenance/video/purge", async route => {
            const body = route.request().postDataJSON() as { revision: string };
            const revision = Number(body.revision);
            purged.push(revision);
            // The middle revision keeps its file: the loop must carry on to the last one.
            await route.fulfill(revision === 2
                ? { status: 207, json: { warning: "files", videoId: "v1", revision } }
                : { json: { success: true, videoId: "v1", revision } });
        });

        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Maintenance" }).click();
        const row = dialog.getByRole("row", { name: /Three Revisions/ });
        await row.getByRole("button", { name: "Delete", exact: true }).click();

        const confirm = page.getByRole("dialog").filter({ hasText: "Type Delete to confirm" });
        await confirm.getByLabel("Type Delete to confirm").fill("Delete");
        await confirm.getByRole("button", { name: "Delete permanently" }).click();

        await expect(row.getByRole("cell", { name: "0", exact: true })).toBeVisible();
        expect(purged).toEqual([1, 2, 3]);
        await expect(dialog.getByText(/Three Revisions.*could not be removed/)).toBeVisible();
    });

    test("a purge that fails mid-way keeps the revisions it did not reach", async ({ page }) => {
        await loginAsAdmin(page);
        await page.route("**/admin/maintenance/trash", route => route.fulfill({
            json: {
                videos: [
                    { id: "v1", title: "Three Revisions", folderKey: "01_prototype", latestUpdatedAt: "2026-03-01T00:00:00.000Z", revisions: [1, 2, 3] },
                ],
            },
        }));
        const purged: number[] = [];
        await page.route("**/admin/maintenance/video/purge", async route => {
            const revision = Number((route.request().postDataJSON() as { revision: string }).revision);
            purged.push(revision);
            await route.fulfill(revision === 2
                ? { status: 500, json: { error: "boom" } }
                : { json: { success: true, videoId: "v1", revision } });
        });

        const popover = await openSettings(page);
        await popover.getByRole("button", { name: "Administration" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Maintenance" }).click();
        const row = dialog.getByRole("row", { name: /Three Revisions/ });

        async function purgeOnce() {
            await row.getByRole("button", { name: "Delete", exact: true }).click();
            const confirm = page.getByRole("dialog").filter({ hasText: "Type Delete to confirm" });
            await confirm.getByLabel("Type Delete to confirm").fill("Delete");
            await confirm.getByRole("button", { name: "Delete permanently" }).click();
        }

        await purgeOnce();
        await expect(dialog.getByText(/Failed to delete the files/)).toBeVisible();
        // Revision 1 went through, so only 2 and 3 are left to try again.
        await expect(row.getByRole("cell", { name: "2", exact: true })).toBeVisible();
        expect(purged).toEqual([1, 2]);

        await purgeOnce();
        expect(purged).toEqual([1, 2, 2]);
    });

    test("a guest does not see the entry", async ({ page }) => {
        await loginAsGuest(page);
        const popover = await openSettings(page);

        await expect(popover.getByRole("button", { name: "Administration" })).toHaveCount(0);
    });
});

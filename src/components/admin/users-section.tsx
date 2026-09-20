"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/app/locale-provider";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { AdminSection } from "@/components/admin/admin-section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Button } from "@/ui/button";
import { Spinner } from "@/ui/spinner";

type UserRow = {
    id: string;
    email: string | null;
    displayName: string;
    role: string;
    createdAt: string;
};

const ROLES = ["viewer", "admin"] as const;
type AssignableRole = typeof ROLES[number];

// Mirrors the server's zod rule so the button only enables for a request that can succeed.
const MIN_PASSWORD_LENGTH = 6;

// Error routes without a content schema type json() as never, so read the body loosely.
async function readError(res: { status: number; json: () => Promise<unknown> }): Promise<string> {
    try {
        const body = await res.json() as { error?: string } | null;
        return body?.error ?? `HTTP ${res.status}`;
    } catch {
        return `HTTP ${res.status}`;
    }
}

export function UsersSection() {
    const t = useTranslations("admin-settings");
    const { locale } = useLocale();
    const { userId: selfId } = useAuthStore();

    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newDisplayName, setNewDisplayName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    async function loadUsers(): Promise<UserRow[]> {
        const res = await api.admin.users.$get();
        if (res.status !== 200) {
            throw new Error(await readError(res));
        }
        return (await res.json()).users;
    }

    useEffect(() => {
        let cancelled = false;
        loadUsers()
            .then(rows => { if (!cancelled) setUsers(rows); })
            .catch(e => { if (!cancelled) setError(`${t("users.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    async function onRoleChange(user: UserRow, role: AssignableRole) {
        const previous = user.role;
        setError(null);
        // Optimistic so the select does not snap back while the request is in flight.
        setUsers(rows => rows.map(r => r.id === user.id ? { ...r, role } : r));
        try {
            const res = await api.admin["role-update"].$patch({ json: { userId: user.id, role } });
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }
        } catch (e) {
            setUsers(rows => rows.map(r => r.id === user.id ? { ...r, role: previous } : r));
            setError(`${t("users.updateFailed")}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    const canSubmit = newEmail.trim().length > 0 && newPassword.length >= MIN_PASSWORD_LENGTH && !creating;

    async function onCreate(e: FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setCreating(true);
        setCreateError(null);
        try {
            const res = await api.admin["create-user"].$post({
                json: {
                    displayName: newDisplayName.trim() || undefined,
                    email: newEmail.trim(),
                    pass: newPassword,
                },
            });
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }
            setNewDisplayName("");
            setNewEmail("");
            setNewPassword("");
            // The create route returns no row, so refetch to pick up the server-assigned id and date.
            setUsers(await loadUsers());
        } catch (e) {
            setCreateError(`${t("users.create.failed")}: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setCreating(false);
        }
    }

    return (
        <AdminSection title={t("sections.users")}>
            {loading ? (
                <div className="flex justify-center py-6">
                    <Spinner />
                </div>
            ) : (
                <div className="max-h-80 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("users.columns.displayName")}</TableHead>
                                <TableHead>{t("users.columns.email")}</TableHead>
                                <TableHead>{t("users.columns.role")}</TableHead>
                                <TableHead>{t("users.columns.createdAt")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.displayName}</TableCell>
                                    <TableCell>
                                        {user.email ?? <span className="text-muted-foreground">-</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.role}
                                            onValueChange={(role) => onRoleChange(user, role as AssignableRole)}
                                            // Never let an admin demote themselves, so at least one admin always remains.
                                            disabled={user.id === selfId}
                                        >
                                            <SelectTrigger size="sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLES.map(role => (
                                                    <SelectItem key={role} value={role}>
                                                        {t(`users.roles.${role}`)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString(locale)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <form onSubmit={onCreate} className="space-y-3 border-t pt-3">
                <h4 className="text-sm font-medium">{t("users.create.title")}</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-2">
                        <Label htmlFor="admin-new-user-name">{t("users.create.displayName")}</Label>
                        <Input
                            id="admin-new-user-name"
                            type="text"
                            autoComplete="off"
                            value={newDisplayName}
                            onChange={(e) => setNewDisplayName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="admin-new-user-email">{t("users.create.email")}</Label>
                        <Input
                            id="admin-new-user-email"
                            type="email"
                            autoComplete="off"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="admin-new-user-password">{t("users.create.password")}</Label>
                        <Input
                            id="admin-new-user-password"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                </div>
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <div className="flex justify-end">
                    <Button type="submit" disabled={!canSubmit}>
                        {creating ? <Spinner /> : null}
                        {t("users.create.submit")}
                    </Button>
                </div>
            </form>
        </AdminSection>
    );
}

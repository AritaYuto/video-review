"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "@/app/locale-provider";
import { TableCell, TableRow } from "@/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import type { User } from "@/lib/db-types";

export const ROLES = ["viewer", "admin"] as const;

export type AssignableRole = typeof ROLES[number];

export function UserRow({ user, isSelf, justAdded, onRoleChange }: {
    user: User;
    isSelf: boolean;
    justAdded: boolean;
    onRoleChange: (role: AssignableRole) => void;
}) {
    const t = useTranslations("admin-settings");
    const { locale } = useLocale();

    return (
        <TableRow data-state={justAdded ? "selected" : undefined}>
            <TableCell>{user.displayName}</TableCell>
            <TableCell>
                {user.email ?? <span className="text-muted-foreground">-</span>}
            </TableCell>
            <TableCell>
                <Select
                    value={user.role}
                    onValueChange={(role) => onRoleChange(role as AssignableRole)}
                    // Never let an admin demote themselves, so at least one admin always remains.
                    disabled={isSelf}
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
    );
}

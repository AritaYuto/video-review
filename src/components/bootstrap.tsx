"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrap } from "@/lib/fetch-wrapper/admin";
import { useTranslations } from "next-intl";
import * as api from "@/lib/fetch-wrapper";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthCard, AuthLayout } from "@/components/auth/auth-layout";

export default function Bootstrap() {
    const t = useTranslations("bootstrap");
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");
    const { setAuth } = useAuthStore();

    async function submit() {
        const res = await bootstrap(email, pass);
        if (!res.ok) {
            alert(res.msg);
            return;
        }

        try {
            const data = await api.login("user", { email, password: pass });
            setAuth(data.id, data.email, data.role, data.token, data.displayName);
            location.href = "/";
        } catch (e) {
            alert(t("loginFailedMsg"));
        }
    }

    return (
        <AuthLayout title={t("title")}>
            <AuthCard>
                <div className="grid gap-3 mb-4">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input type="email"
                        value={email ?? ""}
                        onChange={(x) => setEmail(x.target.value)} />
                </div>
                <div className="grid gap-3 mb-4">
                    <Label htmlFor="password">{t("password")}</Label>
                    <Input type="password"
                        value={pass ?? ""}
                        onChange={(x) => setPass(x.target.value)} />
                </div>
                <Button onClick={submit} className="w-full">
                    Initialize
                </Button>
            </AuthCard>
        </AuthLayout>
    );
}

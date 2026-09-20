"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { LoginType } from "@/lib/auth-types";
import { useTranslations } from "next-intl";
import { Tabs } from "@/ui/tabs";
import { TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Label } from "@/ui/label";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";
import { env } from "@/lib/env";
import { AuthCard, AuthLayout } from "@/components/auth/auth-layout";

export default function Login() {
    const t = useTranslations("login");
    const router = useRouter();

    const cacheDisplayName = useAuthStore((e) => e.displayName);
    const cacheEmail = useAuthStore((e) => e.email);
    const { setAuth } = useAuthStore();

    // Don't open on the guest tab when guest login is hidden.
    const initialType: LoginType =
        !env.PUBLIC_ALLOW_GUEST && env.PUBLIC_LOGIN_DEFAULT_TYPE === "guest"
            ? "user"
            : env.PUBLIC_LOGIN_DEFAULT_TYPE;

    const [type, setType] = useState<LoginType>(initialType);
    const [email, setEmail] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    useEffect(() => {
        setEmail(cacheEmail ?? "");
        setDisplayName(cacheDisplayName ?? "");
    }, []);

    const handleLogin = async () => {
        try {
            const res =
                type === "user" ? await api.auth.login.user.$post({ json: { email: email ?? "", password } }) :
                type === "jira" ? await api.auth.login.jira.$post({ json: { email: email ?? "" } }) :
                await api.auth.login.guest.$post({ json: { displayName } });
            if (res.status !== 200) throw new Error("Failed to login");
            const data = await res.json();
            setAuth(data.id, data.email ?? null, data.role, data.token, data.displayName);
            router.push("/video-review/review");
        } catch (e) {
            alert(t("loginFailedMsg"));
        }
    };

    return (
        <AuthLayout title={env.PUBLIC_VIDEO_REVIEW_TITLE} backgroundImageUrl={env.PUBLIC_LOGIN_BG_URL}>
                <Tabs defaultValue={type} onValueChange={(val) => setType(val as LoginType)}>
                    <TabsList>
                        {env.PUBLIC_ALLOW_GUEST && <TabsTrigger value="guest">Guest</TabsTrigger>}
                        <TabsTrigger value="jira">JIRA</TabsTrigger>
                        <TabsTrigger value="user">Email & Password</TabsTrigger>
                    </TabsList>
                    {env.PUBLIC_ALLOW_GUEST && (
                        <TabsContent value="guest">
                            <AuthCard>
                                <div className="h-8"></div>
                                <div className="grid gap-3 mb-4">
                                    <Label htmlFor="displayName">{t("displayName")}</Label>
                                    <Input id="displayName"
                                        type="text"
                                        value={displayName ?? ""}
                                        onChange={(x) => setDisplayName(x.target.value)} />
                                </div>
                                <ButtonLogin exec={handleLogin} title={t("ok")} />
                            </AuthCard>
                        </TabsContent>
                    )}
                    <TabsContent value="jira">
                        <AuthCard>
                            <div className="h-8"></div>
                            <div className="grid gap-3 mb-4">
                                <Label htmlFor="email">{t("email")}</Label>
                                <Input id="email"
                                    type="email"
                                    value={email ?? ""}
                                    onChange={(x) => setEmail(x.target.value)} />
                            </div>
                            <ButtonLogin exec={handleLogin} title={t("ok")} />
                        </AuthCard>
                    </TabsContent>
                    <TabsContent value="user">
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
                                    onKeyDown={(x) => x.key === "Enter" && handleLogin()}
                                    value={password ?? ""}
                                    onChange={(x) => setPassword(x.target.value)} />
                            </div>
                            <ButtonLogin exec={handleLogin} title={t("ok")} />
                        </AuthCard>
                    </TabsContent>
                </Tabs>
        </AuthLayout>
    );
}

function ButtonLogin({ exec, title }: { exec: () => void; title: string }) {
    return (
        <Button onClick={exec} className="w-full">
            {title}
        </Button>
    );
}
"use client";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import * as api from "@/lib/fetch-wrapper";
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

    const [type, setType] = useState<api.LoginType>(env.PUBLIC_LOGIN_DEFAULT_TYPE);
    const [email, setEmail] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");

    useEffect(() => {
        setEmail(cacheEmail ?? "");
        setDisplayName(cacheDisplayName ?? "");
    }, []);

    const handleLogin = async () => {
        try {
            const data = await api.login(type, { email, displayName, password });
            setAuth(data.id, data.email, data.role, data.token, data.displayName);
            router.push("/video-review/review");
        } catch (e) {
            alert(t("loginFailedMsg"));
        }
    };

    return (
        <AuthLayout title={env.PUBLIC_VIDEO_REVIEW_TITLE} backgroundImageUrl={env.PUBLIC_LOGIN_BG_URL}>
                <Tabs defaultValue={type} onValueChange={(val) => setType(val as api.LoginType)}>
                    <TabsList>
                        <TabsTrigger value="guest">Guest</TabsTrigger>
                        <TabsTrigger value="jira">JIRA</TabsTrigger>
                        <TabsTrigger value="user">Email & Password</TabsTrigger>
                    </TabsList>
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
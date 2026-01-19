"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrap } from "@/lib/fetch-wrapper/admin";
import { useTranslations } from "next-intl";
import { useRouter } from "next/router";
import { useState } from "react";

export default function Bootstrap() {
    const t = useTranslations("bootstrap");
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [pass, setPass] = useState("");

    async function submit() {
        const res = await bootstrap(email, pass);
        if (!res.ok) {
            alert(res.msg);
            return;
        }
        router.push("/video-review/login");
    }

    return (
        <div className="flex items-center justify-center w-screen h-screen bg-[#181818]">
            <div style={{minHeight:"400px"}} className="w-100 p-8 rounded-xl bg-[#202020]/80 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm border border-[#333]">
                <h1 className="text-lg mb-6 font-semibold text-center text-[#ff8800]">
                    {process.env.NEXT_PUBLIC_VIDEO_REVIEW_TITLE}
                </h1>
                <div className="login-card rounded-2xl bg-[#1f1f1f] p-3 shadow-xl">
                    <div className="grid gap-3">
                        <Label htmlFor="email">{t("email")}</Label>
                        <Input type="email"
                            value={email ?? ""}
                            onChange={(x) => setEmail(x.target.value)}
                            className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition" />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="password">{t("password")}</Label>
                        <Input type="password"
                            value={pass ?? ""}
                            onChange={(x) => setPass(x.target.value)}
                            className="w-full p-2 mb-4 rounded bg-[#303030] border border-[#444] focus:border-[#ff8800] outline-none transition" />
                    </div>
                    <Button
                        onClick={submit}
                        className="w-full py-2 rounded font-medium bg-[#ff8800] text-white hover:bg-[#ffaa33] transition"
                    >
                        Initialize
                    </Button>
                </div>
            </div>
        </div >
    );
}

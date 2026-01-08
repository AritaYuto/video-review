"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { withRetry } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
    const router = useRouter();
    const { verifyAuth } = useAuthStore();
    const [warmupDB, setWarmupDB] = useState<boolean>(false);

    const warmupWithRetry = async () => {
        const ret = await withRetry(async () => {
            const res = await fetch("/api/internal/warmup");
            if (!res.ok) {
                const txt = await res.text().catch(() => "");
                const err: any = new Error(`HTTP ${res.status}: ${txt}`);
                err.status = res.status;
                throw err;
            }
            const json = await res.json();
            if (!json?.status) {
                const err: any = new Error("warmup failed: status=false");
                throw err;
            }
            return true;
        }, {
            retries: 10,
        });
        return ret;
    }

    useEffect(() => {
        void (async () => {
            const result = await warmupWithRetry();
            setWarmupDB(result);

            if(result) {
                router.replace(await verifyAuth() ? "/video-review/review" : "/video-review/login");
            }
        })();
    }, [router]);

    if (!warmupDB) {
        return (
            <div className="flex flex-col h-full w-full bg-[#181818]">
                <div className="flex-1 flex items-center justify-center">
                    <Badge className="bg-[#181818]">
                        <Spinner className="text-[#ff9a1a] bg-[#181818]"/>
                        Database is preparing...
                    </Badge>
                </div>
            </div>
        );
    }
    return null;
}

import type { Metadata } from "next";
import "@/styles/globals.css";
import "@xyflow/react/dist/style.css";
import { LocaleProvider } from "../locale-provider";
import { env } from "@/lib/env";

export const metadata: Metadata = {
    title: env.PUBLIC_VIDEO_REVIEW_TITLE,
    description: env.PUBLIC_VIDEO_REVIEW_DESC,
};

export default function VideoReviewLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <LocaleProvider>
            {children}
        </LocaleProvider>
    );
}

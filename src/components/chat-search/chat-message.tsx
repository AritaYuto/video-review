"use client";

import Markdown from "react-markdown";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChatTurn } from "@/lib/fetch-wrapper/chat-search";

export function ChatMessage({ turn }: { turn: ChatTurn }) {
    const isUser = turn.role === "user";
    return (
        <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
            <div
                className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm break-words",
                    isUser
                        ? "bg-[#ff8800] text-black"
                        : "bg-[#2a2a2a] text-[#ddd]",
                )}
            >
                {isUser ? turn.content : (
                    <div className="prose prose-sm prose-invert max-w-none">
                        <Markdown
                            components={{
                                a: ({ href, children }) => {
                                    if (href?.startsWith("/") && !href.startsWith("//")) {
                                        return (
                                            <Link href={href} className="underline text-[#ff8800] hover:text-[#ffaa44]">
                                                {children}
                                            </Link>
                                        );
                                    }
                                    return (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-[#ff8800] hover:text-[#ffaa44]">
                                            {children}
                                        </a>
                                    );
                                },
                            }}
                        >
                            {turn.content}
                        </Markdown>
                    </div>
                )}
            </div>
        </div>
    );
}

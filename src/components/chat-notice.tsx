"use client";

import { useCommentStore } from "@/stores/comment-store";
import { toast } from "sonner";
import * as wrapper from "@/lib/fetch-wrapper";
import { api } from "@/lib/api-client";

export async function chatToast(commentId: string, screenshot: Blob | null): Promise<boolean> {
    if (screenshot === null) {
        return false;
    }
    
    const comment = useCommentStore.getState().comments.find(c => c.id === commentId);
    if (!comment) {
         return false;
    }

    const ret = await wrapper.chat(commentId, screenshot);
    if(!ret.ok || ret.data.notifiedProviders.length === 0) {
        return false;
    }
    
    const toastData = ret.data.toastData;
    toast.custom(() => (
        <div className="flex gap-3 rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
            <img
                src={URL.createObjectURL(screenshot)}
                className="h-16 w-16 rounded object-cover"
            />
            <div className="flex flex-col gap-0.5">
                <div className="text-sm font-semibold">
                    {toastData.title}
                </div>
                <div className="text-xs line-clamp-2">
                    {toastData.comment}
                </div>
            </div>
        </div>
    ));
    const res = await api.comments.index.$patch({
        json: { id: commentId, notifiedProviders: ret.data.notifiedProviders },
    });
    if (res.status !== 200) throw new Error("Failed to update comment");
    useCommentStore.getState().updateComment(await res.json());
    return true;
}

"use client";

import { useCommentStore } from "@/stores/comment-store";
import { toast } from "sonner";
import * as api from "@/lib/fetch-wrapper";

export async function chatToast(commentId: string, screenshot: Blob | null): Promise<boolean> {
    if (screenshot === null) {
        return false;
    }
    
    const comment = useCommentStore.getState().comments.find(c => c.id === commentId);
    if (!comment) {
         return false;
    }

    const ret = await api.chat(commentId, screenshot);
    if(!ret.ok) {
        return false;
    }
    
    const toastData = ret.data.toastData;
    toast.custom(() => (
        <div className="flex gap-3 rounded-md bg-zinc-900 p-3 text-white shadow">
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
    const updatedComment = await api.updateComment({
        id: commentId,
        notifiedProviders: ret.data.notifiedProviders,
    });
    useCommentStore.getState().updateComment(updatedComment);
    return true;
}

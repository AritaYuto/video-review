import { create } from "zustand";
import { api } from "@/lib/api-client";
import { uploadToSession } from "@/lib/upload-transfer";

interface DrawingState {
    canvasRefElement: HTMLCanvasElement | null,
    canvasEditing: boolean;
    needSave: boolean;

    setCanvasRefElement: (canvas: HTMLCanvasElement | null) => void;
    setCanvasEditing: (r: boolean) => void;
    canvasSave: (drawingPath: string | null) => Promise<string | null>;
    setNeedSave: (r: boolean) => void;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
    canvasRefElement: null,
    canvasEditing: false,
    needSave: false,

    setCanvasEditing: (r) => set({ canvasEditing: r }),
    setCanvasRefElement: (canvas) => set({ canvasRefElement: canvas }),
    canvasSave: async (path) => {
        if (!get().needSave) return null;
        
        const c = get().canvasRefElement;
        if (!c) return null;

        return new Promise<string | null>((resolve) => {
            c.toBlob(async (blob) => {
                if (!blob) return resolve(null);
                

                const initRes = await api.drawing.upload.init.$post({ form: { path: path ?? "" } });
                if (initRes.status !== 200) return resolve(null);
                const init = await initRes.json();
                await uploadToSession({ url: init.url, session: init.session, file: blob });
                const finishRes = await api.drawing.upload.finish.$post({ query: { session_id: init.session.id } });

                resolve(finishRes.status === 200 ? (await finishRes.json()).filePath : null);
            }, "image/png");
        });
    },
    setNeedSave: (r) => set({ needSave: r })
}));

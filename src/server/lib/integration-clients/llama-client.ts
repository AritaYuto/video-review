import { getLlama, LlamaModel, LlamaChatSession, LlamaJsonSchemaGrammar, Llama } from "node-llama-cpp";
import { env } from "@/server/lib/env";
import path from "path";

let _llama: Llama | undefined = undefined
let _model: LlamaModel | undefined = undefined;

export const createLlama = async (): Promise<Llama | undefined> => {
    if (!env.USE_AI_SUPPORT) {
        console.warn("AI support is disabled");
        return undefined;
    }

    if (_llama) {
        return _llama;
    };

    try {
        console.log(`Initializing LLM backend: ${env.LLAMA_BACKEND}`);
        _llama = await getLlama({
            gpu:
                env.LLAMA_BACKEND === "cuda" ? "cuda" :
                    env.LLAMA_BACKEND === "metal" ? "metal" :
                        false,
        });
    } catch (e) {
        console.warn(
            `Failed to initialize LLM backend (${env.LLAMA_BACKEND}), falling back to CPU.`,
            e
        );
        _llama = await getLlama({ gpu: false });
    }

    return _llama;
}

const createModel = async (llama: Llama): Promise<LlamaModel | undefined> => {
    if (!env.USE_AI_SUPPORT) {
        console.warn("AI support is disabled");
        return undefined;
    }

    if (_model) {
        return _model
    };

    _model = await llama.loadModel({
        modelPath: path.resolve(
            process.cwd(),
            "models/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf"
        ),
        gpuLayers: 20
    });
    return _model;
}

export async function createLlamaSession(): Promise<LlamaChatSession | undefined> {
    const llama = await createLlama();
    if (!llama) {
        console.warn("Llama is not available");
        return undefined;
    }

    const model = await createModel(llama);
    if (!model) {
        console.warn("Llama model is not available");
        return undefined;
    }

    const context = await model.createContext({
        contextSize: 2046,
        batchSize: 512,
    });

    const session = new LlamaChatSession({ contextSequence: context.getSequence() });
    return session;
}

export type PromptContextDataJson = {
    video_file: string,
    summary: string,
    format: string,
    content: string[],
}

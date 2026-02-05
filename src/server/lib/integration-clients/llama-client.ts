import { getLlama, LlamaModel, LlamaChatSession } from "node-llama-cpp";
import { env } from "@/server/lib/env";
import path from "path";
import { fileURLToPath } from "url";

let _model: LlamaModel | undefined = undefined;

const createModel = async (): Promise<LlamaModel | undefined> => {
    if (!env.USE_AI_SUPPORT) {
        console.warn("AI support is disabled");
        return undefined;
    }

    if (_model) {
        return _model
    };

    let llama;
    try {
        console.log(`Initializing LLM backend: ${env.LLAMA_BACKEND}`);
        llama = await getLlama({
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
        llama = await getLlama({ gpu: false });
    }

    _model = await llama.loadModel({
        modelPath: path.resolve(
            process.cwd(),
            "models/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf"
        ),
    });
    return _model;
}

export async function createLlamaSession(): Promise<LlamaChatSession | undefined> {
    const model = await createModel();
    if (!model) {
        console.warn("Llama model is not available");
        return undefined;
    }

    const context = await model.createContext();
    return new LlamaChatSession({ contextSequence: context.getSequence() });
}

export type LlamaDataJson = {
    video_file: string,
    summary: string,
    format: string,
    content: string[],
}

export const OutputFormatPrompt = `
Output format:
{
  "summary": "...",
  "tags": ["...", "..."]
}`;
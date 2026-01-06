export type RetryOptions = {
    retries?: number;
    delay?: number;
};

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const {
        retries = 3,
        delay = 3000,
    } = options;

    let attempt = 0;
    let lastErr: any = null;

    while (attempt <= retries) {
        try {
            return await fn();
        } catch (e: any) {
            lastErr = e;
            if (attempt >= retries) break;

            try {
                console.warn(`withRetry: transient error, attempt=${attempt + 1}, delay=${delay}ms`, e?.message ?? e);
            } catch (_) {}

            await new Promise((r) => setTimeout(r, delay));
            attempt++;
            continue;
        }
    }

    throw lastErr;
}
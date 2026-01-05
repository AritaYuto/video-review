export type RetryOptions = {
    retries?: number;
    baseDelayMs?: number;
    factor?: number;
    // return true if the error should be retried
    shouldRetry?: (err: any) => boolean;
};

function defaultShouldRetry(err: any) {
    if (!err) return false;
    // Prisma common transient connection error
    if (err?.code === "P1001") return true;
    // network errors / timeouts
    const msg = String(err?.message || "").toLowerCase();
    if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("connect")) return true;
    // generic node network error codes
    if (err?.code && ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"].includes(err.code)) return true;
    return false;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const {
        retries = 3,
        baseDelayMs = 3000,
        factor = 2,
        shouldRetry = defaultShouldRetry,
    } = options;

    let attempt = 0;
    let lastErr: any = null;

    while (attempt <= retries) {
        try {
            return await fn();
        } catch (e: any) {
            lastErr = e;
            // if we've exhausted attempts, break and rethrow
            if (attempt >= retries) break;

            // if error is not retryable, rethrow immediately
            if (!shouldRetry(e)) break;

            // exponential backoff + full jitter
            const exp = Math.pow(factor, attempt);
            const delay = Math.floor((baseDelayMs * exp) * Math.random());

            // small warning to aid debugging when retries occur
            try {
                // eslint-disable-next-line no-console
                console.warn(`withRetry: transient error, attempt=${attempt + 1}, delay=${delay}ms`, e?.message ?? e);
            } catch (_) {}

            await new Promise((r) => setTimeout(r, delay));
            attempt++;
            continue;
        }
    }

    throw lastErr;
}
export function resolveEnv(primary?: string, legacy?: string): string | undefined {
    return primary ?? legacy;
}

export function booleanEnv(key?: string): boolean {
    if(!key) return false;
    return key === "true"
}

export function positiveNumberEnv(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function typeEnv<T>(key: string | undefined, defaultType: string | undefined): T {
    if(!key || key === "") return defaultType as T;
    return key as T;
}

export function arrayEnv<T>(value: string | undefined, parser: (v: string) => T, defaultArray: T[] = []
): T[] {
    if (!value) return defaultArray;
    return value.split(",").map(v => parser(v.trim()));
}
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface FetchOptions {
    method?: "GET" | "POST";
    body?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
}

export interface FetchResult {
    status: number;
    body: string;
    failure?: "timeout" | "network";
    retryAfter?: number;
    rateLimit?: { limit: number; remaining: number; reset: number; };
    tokenExpires?: number;
}

const num = (v: string | null) => {
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

export async function performFetch(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
    let res: Response;
    try {
        res = await fetch(url, {
            method: opts.method ?? "GET",
            body: opts.body,
            headers: opts.headers,
            signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        });
    } catch (e) {
        const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
        return { status: 0, body: "null", failure: timedOut ? "timeout" : "network" };
    }

    const result: FetchResult = { status: res.status, body: "null" };

    const limit = num(res.headers.get("x-ratelimit-limit"));
    const remaining = num(res.headers.get("x-ratelimit-remaining"));
    const reset = num(res.headers.get("x-ratelimit-reset"));
    if (limit !== undefined && remaining !== undefined && reset !== undefined) {
        result.rateLimit = { limit, remaining, reset };
    }
    result.tokenExpires = num(res.headers.get("x-token-expires"));
    if (res.status === 429) result.retryAfter = num(res.headers.get("retry-after"));
    if (res.status === 204) return result;

    try {
        result.body = (await res.text())?.trim() || "null";
    } catch {
        return { ...result, status: 0, failure: "network" };
    }
    return result;
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type ErrorKind =
    | "config"
    | "auth"
    | "quota"
    | "rate"
    | "server"
    | "network"
    | "timeout"
    | "parse"
    | "client";

export type RaywardError = Error & {
    kind: ErrorKind;
    status?: number;
    code?: string;
    requestId?: string;
};

export function makeError(kind: ErrorKind, message: string, extra: Partial<Pick<RaywardError, "status" | "code" | "requestId">> = {}): RaywardError {
    return Object.assign(new Error(message), { kind, ...extra });
}

export function toRaywardError(e: unknown): RaywardError {
    if (e instanceof Error && "kind" in e) return e as RaywardError;
    return makeError("network", e instanceof Error ? e.message : String(e));
}

export const isBlockingError = (e: RaywardError | undefined) => !!e && (e.kind === "config" || e.kind === "auth" || e.kind === "quota");

const shortText: Record<ErrorKind, string> = {
    config: "no API key",
    auth: "API key rejected",
    quota: "daily quota reached",
    rate: "rate limited",
    server: "server error",
    network: "couldn't connect",
    timeout: "timed out",
    parse: "unreadable response",
    client: "request rejected",
};

export const describeError = (e: RaywardError) => shortText[e.kind] ?? "failed";

const fromStatus = (status: number): ErrorKind =>
    status === 401 || status === 403 ? "auth"
        : status === 429 ? "rate"
            : status >= 500 ? "server"
                : "client";

export function errorFromResponse(status: number, envelope?: { error?: string; code?: string; type?: string; requestId?: string; } | null): RaywardError {
    let kind = fromStatus(status);
    if (envelope?.code === "KEY_SUSPENDED") kind = "auth";
    if (envelope?.type === "DailyQuotaError") kind = "quota";

    const detail = envelope?.error ?? `HTTP ${status}`;
    return makeError(kind, envelope?.requestId ? `${detail} (request ${envelope.requestId})` : detail, {
        status,
        code: envelope?.code,
        requestId: envelope?.requestId,
    });
}

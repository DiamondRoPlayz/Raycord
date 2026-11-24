/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { clampTtl } from "../lib/utils";
import { settings } from "../settings";
import { failureOf, fetchWithRetry, isOk, parseBody } from "./http";
import { createSourceStore, type Settled } from "./store";
import type { RobloxProfile } from "./types";

const ttlMs = () => clampTtl(Math.max(settings.store.cacheTtlMinutes, 60));

function settleAll<V>(ids: string[], found: Map<string, V>): Map<string, Settled<V>> {
    return new Map(ids.map(id => [id, { ok: true, value: found.get(id) ?? null }]));
}

export const robloxAvatarStore = createSourceStore<string>({
    name: "roblox_avatar",
    ttlMs,
    batchSize: 100,
    async fetchMany(ids) {
        const url = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids.join(",")}&size=150x150&format=Png&isCircular=false`;
        const result = await fetchWithRetry(url);
        if (!isOk(result)) throw failureOf(result);

        const parsed = parseBody<{ data: { targetId: number; state: string; imageUrl: string; }[]; }>(result);
        const found = new Map<string, string>();
        for (const entry of parsed?.data ?? []) {
            if (entry.state === "Completed" && entry.imageUrl) found.set(String(entry.targetId), entry.imageUrl);
        }
        return settleAll(ids, found);
    },
});

export const robloxProfileStore = createSourceStore<RobloxProfile>({
    name: "roblox_profile",
    ttlMs,
    batchSize: 100,
    async fetchMany(ids) {
        const result = await fetchWithRetry("https://users.roblox.com/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds: ids.map(Number).filter(Number.isFinite), excludeBannedUsers: false }),
        });
        if (!isOk(result)) throw failureOf(result);

        const parsed = parseBody<{ data: RobloxProfile[]; }>(result);
        return settleAll(ids, new Map((parsed?.data ?? []).map(p => [String(p.id), p])));
    },
});

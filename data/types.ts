/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Severity } from "../lib/utils";
import type { RaywardError } from "./errors";

export type LoadState = "idle" | "loading" | "ok" | "error";

export type Tone = "safe" | "pending" | "provisional" | "mixed" | "unsafe";

export type Subject = "discord" | "roblox" | "group";

export interface RaywardFlagType {
    value: number;
    name: string;
    description: string;
    safeToAction: boolean;
    severity: number;
    tone: string;
    isFlagged: boolean;
}

export interface RaywardProvider {
    id: string;
    name: string;
    description: string;
    websiteUrl?: string;
    discordUrl?: string;
    docsUrl?: string;
    supportUrl?: string;
    appealUrl?: string;
    accentColor?: string | null;
    tabImageLightUrl?: string;
    tabImageDarkUrl?: string;
    defaultEnabled: boolean;
    order: number;
    capabilities: {
        lookup: boolean;
        batch: boolean;
        reasons: boolean;
        membership: boolean;
        discord: boolean;
        groups: boolean;
    };
    flagTypes: RaywardFlagType[];
}

export interface RaywardDetector { id: string; label: string; summary?: string; credit?: string; }

export interface DiscordGuildEvidence {
    kind: "discordGuild";
    discordId: string;
    serverId?: string;
    safeName: string;
    types: string[];
    name: string | null;
    tags?: string[];
    messages?: number;
    typing?: number;
    reactions?: number;
    vcJoins?: number;
    joinedAt: number | null;
    firstSeen: number | null;
    lastSeen: number | null;
    leftAt?: number | null;
    verifiedLeft?: boolean;
    staff?: boolean;
    booster?: boolean;
}

export type RaywardEvidence =
    | { kind: "text"; text: string; }
    | { kind: "outfit"; outfitId: string | null; name: string; category: string; description: string; }
    | { kind: "discordUser"; discordId: string; }
    | DiscordGuildEvidence
    | { kind: string; [key: string]: unknown; };

export interface RaywardReason { type: string; title: string; sources: RaywardDetector[]; evidence?: RaywardEvidence[]; }

export interface RaywardConnection {
    robloxUserId: number;
    robloxUsername: string;
    flagType?: number;
    detectedAt: number;
    updatedAt: number;
    sources: number[];
}

export interface RaywardResult {
    id: number | string;
    flagType: number;
    statusLabel?: string;
    headerMessage?: string;
    reasons?: RaywardReason[];
    provisionalReasons?: RaywardReason[];
    category?: string;
    categoryLabel?: string;
    reviewer?: { username: string; displayName: string; };
    isLocked?: boolean;
    queuedAt?: number;
    processed?: boolean;
    processedAt?: number;
    lastUpdated?: number;
    linkedRobloxAccounts?: RaywardConnection[];
}

export type SourceOutcome =
    | { provider: RaywardProvider; state: "ok"; result: RaywardResult | null; }
    | { provider: RaywardProvider; state: "loading"; }
    | { provider: RaywardProvider; state: "error"; error: RaywardError; };

export interface SubjectLookup { outcomes: SourceOutcome[]; }

export interface RaywardMembership {
    robloxUserId: number;
    discordAccounts: {
        id: string;
        detectedAt: number | null;
        updatedAt: number | null;
        sources: number[];
        servers: { serverId: string; safeName: string; joinedAt: number | null; firstSeenAt: number; updatedAt: number | null; }[];
    }[];
    altAccounts: RaywardConnection[];
}

export interface DiscordAlt { id: string; detectedAt: number | null; updatedAt: number | null; sources: number[]; }

export interface RobloxProfile {
    id: number;
    name: string;
    displayName: string;
    isBanned: boolean;
    hasVerifiedBadge: boolean;
    created?: string;
}

export interface EasiNote { is_erp: boolean; moderation_note: string; }
export type EasiResult =
    | { kind: "note"; note: EasiNote; }
    | { kind: "none"; }
    | { kind: "unauthorized"; };

export interface SourceVerdict {
    providerId: string;
    source: string;
    severity: Severity;
    tone: Tone;
    detail: string;
}

export interface FailedSource { source: string; providerId: string; error: RaywardError; }

export interface Finding {
    providerId: string;
    source: string;
    tone: Tone;
    label: string;
    reasons: string[];
}

export interface Verdict {
    severity: Severity;
    tone: Tone;
    contributions: SourceVerdict[];
    findings: Finding[];
    failed: FailedSource[];
}

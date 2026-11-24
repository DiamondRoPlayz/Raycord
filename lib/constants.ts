/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const PLUGIN_NAME = "Rayward";
export const LEGACY_PLUGIN_NAME = "CatchThem";

export const RAYWARD_API = "https://roscoe.rayward.app/v2";
export const EASI_API = "https://catchthem.mk-7.org/api/easi";
export const RAYWARD_SITE = "https://rayward.app";

export const MIN_CACHE_TTL_MS = 5 * 60_000;
export const MAX_CACHE_TTL_MS = 7 * 24 * 60 * 60_000;
export const PROVIDERS_TTL_MS = 60 * 60_000;

export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_RETRIES = 2;
export const MAX_INLINE_RETRY_AFTER_S = 10;

export const FAILURE_BACKOFF_MS = [30_000, 120_000, 600_000];

export const SEND_GUARD_TIMEOUT_MS = 3000;
export const SEND_APPROVAL_MS = 60_000;

export const DM_CHANNEL_TYPES = new Set([1, 3]);

export const STORAGE_PREFIX = "Rayward_";
export const LEGACY_STORAGE_KEYS = [
    "TASECheck_cache",
    "CatchThem_tase",
    "CatchThem_rotector-discord",
    "CatchThem_rotector-roblox",
    "CatchThem_rayward-v2-discord",
    "CatchThem_rayward-v2-roblox",
    "CatchThem_rayward-v2-membership",
    "CatchThem_easi",
    "CatchThem_roblox-avatar",
    "CatchThem_roblox-profile",
];
export const LEGACY_DISMISS_KEY = "CatchThem_sendGuardDismissed";

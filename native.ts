/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies, ImageSrc } from "@main/csp";
import type { IpcMainInvokeEvent } from "electron";

import { type FetchOptions, type FetchResult, performFetch } from "./lib/transport";

CspPolicies["roscoe.rayward.app"] = [...ConnectSrc, ...ImageSrc];
CspPolicies["catchthem.mk-7.org"] = ConnectSrc;
CspPolicies["thumbnails.roblox.com"] = ConnectSrc;
CspPolicies["users.roblox.com"] = ConnectSrc;
CspPolicies["tr.rbxcdn.com"] = ImageSrc;
CspPolicies["rayward.app"] = ImageSrc;

const ALLOWED_HOSTS = new Set([
    "roscoe.rayward.app",
    "catchthem.mk-7.org",
    "thumbnails.roblox.com",
    "users.roblox.com",
]);

export function fetchJson(_: IpcMainInvokeEvent, url: string, opts: FetchOptions = {}): Promise<FetchResult> {
    const host = new URL(url).hostname;
    if (!ALLOWED_HOSTS.has(host)) throw new Error(`Refusing to fetch disallowed host ${host}`);
    return performFetch(url, opts);
}

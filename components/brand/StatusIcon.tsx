/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";

import type { Tone } from "../../data/types";
import { cl } from "../../lib/utils";
import { Spinner } from "./icons";

export const TONE_LABEL: Record<Tone, string> = {
    unsafe: "Flagged",
    mixed: "Mixed",
    provisional: "Provisional",
    pending: "Under review",
    safe: "Not flagged",
};

const CIRCLE = "M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0";
const QUESTION = ["M12 16v.01", "M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483"];

export type IconTone = Tone | "error";

const ICONS: Record<Exclude<IconTone, "safe">, { stroke: string; width: number; size: number; paths: string[]; }> = {
    unsafe: { stroke: "#ff4444", width: 2, size: 20, paths: [CIRCLE, "M12 8v4", "M12 16h.01"] },
    error: { stroke: "var(--vc-rw-error)", width: 2, size: 20, paths: [CIRCLE, "M12 8v4", "M12 16h.01"] },
    mixed: { stroke: "#eab308", width: 2, size: 20, paths: [CIRCLE, ...QUESTION] },
    pending: { stroke: "var(--color-status-pending, var(--vc-rw-status-pending))", width: 2.5, size: 13, paths: [CIRCLE, "M12 7v5l3 3"] },
    provisional: { stroke: "var(--color-status-safe, var(--vc-rw-status-safe))", width: 2.5, size: 13, paths: [CIRCLE, ...QUESTION] },
};

export function StatusIcon({ tone, size, className }: { tone: IconTone; size?: number; className?: string; }) {
    if (tone === "safe") return null;
    const icon = ICONS[tone];
    const px = size ?? icon.size;

    return (
        <svg
            className={classes(cl("status-icon"), className)}
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill="none"
            stroke={icon.stroke}
            strokeWidth={icon.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            {icon.paths.map(d => <path key={d} d={d} />)}
        </svg>
    );
}

export function StatusLabel({ tone, label, size = 14 }: { tone: IconTone | "loading"; label?: string; size?: number; }) {
    return (
        <span key={tone} className={cl("status", `status-${tone}`)}>
            {tone === "loading" ? <Spinner size={size - 2} /> : <StatusIcon tone={tone} size={size} />}
            <span className={cl("status-text")}>{label ?? (tone === "loading" ? "Checking" : tone === "error" ? "Error" : TONE_LABEL[tone])}</span>
        </span>
    );
}

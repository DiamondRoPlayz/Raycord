/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TONE_LABEL } from "../components/brand/StatusIcon";
import { describeError } from "../data/errors";
import type { RaywardData } from "../data/hooks";
import type { SubjectLookup } from "../data/types";
import { okResults, statusLabel, toneOf } from "../data/verdict";
import { robloxProfileUrl, severityPhrase } from "./utils";

export const escapeMarkdown = (value: string) => value.replace(/[\\`*_[\]()~>|]/g, "\\$&").replace(/\s+/g, " ").trim();

function resultLines(lookup: SubjectLookup | undefined, indent = ""): string[] {
    return okResults(lookup)
        .filter(({ provider, result }) => toneOf(provider, result) !== "safe")
        .map(({ provider, result }) => {
            const reasons = result?.reasons?.map(r => escapeMarkdown(r.title)).filter(Boolean).join("; ");
            return `${indent}- **${escapeMarkdown(provider.name)}:** ${escapeMarkdown(statusLabel(provider, result))}${reasons ? `, ${reasons}` : ""}`;
        });
}

export function summarise(data: RaywardData, username: string, discordId: string): string {
    const { verdict } = data;
    const headline = verdict.contributions.length || verdict.tone === "safe" ? severityPhrase(verdict.severity) : `${TONE_LABEL[verdict.tone]} result`;
    const lines = [
        `## ${escapeMarkdown(username)}: ${headline}`,
        `-# Discord ID \`${discordId}\` · checked with Rayward`,
    ];

    const discordLines = resultLines(data.discord);
    if (discordLines.length) lines.push("", "### Discord account", ...discordLines);

    const linked = [...data.connections.map(c => ({ c, alt: false })), ...data.alts.map(c => ({ c, alt: true }))];
    if (linked.length) {
        lines.push("", "### Linked Roblox accounts");
        for (const { c, alt } of linked) {
            const id = c.robloxUserId;
            lines.push(`- [${escapeMarkdown(c.robloxUsername || String(id))}](${robloxProfileUrl(id)}) \`${id}\`${alt ? ", possible alt" : ""}`);
            lines.push(...resultLines(data.accounts.get(id), "  "));
            const note = data.notes.get(id);
            if (note?.kind === "note") lines.push(`  - **EASI${note.note.is_erp ? " (ERP)" : ""}:** ${escapeMarkdown(note.note.moderation_note)}`);
        }
    }

    if (data.discordAlts?.length) {
        lines.push("", "### Other Discord accounts", ...data.discordAlts.map(a => `- \`${a.id}\``));
    }

    if (!discordLines.length && !linked.length) lines.push("", "No results from the sources checked.");
    if (verdict.failed.length) {
        lines.push("", `Incomplete: ${verdict.failed.map(f => `${escapeMarkdown(f.source)} (${describeError(f.error)})`).join(", ")}`);
    }
    return lines.join("\n");
}


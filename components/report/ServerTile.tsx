/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TooltipContainer } from "@components/TooltipContainer";

import type { DiscordGuildEvidence, RaywardMembership } from "../../data/types";
import { cl, fmtDateUnix, fmtRelativeUnix, plural } from "../../lib/utils";

export interface ServerInfo {
    key: string;
    serverId?: string;
    name: string;
    labels: string[];
    badges: string[];
    joinedAt?: number | null;
    firstSeen?: number | null;
    lastSeen?: number | null;
    activity: string[];
}

export function serverFromEvidence(guild: DiscordGuildEvidence, index: number): ServerInfo {
    return {
        key: guild.serverId ?? `${guild.safeName}-${index}`,
        serverId: guild.serverId,
        name: guild.name ?? guild.safeName,
        labels: [...(guild.types ?? []), ...(guild.tags ?? [])],
        badges: [
            guild.staff && "Staff",
            guild.booster && "Booster",
            guild.verifiedLeft ? "Left" : guild.leftAt ? `Left ${fmtRelativeUnix(guild.leftAt)}` : null,
        ].filter((b): b is string => !!b),
        joinedAt: guild.joinedAt,
        firstSeen: guild.firstSeen,
        lastSeen: guild.lastSeen,
        activity: [
            guild.messages !== undefined && plural(guild.messages, "message"),
            guild.reactions !== undefined && plural(guild.reactions, "reaction"),
            guild.typing !== undefined && plural(guild.typing, "typing event"),
            guild.vcJoins !== undefined && plural(guild.vcJoins, "voice join"),
        ].filter((a): a is string => !!a),
    };
}

export function serversFromMembership(membership: RaywardMembership | null | undefined): ServerInfo[] {
    return (membership?.discordAccounts ?? []).flatMap(account => account.servers.map(server => ({
        key: `${account.id}-${server.serverId}`,
        serverId: server.serverId,
        name: server.safeName,
        labels: [],
        badges: [],
        joinedAt: server.joinedAt,
        firstSeen: server.firstSeenAt,
        lastSeen: server.updatedAt,
        activity: [],
    })));
}

export function mergeServers(primary: ServerInfo[], extra: ServerInfo[]): ServerInfo[] {
    const idOf = (s: ServerInfo) => s.serverId ?? s.name.trim().toLowerCase();
    const merged = primary.map(s => ({ ...s }));
    const byId = new Map(merged.map(s => [idOf(s), s]));
    for (const server of extra) {
        const match = byId.get(idOf(server));
        if (!match) {
            merged.push(server);
            byId.set(idOf(server), server);
            continue;
        }
        match.joinedAt ??= server.joinedAt;
        match.firstSeen ??= server.firstSeen;
        match.lastSeen ??= server.lastSeen;
    }
    return merged;
}

function When({ label, ts }: { label: string; ts?: number | null; }) {
    if (!ts) return null;
    return (
        <TooltipContainer text={fmtDateUnix(ts)}>
            <span className={cl("server-when")}>{label} {fmtRelativeUnix(ts)}</span>
        </TooltipContainer>
    );
}

function ServerRow({ server }: { server: ServerInfo; }) {
    return (
        <li className={cl("server")}>
            <div className={cl("server-head")}>
                <strong className={cl("server-name")}>{server.name}</strong>
                {server.badges.map(b => <span key={b} className={cl("badge")}>{b}</span>)}
                {server.labels.map(l => <span key={l} className={cl("tag")}>{l}</span>)}
            </div>
            <div className={cl("server-meta")}>
                <When label="joined" ts={server.joinedAt} />
                <When label="first seen" ts={server.firstSeen} />
                <When label="last seen" ts={server.lastSeen} />
            </div>
            {!!server.activity.length && <div className={cl("server-meta")}>{server.activity.join(" · ")}</div>}
        </li>
    );
}

export function ServerList({ servers }: { servers: ServerInfo[]; }) {
    if (!servers.length) return null;
    return <ul className={cl("servers")}>{servers.map(s => <ServerRow key={s.key} server={s} />)}</ul>;
}

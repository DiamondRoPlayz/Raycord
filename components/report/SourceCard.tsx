/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Link } from "@components/Link";
import { TooltipContainer } from "@components/TooltipContainer";
import { useState } from "@webpack/common";
import type { ReactNode } from "react";

import type { DiscordGuildEvidence, RaywardEvidence, RaywardProvider, RaywardReason, RaywardResult, SourceOutcome, Tone } from "../../data/types";
import { flagTypeOf, statusLabel, toneOf } from "../../data/verdict";
import { cl, fmtDateUnix, fmtRelativeUnix, plural } from "../../lib/utils";
import { SourceLogo } from "../brand/Brand";
import { ChevronIcon, DiscordIcon } from "../brand/icons";
import { StatusIcon, StatusLabel } from "../brand/StatusIcon";
import { ErrorStatus, RetryButton, Reveal } from "../shared";
import { mergeServers, serverFromEvidence, type ServerInfo, ServerList } from "./ServerTile";

export function SourceFrame({ logo, icon, name, summary, status, action, tone, index = 0, defaultExpanded = false, children }: {
    logo?: ReactNode;
    icon?: ReactNode;
    name?: ReactNode;
    summary?: ReactNode;
    status: ReactNode;
    action?: ReactNode;
    tone?: Tone | "error";
    index?: number;
    defaultExpanded?: boolean;
    children?: ReactNode;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const expandable = !!children;
    const toggle = () => expandable && setExpanded(v => !v);

    return (
        <div className={cl("card", tone && `card-${tone}`, "enter")} style={{ "--i": index } as React.CSSProperties}>
            <div
                className={cl("card-head", expandable && "card-head-toggle")}
                role={expandable ? "button" : undefined}
                tabIndex={expandable ? 0 : undefined}
                aria-expanded={expandable ? expanded : undefined}
                onClick={toggle}
                onKeyDown={e => {
                    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                    e.preventDefault();
                    toggle();
                }}
            >
                {logo
                    ? <span className={cl("cell-logo")}>{logo}</span>
                    : <>
                        <span className={cl("cell-icon")}>{icon}</span>
                        <span className={cl("cell-name")}>{name}</span>
                    </>}
                <span className={cl("cell-summary")}>{summary}</span>
                <span className={cl("cell-status")}>{status}</span>
                <span className={cl("cell-action")}>{action ?? (expandable && <ChevronIcon expanded={expanded} />)}</span>
            </div>
            {expandable && (
                <Reveal open={expanded}>
                    <div className={cl("card-body")}>{children}</div>
                </Reveal>
            )}
        </div>
    );
}

const isDiscordReason = (reason: RaywardReason) =>
    /discord|server|guild/i.test(reason.type) || !!reason.evidence?.some(e => e.kind === "discordGuild" || e.kind === "discordUser");

function OtherEvidence({ item }: { item: RaywardEvidence; }) {
    switch (item.kind) {
        case "text":
            return <li>{(item as { text: string; }).text}</li>;
        case "outfit": {
            const outfit = item as { name: string; category: string; description: string; };
            return <li>Outfit <strong>{outfit.name}</strong>{outfit.category ? ` (${outfit.category})` : ""}{outfit.description ? `: ${outfit.description}` : ""}</li>;
        }
        case "discordUser":
            return <li>Linked Discord account <code>{(item as { discordId: string; }).discordId}</code></li>;
        default:
            return null;
    }
}

function Reason({ reason, extraServers = [] }: { reason: RaywardReason; extraServers?: ServerInfo[]; }) {
    const [open, setOpen] = useState(false);
    const evidence = reason.evidence ?? [];
    const servers = mergeServers(evidence.filter((e): e is DiscordGuildEvidence => e.kind === "discordGuild").map(serverFromEvidence), extraServers);
    const others = evidence.filter(e => e.kind !== "discordGuild");
    const detailCount = servers.length + others.length;
    const hasBody = reason.sources.length > 0 || detailCount > 0;

    return (
        <div className={cl("reason", open && "reason-open")}>
            <button className={cl("reason-head")} onClick={() => setOpen(v => !v)} aria-expanded={open} disabled={!hasBody}>
                {isDiscordReason(reason) && <DiscordIcon />}
                <span className={cl("reason-title")}>{reason.title}</span>
                {hasBody && <span className={cl("muted", "reason-count")}>{detailCount ? plural(detailCount, servers.length === detailCount ? "server" : "detail") : "Details"}</span>}
                {hasBody && <ChevronIcon expanded={open} />}
            </button>
            {hasBody && (
                <Reveal open={open}>
                    <div className={cl("reason-body")}>
                        {reason.sources.map(s => (
                            <div key={s.id} className={cl("detector")}>
                                <strong>{s.label}</strong>
                                {s.summary && <span>{s.summary}</span>}
                                {s.credit && <span className={cl("muted")}>{s.credit}</span>}
                            </div>
                        ))}
                        <ServerList servers={servers} />
                        {!!others.length && <ul className={cl("evidence")}>{others.map((e, i) => <OtherEvidence key={i} item={e} />)}</ul>}
                    </div>
                </Reveal>
            )}
        </div>
    );
}

function Details({ result }: { result: RaywardResult; }) {
    const rows: [string, ReactNode][] = [];
    if (result.categoryLabel) rows.push(["Category", result.categoryLabel]);
    if (result.reviewer) rows.push(["Reviewed by", result.reviewer.displayName || result.reviewer.username]);
    if (result.isLocked) rows.push(["Record", "Locked"]);
    for (const [label, ts] of [["Queued", result.queuedAt], ["Processed", result.processedAt], ["Updated", result.lastUpdated]] as const) {
        if (ts) rows.push([label, <TooltipContainer key={label} text={fmtDateUnix(ts)}><span>{fmtRelativeUnix(ts)}</span></TooltipContainer>]);
    }
    if (!rows.length) return null;

    return (
        <dl className={cl("details")}>
            {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
    );
}

function SourceLinks({ provider }: { provider: RaywardProvider; }) {
    const links = [
        provider.appealUrl && { href: provider.appealUrl, label: "Appeal" },
        provider.websiteUrl && { href: provider.websiteUrl, label: "Website" },
        provider.supportUrl && { href: provider.supportUrl, label: "Support" },
        provider.discordUrl && { href: provider.discordUrl, label: "Discord" },
        provider.docsUrl && { href: provider.docsUrl, label: "Docs" },
    ].filter((l): l is { href: string; label: string; } => !!l);
    if (!links.length) return null;
    return <div className={cl("links")}>{links.map(l => <Link key={l.label} href={l.href}>{l.label}</Link>)}</div>;
}

export function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode; }) {
    return (
        <section className={cl("body-section")}>
            <h4 className={cl("subheading")}>{icon}{title}</h4>
            {children}
        </section>
    );
}

export function SourceCard({ outcome, onRetry, index, extraServers }: { outcome: SourceOutcome; onRetry?(): void; index?: number; extraServers?: ServerInfo[]; }) {
    const { provider } = outcome;
    const logo = <SourceLogo provider={provider} />;

    if (outcome.state === "loading") {
        return <SourceFrame index={index} logo={logo} status={<StatusLabel tone="loading" />} />;
    }

    if (outcome.state === "error") {
        return (
            <SourceFrame
                index={index}
                tone="error"
                logo={logo}
                status={<ErrorStatus error={outcome.error} />}
                action={onRetry && <RetryButton source={provider.name} onRetry={onRetry} />}
            />
        );
    }

    const { result } = outcome;
    const tone = toneOf(provider, result);
    const type = flagTypeOf(provider, result);
    const reasons = result?.reasons ?? [];
    const provisional = result?.provisionalReasons ?? [];
    const serverReason = extraServers?.length ? reasons.findIndex(isDiscordReason) : -1;
    const serversOnly: RaywardReason | null = extraServers?.length && serverReason < 0
        ? { type: "discord", title: "Discord servers", sources: [] }
        : null;

    return (
        <SourceFrame
            index={index}
            tone={tone}
            logo={logo}
            summary={reasons.map(r => r.title).join(", ")}
            status={<StatusLabel tone={tone} label={statusLabel(provider, result)} />}
        >
            {result?.headerMessage && <p className={cl("card-lead")}>{result.headerMessage}</p>}
            {type?.description && tone !== "safe" && <p>{type.description.replace(/\*\*/g, "")}</p>}
            {!result && <p className={cl("muted")}>{provider.name} has no record of this account.</p>}
            {result && <Details result={result} />}
            {(!!reasons.length || serversOnly) && (
                <Section title={reasons.length ? "Reasons" : "Discord activity"}>
                    <div className={cl("reasons")}>
                        {reasons.map((r, i) => <Reason key={`${r.type}-${i}`} reason={r} extraServers={i === serverReason ? extraServers : undefined} />)}
                        {serversOnly && <Reason reason={serversOnly} extraServers={extraServers} />}
                    </div>
                </Section>
            )}
            {!!provisional.length && (
                <Section title="Provisional reasons" icon={<StatusIcon tone="provisional" size={12} />}>
                    <div className={cl("reasons")}>{provisional.map((r, i) => <Reason key={`${r.type}-${i}`} reason={r} />)}</div>
                </Section>
            )}
            {provider.description && <p className={cl("muted")}>{provider.description}</p>}
            <SourceLinks provider={provider} />
        </SourceFrame>
    );
}

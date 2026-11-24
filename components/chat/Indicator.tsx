/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TooltipContainer } from "@components/TooltipContainer";
import { useIntersection } from "@utils/react";
import type { User } from "@vencord/discord-types";

import { useRayward } from "../../data/hooks";
import type { Verdict } from "../../data/types";
import { verdictSources } from "../../data/verdict";
import { cl, severityName } from "../../lib/utils";
import { settings } from "../../settings";
import { StatusIcon } from "../brand/StatusIcon";
import { openReportModal } from "../report/ReportModal";
import { SourcesTooltip, verdictTooltip } from "../shared";

function Mark({ style, verdict }: { style: string; verdict: Verdict; }) {
    switch (style) {
        case "pill": {
            const count = verdictSources(verdict).length;
            return <span className={cl("chip", "chip-unsafe", `chip-severity-${verdict.severity}`)}>{severityName(verdict.severity)}{count > 1 && ` ×${count}`}</span>;
        }
        case "dot":
            return <span className={cl("dot", `dot-severity-${verdict.severity}`)} />;
        default:
            return <StatusIcon tone="unsafe" size={16} />;
    }
}

export function Indicator({ user }: { user: User; }) {
    const [ref, isVisible] = useIntersection(true);
    const { verdict } = useRayward(user.id, { enabled: isVisible });

    if (verdict.severity < settings.store.indicatorThreshold) return <span ref={ref} className={cl("probe")} aria-hidden />;

    const tooltip = verdictTooltip(verdict);
    const open = (e: React.SyntheticEvent) => {
        e.stopPropagation();
        e.preventDefault();
        openReportModal(user.id);
    };

    return (
        <span ref={ref} className={cl("probe")}>
            <TooltipContainer text={<SourcesTooltip verdict={verdict} />}>
                <span
                    className={cl("indicator", "pop")}
                    role="button"
                    tabIndex={0}
                    aria-label={`Rayward: ${tooltip}`}
                    onClick={open}
                    onKeyDown={e => (e.key === "Enter" || e.key === " ") && open(e)}
                >
                    <Mark style={settings.store.indicatorStyle} verdict={verdict} />
                </span>
            </TooltipContainer>
        </span>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption } from "@api/Commands";
import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import definePlugin from "@utils/types";
import type { Channel, Message, User } from "@vencord/discord-types";
import { ChannelStore, IconUtils, Menu, showToast, UserStore } from "@webpack/common";

import { RAYWARD_MARK_URL, RaywardMenuIcon, RaywardWordmark } from "./components/brand/Brand";
import { ChatWarning, resetWarnings } from "./components/chat/ChatWarning";
import { Indicator } from "./components/chat/Indicator";
import { openReportModal } from "./components/report/ReportModal";
import { Section } from "./components/report/Section";
import { verdictTooltip } from "./components/shared";
import { toRaywardError } from "./data/errors";
import { clearDismissed, guardFirstContact, interceptDirectSends, loadDismissed, restoreDirectSends, shouldSkipUser } from "./data/guard";
import { clearAllCaches, loadAllCaches, resolveData, resolveVerdict } from "./data/hooks";
import { lookupNow } from "./data/rayward";
import { robloxAvatarStore } from "./data/roblox";
import { DM_CHANNEL_TYPES, LEGACY_PLUGIN_NAME, LEGACY_STORAGE_KEYS, PLUGIN_NAME, RAYWARD_SITE } from "./lib/constants";
import { lookupEmbed, noticeEmbed, sendEmbed, userEmbed } from "./lib/embeds";
import { cl } from "./lib/utils";
import { migrateLegacySettings, settings } from "./settings";
import managedStyle from "./styles.css?managed";

migratePluginSettings(PLUGIN_NAME, LEGACY_PLUGIN_NAME);

const reportMenuItem: NavContextMenuPatchCallback = (children, props: { user?: User; }) => {
    const userId = props?.user?.id;
    if (!userId) return;

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem
            id="vc-rayward-report"
            label="Rayward report"
            icon={RaywardMenuIcon}
            leadingAccessory={{ type: "icon", icon: RaywardMenuIcon }}
            action={() => openReportModal(userId)}
        />,
    );
};

const notified = new Set<string>();

async function maybeNotify(user: User) {
    if (!settings.store.notifyOnFlaggedDm || shouldSkipUser(user) || notified.has(user.id)) return;

    const verdict = await resolveVerdict(user.id).catch(() => null);
    if (!verdict || verdict.severity < settings.store.warnThreshold || notified.has(user.id)) return;
    notified.add(user.id);

    showNotification({
        title: `${user.username} is flagged on Rayward`,
        body: verdictTooltip(verdict).replace(/\n+/g, "\n"),
        icon: IconUtils.getUserAvatarURL(user, false, 128) ?? RAYWARD_MARK_URL,
        onClick: () => openReportModal(user.id),
    });
}

const dmRecipients = (channel: Channel | undefined) =>
    channel && DM_CHANNEL_TYPES.has(channel.type) ? channel.recipients ?? [] : [];

export default definePlugin({
    name: "Rayward",
    description: "Rayward for Discord: safety flags from Rayward sources in profiles, chat and the member list.",
    authors: [{ name: "MkSeven1", id: 1356781561277579465n }],
    tags: ["Privacy", "Utility", "Servers"],
    searchTerms: ["rayward", "catchthem", "rotector", "tase", "rab", "okappiki", "serversweep", "rolock", "rcr", "easi", "roblox", "safety"],

    settings,
    managedStyle,

    dependencies: [
        "CommandsAPI",
        "ContextMenuAPI",
        "MemberListDecoratorsAPI",
        "MessageAccessoriesAPI",
        "MessageDecorationsAPI",
        "MessageEventsAPI",
    ],

    settingsAboutComponent: () => (
        <div className={cl("scope", "about")}>
            <RaywardWordmark height={22} />
            <Paragraph>
                Checks Discord users against sources on <Link href={RAYWARD_SITE}>Rayward</Link>.
            </Paragraph>
            <Paragraph>
                You need your own Rayward API key, entered below.
            </Paragraph>
        </div>
    ),

    patches: [
        {
            find: ".SIDEBAR,disableToolbar:",
            predicate: () => settings.store.showInProfile,
            replacement: {
                match: /user:(\i),widgets:.{0,100}?\}\),/,
                replace: "$&$self.renderSection({userId:$1?.id}),",
            },
        },
        {
            find: '"UserProfilePopout");',
            predicate: () => settings.store.showInProfile,
            replacement: {
                match: /user:(\i),widgets:.{0,100}?\}\),/,
                replace: "$&$self.renderSection({userId:$1?.id}),",
            },
        },
    ],

    async start() {
        migrateLegacySettings();
        await Promise.all([loadAllCaches(), loadDismissed()]);
        interceptDirectSends();

        for (const key of LEGACY_STORAGE_KEYS) DataStore.del(key).catch(() => { });
    },

    stop() {
        restoreDirectSends();
        notified.clear();
        resetWarnings();
    },

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId?: string; }) {
            if (!channelId) return;
            const recipients = dmRecipients(ChannelStore.getChannel(channelId));

            for (const recipientId of recipients) {
                const user = UserStore.getUser(recipientId);
                if (!user || shouldSkipUser(user)) continue;
                void resolveVerdict(recipientId).catch(() => { });
                void maybeNotify(user);
            }
        },

        MESSAGE_CREATE({ message }: { message: Message; }) {
            if (!settings.store.notifyOnFlaggedDm || !message?.author) return;
            if (!dmRecipients(ChannelStore.getChannel(message.channel_id)).length) return;
            void maybeNotify(message.author as User);
        },
    },

    async onBeforeMessageSend(channelId: string) {
        if (!await guardFirstContact(channelId)) return { cancel: true };
    },

    contextMenus: {
        "user-context": reportMenuItem,
        "user-profile-actions": reportMenuItem,
        "user-profile-overflow-menu": reportMenuItem,
    },

    commands: [
        {
            name: "rayward",
            description: "Check a Discord user across Rayward sources (only you see the result)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [{
                name: "user",
                description: "The user to check. Defaults to yourself.",
                type: ApplicationCommandOptionType.USER,
                required: false,
            }],
            async execute(args, ctx) {
                const userId = findOption<string>(args, "user") ?? UserStore.getCurrentUser().id;
                try {
                    const data = await resolveData(userId, true);
                    sendEmbed(ctx.channel.id, data.blocking
                        ? noticeEmbed("Rayward check unavailable", data.blocking)
                        : userEmbed(data, UserStore.getUser(userId), userId));
                } catch (e) {
                    sendEmbed(ctx.channel.id, noticeEmbed("Rayward check failed", toRaywardError(e)));
                }
            },
        },
        ...(["user", "group"] as const).map(kind => ({
            name: kind === "user" ? "rayward-roblox" : "rayward-group",
            description: `Check a Roblox ${kind} across Rayward sources (only you see the result)`,
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [{
                name: "id",
                description: `Roblox ${kind} ID`,
                type: ApplicationCommandOptionType.STRING,
                required: true,
            }],
            async execute(args, ctx) {
                const id = findOption<string>(args, "id")?.trim() ?? "";
                if (!/^\d{1,20}$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
                    sendEmbed(ctx.channel.id, noticeEmbed("Enter a valid Roblox ID", `"${id}" isn't a Roblox ${kind} ID. IDs are numbers only.`));
                    return;
                }
                try {
                    const [lookup, avatar] = await Promise.all([
                        lookupNow(kind === "user" ? "roblox" : "group", id),
                        kind === "user" && settings.store.enableRobloxProfiles ? robloxAvatarStore.prefetch(id) : null,
                    ]);
                    sendEmbed(ctx.channel.id, lookupEmbed(kind, id, lookup, avatar));
                } catch (e) {
                    sendEmbed(ctx.channel.id, noticeEmbed("Rayward check failed", toRaywardError(e)));
                }
            },
        })),
    ],

    toolboxActions: {
        "Rayward: Check yourself"() {
            openReportModal(UserStore.getCurrentUser().id);
        },
        async "Rayward: Clear cache"() {
            await clearAllCaches();
            resetWarnings();
            showToast({ text: "Rayward cache cleared", variant: "success" });
        },
        async "Rayward: Reset send warnings"() {
            await clearDismissed();
            showToast({ text: "Send warnings are back on for everyone", variant: "success" });
        },
    },

    renderSection: ErrorBoundary.wrap(({ userId }: { userId?: string; }) => {
        if (!userId || !settings.store.showInProfile) return null;
        if (settings.store.ignoreBots && UserStore.getUser(userId)?.bot) return null;
        return <Section userId={userId} />;
    }, { noop: true }),

    renderMemberListDecorator: ({ user }) => {
        if (!settings.store.showMemberListIndicator || shouldSkipUser(user)) return null;
        return <Indicator user={user} />;
    },

    renderMessageDecoration: ({ message }) => {
        if (!settings.store.showMessageIndicator || shouldSkipUser(message?.author as User)) return null;
        return <Indicator user={message.author as User} />;
    },

    renderMessageAccessory: ({ message }) => {
        if (!settings.store.warnInChat) return null;
        return <ChatWarning message={message} />;
    },
});

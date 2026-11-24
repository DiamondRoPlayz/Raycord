/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const classNameFactory = prefix => (...names) => names.filter(Boolean).map(name => prefix + name).join(" ");

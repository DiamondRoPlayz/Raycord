/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const store = new Map();

export const get = async key => store.get(key);
export const set = async (key, value) => void store.set(key, value);
export const del = async key => void store.delete(key);

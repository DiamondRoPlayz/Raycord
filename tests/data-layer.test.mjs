/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(here, "..");
const stub = name => ({ path: join(here, "stubs", name) });

const flagTypes = [
    { value: 0, name: "Safe", description: "", safeToAction: false, severity: 0, tone: "safe", isFlagged: false },
    { value: 2, name: "Confirmed", description: "", safeToAction: true, severity: 9, tone: "unsafe", isFlagged: true },
];
const capabilities = batch => ({ lookup: true, batch, reasons: true, membership: false, discord: true, groups: false });
const providers = [
    { id: "rotector", name: "Rotector", description: "", defaultEnabled: true, order: 1, capabilities: capabilities(true), flagTypes },
    { id: "tase", name: "TASE", description: "", defaultEnabled: true, order: 2, capabilities: capabilities(true), flagTypes },
    { id: "rab", name: "RAB", description: "", defaultEnabled: true, order: 3, capabilities: capabilities(false), flagTypes },
];

const FLAGGED_USER = "111";
const CLEAN_USER = "222";
const calls = new Map();
const callsTo = provider => calls.get(provider) ?? 0;

function fakeRayward(url, init) {
    const { pathname } = new URL(url);
    const json = (status, body) => new Response(JSON.stringify(body), { status });

    if (pathname === "/v2/providers") return json(200, { success: true, data: providers });

    const [, , , provider] = pathname.split("/");
    calls.set(provider, callsTo(provider) + 1);

    if (provider === "tase") return json(500, { success: false, error: "Database error", type: "DatabaseError", requestId: "req-1" });
    if (provider === "rab") throw Object.assign(new Error("timed out"), { name: "TimeoutError" });

    const { ids } = JSON.parse(init.body);
    return json(200, {
        success: true,
        data: Object.fromEntries(ids.map(id => [id, {
            id,
            flagType: id === FLAGGED_USER ? 2 : 0,
            reasons: id === FLAGGED_USER ? [{ type: "condo", title: "Condo games", sources: [] }] : [],
        }])),
    });
}

let hooks;
const realFetch = globalThis.fetch;

before(async () => {
    const outdir = await mkdtemp(join(tmpdir(), "rayward-test-"));
    const outfile = join(outdir, "hooks.mjs");

    await build({
        entryPoints: [join(pluginRoot, "data", "hooks.ts")],
        bundle: true,
        format: "esm",
        platform: "node",
        outfile,
        logLevel: "error",
        plugins: [{
            name: "vencord-stubs",
            setup(b) {
                b.onResolve({ filter: /^@api\/DataStore$/ }, () => stub("datastore.mjs"));
                b.onResolve({ filter: /^@webpack\/common$/ }, () => stub("webpack-common.mjs"));
                b.onResolve({ filter: /^@utils\/css$/ }, () => stub("css.mjs"));
                b.onResolve({ filter: /^@utils\/Logger$/ }, () => stub("logger.mjs"));
                b.onResolve({ filter: /\/settings$/ }, () => stub("settings.mjs"));
            },
        }],
    });

    globalThis.VencordNative = undefined;
    globalThis.fetch = async (url, init) => fakeRayward(url, init);
    hooks = await import(pathToFileURL(outfile).href);
});

after(() => {
    globalThis.fetch = realFetch;
});

test("keeps results from healthy sources when others fail", async () => {
    const data = await hooks.resolveData(FLAGGED_USER);
    const byId = Object.fromEntries(data.discord.outcomes.map(o => [o.provider.id, o]));

    assert.equal(data.state, "ready");
    assert.equal(data.blocking, undefined);
    assert.equal(byId.rotector.state, "ok");
    assert.equal(byId.rotector.result.flagType, 2);
    assert.equal(byId.tase.state, "error");
    assert.equal(byId.tase.error.kind, "server");
    assert.equal(byId.rab.state, "error");
    assert.equal(byId.rab.error.kind, "timeout");
});

test("builds the verdict from the sources that answered", async () => {
    const { verdict } = await hooks.resolveData(FLAGGED_USER);

    assert.equal(verdict.severity, 4);
    assert.equal(verdict.tone, "unsafe");
    assert.deepEqual(verdict.contributions.map(c => c.providerId), ["rotector"]);
    assert.deepEqual(verdict.findings.map(f => [f.providerId, f.label, f.reasons]), [["rotector", "Confirmed", ["Condo games"]]]);
    assert.deepEqual(verdict.failed.map(f => f.providerId).sort(), ["rab", "tase"]);
});

test("retries transient failures before giving up", () => {
    assert.equal(callsTo("tase"), 3);
    assert.equal(callsTo("rab"), 3);
    assert.equal(callsTo("rotector"), 1);
});

test("waits out the backoff instead of refetching a failing source", async () => {
    const before = { tase: callsTo("tase"), rab: callsTo("rab") };
    await hooks.resolveData(FLAGGED_USER);

    assert.equal(callsTo("tase"), before.tase);
    assert.equal(callsTo("rab"), before.rab);
});

test("a clean user stays clean while sources are down", async () => {
    const { verdict } = await hooks.resolveData(CLEAN_USER);

    assert.equal(verdict.severity, 0);
    assert.equal(verdict.tone, "safe");
    assert.equal(verdict.contributions.length, 0);
    assert.equal(verdict.failed.length, 2);
});

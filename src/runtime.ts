/**
 * Cubby Runtime — Postgres-backed, namespace-isolated
 *
 * Same CubbyClient interface as HiringPipeline.
 * Reads/writes persist to `cubbies` table with version tracking.
 * Namespace prefix isolates Kenzi tab from Clean tab.
 */

import type { Context, CubbyClient, VectorMatch, FetchResponse } from './types/index.js';
import { query } from './db/connection.js';

// Shared cache for clean namespace — ensures dumpCubbies() sees clean data
const _cleanCache = new Map<string, unknown>();
export function setCleanCache(path: string, value: unknown) { _cleanCache.set(path, value); }
export function clearCleanCache() { _cleanCache.clear(); }

class PgCubby {
    private prefix: string;
    private cache: Map<string, unknown> = new Map();

    constructor(prefix = '') {
        this.prefix = prefix;
    }

    private fullPath(path: string): string {
        const clean = path.startsWith('/') ? path.slice(1) : path;
        return this.prefix ? `${this.prefix}/${clean}` : clean;
    }

    async loadAll(): Promise<void> {
        const pattern = this.prefix ? `${this.prefix}/%` : '%';
        const res = await query(`SELECT path, data FROM cubbies WHERE path LIKE $1`, [pattern]);
        for (const row of res.rows) {
            this.cache.set(row.path, row.data);
        }
    }

    /** Create a scoped CubbyClient view for a specific cubby namespace */
    scoped(scope: string): CubbyClient {
        const self = this;
        const scopePrefix = this.prefix ? `${this.prefix}/${scope}` : scope;

        return {
            json: {
                get(path: string): unknown {
                    const full = path.startsWith('/') ? `${scopePrefix}${path}` : `${scopePrefix}/${path}`;
                    return self.cache.get(full) ?? null;
                },
                set(path: string, value: unknown): void {
                    const full = path.startsWith('/') ? `${scopePrefix}${path}` : `${scopePrefix}/${path}`;
                    self.cache.set(full, value);
                    // Async persist — fire and forget for speed, agent doesn't await
                    self.persist(full, value).catch(err => console.error('[CUBBY PERSIST ERROR]', err));
                },
                delete(path: string): void {
                    const full = path.startsWith('/') ? `${scopePrefix}${path}` : `${scopePrefix}/${path}`;
                    self.cache.delete(full);
                    query(`DELETE FROM cubbies WHERE path = $1`, [full]).catch(() => {});
                },
                exists(path: string): boolean {
                    const full = path.startsWith('/') ? `${scopePrefix}${path}` : `${scopePrefix}/${path}`;
                    return self.cache.has(full);
                },
                mget(paths: string[]): Record<string, unknown> {
                    const result: Record<string, unknown> = {};
                    for (const p of paths) {
                        const full = p.startsWith('/') ? `${scopePrefix}${p}` : `${scopePrefix}/${p}`;
                        result[p] = self.cache.get(full) ?? null;
                    }
                    return result;
                },
                mset(items: Record<string, unknown>): void {
                    for (const [k, v] of Object.entries(items)) {
                        const full = k.startsWith('/') ? `${scopePrefix}${k}` : `${scopePrefix}/${k}`;
                        self.cache.set(full, v);
                        self.persist(full, v).catch(() => {});
                    }
                },
                keys(pattern?: string): string[] {
                    const allKeys = Array.from(self.cache.keys())
                        .filter(k => k.startsWith(scopePrefix))
                        .map(k => k.slice(scopePrefix.length));
                    if (!pattern) return allKeys;
                    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                    return allKeys.filter(k => regex.test(k.startsWith('/') ? k.slice(1) : k));
                },
                incr(path: string, delta = 1): number {
                    const full = path.startsWith('/') ? `${scopePrefix}${path}` : `${scopePrefix}/${path}`;
                    const current = (self.cache.get(full) as number) || 0;
                    const next = current + delta;
                    self.cache.set(full, next);
                    self.persist(full, next).catch(() => {});
                    return next;
                },
            },
            vector: {
                createIndex(): void {},
                add(): void {},
                search(): VectorMatch[] { return []; },
                get(): unknown { return undefined; },
                delete(): void {},
                exists(): boolean { return false; },
                count(): number { return 0; },
            },
        };
    }

    private async persist(path: string, data: unknown): Promise<void> {
        const json = JSON.stringify(data);
        // Mirror clean/ writes to shared cache for dumpCubbies()
        if (path.startsWith('clean/')) {
            _cleanCache.set(path, data);
        }
        await query(
            `INSERT INTO cubbies (path, data, version, updated_at) VALUES ($1, $2::jsonb, 1, NOW())
             ON CONFLICT (path) DO UPDATE SET data = $2::jsonb, version = cubbies.version + 1, updated_at = NOW()`,
            [path, json]
        );
        // Version history
        const verRes = await query(`SELECT version FROM cubbies WHERE path = $1`, [path]);
        const version = verRes.rows[0]?.version || 1;
        await query(
            `INSERT INTO cubby_versions (path, data, version, changed_by, changed_at) VALUES ($1, $2::jsonb, $3, 'agent', NOW())`,
            [path, json, version]
        );
    }

    /** Dump all cached data */
    dump(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [k, v] of this.cache.entries()) {
            if (!this.prefix || k.startsWith(this.prefix)) {
                result[k] = v;
            }
        }
        return result;
    }

    /** Get tree structure for cubby inspector */
    getTree(): Array<{ path: string; preview: string }> {
        return Array.from(this.cache.entries())
            .filter(([k]) => !this.prefix || k.startsWith(this.prefix))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([path, data]) => {
                const d = data as Record<string, unknown>;
                const preview = d.title ? String(d.title) : d.id ? String(d.id) : JSON.stringify(data).slice(0, 80);
                return { path, preview };
            });
    }

    /** Clear all entries (for demo reset) */
    async clear(prefixFilter?: string): Promise<void> {
        const filter = prefixFilter || this.prefix;
        if (filter) {
            const pattern = `${filter}/%`;
            await query(`DELETE FROM cubbies WHERE path LIKE $1`, [pattern]);
            for (const key of this.cache.keys()) {
                if (key.startsWith(filter)) this.cache.delete(key);
            }
        } else {
            await query(`DELETE FROM cubbies`);
            this.cache.clear();
        }
    }
}

// Global cubby instance
const globalCubby = new PgCubby();

/** Load all cubbies from Postgres into cache */
export async function initRuntime(): Promise<void> {
    await globalCubby.loadAll();
    // Load clean namespace entries into shared cache
    _cleanCache.clear();
    const cleanRes = await query(`SELECT path, data FROM cubbies WHERE path LIKE 'clean/%'`);
    for (const row of cleanRes.rows) {
        _cleanCache.set(row.path, row.data);
    }
    console.log(`[RUNTIME] Loaded ${globalCubby.getTree().length} cubby entries + ${_cleanCache.size} clean entries`);
}

/** Create a Context for agent execution */
export function createContext(namespace = ''): { context: Context; logs: string[] } {
    const logs: string[] = [];
    // Use global cubby with namespace prefix so dumpCubbies() sees everything
    const cubbyInstance = namespace ? new PgCubby(namespace) : globalCubby;

    // Load namespace cubbies if different from global
    if (namespace) {
        cubbyInstance.loadAll().catch(() => {});
    }

    const context: Context = {
        log: (...args: unknown[]) => {
            const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            logs.push(message);
            console.log(`[AGENT${namespace ? ':' + namespace : ''}]`, message);
        },

        emit: (eventType: string, payload: object) => {
            logs.push(`[EMIT] ${eventType}: ${JSON.stringify(payload).slice(0, 200)}`);
        },

        fetch: async (url: string, options?: RequestInit): Promise<FetchResponse> => {
            const res = await fetch(url, options);
            const data = await res.json() as Record<string, unknown>;
            return { ok: res.ok, status: res.status, data };
        },

        agents: {},  // Populated by caller

        cubby: (name: string): CubbyClient => {
            return cubbyInstance.scoped(name);
        },
    };

    return { context, logs };
}

/** Get cubby dump for inspector */
export function dumpCubbies(namespace = ''): Record<string, unknown> {
    const dump = globalCubby.dump();
    // Also merge any clean/ entries from Postgres that aren't in global cache
    // (clean namespace uses separate PgCubby instance)
    if (_cleanCache) {
        for (const [k, v] of _cleanCache.entries()) {
            dump[k] = v;
        }
    }
    if (namespace) {
        const filtered: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(dump)) {
            if (k.startsWith(namespace)) filtered[k] = v;
        }
        return filtered;
    }
    return dump;
}

// (moved _cleanCache declaration to top of file)

/** Get cubby tree for inspector */
export function getCubbyTree(namespace = ''): Array<{ path: string; preview: string }> {
    const tree = globalCubby.getTree();
    if (namespace) return tree.filter(t => t.path.startsWith(namespace));
    return tree;
}

/** Get single cubby entry */
export function getCubby(path: string): unknown {
    return globalCubby.dump()[path] ?? null;
}

/** Reset cubbies for demo */
export async function resetCubbies(namespace = ''): Promise<void> {
    await globalCubby.clear(namespace || undefined);
}

/** Get version history for a cubby path */
export async function getCubbyHistory(path: string): Promise<Array<{ version: number; data: unknown; changed_by: string; changed_at: string }>> {
    const res = await query(
        `SELECT version, data, changed_by, changed_at FROM cubby_versions WHERE path = $1 ORDER BY version DESC LIMIT 20`,
        [path]
    );
    return res.rows;
}

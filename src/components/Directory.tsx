"use client";

/**
 * Users and devices are needed on almost every admin page (owner names, device pickers, counts),
 * so they are loaded once here and shared. Call `refresh()` after a change.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import type { DeviceConfig, User } from "@/lib/types";
import { deviceOwnerId } from "@/lib/utils";

interface Directory {
    users: User[];
    devices: DeviceConfig[];
    loaded: boolean;
    error: string;
    userById: Map<string, User>;
    deviceById: Map<string, DeviceConfig>;
    /** Devices per owner id */
    devicesByOwner: Map<string, DeviceConfig[]>;
    refresh: () => Promise<void>;
}

const Ctx = createContext<Directory | null>(null);

export function DirectoryProvider({ children }: { children: React.ReactNode }) {
    const [users, setUsers] = useState<User[]>([]);
    const [devices, setDevices] = useState<DeviceConfig[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        try {
            const [u, d] = await Promise.all([api<{ users: User[] }>("/api/admin/users"), api<{ devices: DeviceConfig[] }>("/api/admin/devices")]);
            setUsers(u.users || []);
            setDevices(d.devices || []);
            setError("");
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const value = useMemo<Directory>(() => {
        const userById = new Map<string, User>();
        for (const u of users) {
            userById.set(String(u._id), u);
            if (u.userId8) userById.set(u.userId8, u);
        }
        const deviceById = new Map(devices.map((d) => [d._id, d]));
        const devicesByOwner = new Map<string, DeviceConfig[]>();
        for (const d of devices) {
            const raw = deviceOwnerId(d);
            // Owner may be stored as Mongo _id or userId8 (older firmware)
            const owner = raw ? String(userById.get(raw)?._id || raw) : "";
            if (!devicesByOwner.has(owner)) devicesByOwner.set(owner, []);
            devicesByOwner.get(owner)!.push(d);
        }
        return { users, devices, loaded, error, userById, deviceById, devicesByOwner, refresh };
    }, [users, devices, loaded, error, refresh]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDirectory(): Directory {
    const v = useContext(Ctx);
    if (!v) throw new Error("useDirectory must be used inside DirectoryProvider");
    return v;
}

/** Owner name linking to the user page; falls back to the raw id. */
export function UserLink({ id, fallback, className }: { id?: string | null; fallback?: string; className?: string }) {
    const { userById, loaded } = useDirectory();
    if (!id) return <span className="text-zinc-400">{fallback || "Unassigned"}</span>;
    const u = userById.get(String(id));
    if (!u) return <span className={className ?? "font-mono text-xs text-zinc-500"} title={String(id)}>{loaded ? fallback || `${String(id).slice(0, 10)}…` : "…"}</span>;
    return (
        <Link href={`/users/${u._id}`} className={className ?? "font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"} title={u.email}>
            {u.name || u.email}
        </Link>
    );
}

export function DeviceLink({ id, className }: { id?: string | null; className?: string }) {
    if (!id) return <span className="text-zinc-400">—</span>;
    return (
        <Link href={`/devices/${encodeURIComponent(id)}`} className={className ?? "font-mono text-xs font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"}>
            {id}
        </Link>
    );
}

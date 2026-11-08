import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/* -------- Time helpers -------- */
export function objectIdToMs(oid: unknown): number | null {
    if (!oid || typeof oid !== "string" || oid.length < 8) return null;
    const sec = parseInt(oid.slice(0, 8), 16);
    return Number.isFinite(sec) ? sec * 1000 : null;
}

/** Best timestamp of a Mongo document (createdAt/ts/timestamp, falling back to the ObjectId). */
export function docMs(doc: any): number | null {
    if (!doc) return null;
    const t = doc.createdAt || doc.ts || doc.timestamp || doc.updatedAt || null;
    if (t) {
        const ms = new Date(t).getTime();
        if (Number.isFinite(ms)) return ms;
    }
    return objectIdToMs(doc._id);
}

export function timeAgo(ms: number | null | undefined): string {
    if (!ms) return "Never";
    const sec = Math.floor((Date.now() - ms) / 1000);
    if (sec < 5) return "Just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(ms).toLocaleDateString();
}

export function formatDateTime(v: unknown): string {
    if (!v) return "—";
    const d = new Date(v as string);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function formatDuration(sec: number): string {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d) return `${d}d ${h}h ${m}m`;
    if (h) return `${h}h ${m}m`;
    return `${m}m ${Math.floor(sec % 60)}s`;
}

export function formatNumber(n: unknown): string {
    return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString() : "—";
}

export function formatValue(v: unknown): string {
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
}

/** Must match the backend's DEVICE_OFFLINE_THRESHOLD_SEC (default 300s). */
export const DEVICE_OFFLINE_MS = 300_000;

/* -------- Device helpers (mirror backend services/deviceState) -------- */
export function deviceOwnerId(config: any): string | null {
    const id = config?.device?.user_id ?? config?.user_id;
    return id == null || id === "" ? null : String(id);
}

export function isActuatorAuto(actuator: any): boolean {
    if (!actuator || typeof actuator !== "object") return false;
    if (typeof actuator.auto === "boolean") return actuator.auto;
    return actuator.default?.auto === true;
}

/** Normalise the many ways firmware reports an on/off actuator. */
export function toOnOff(v: any): "ON" | "OFF" {
    if (v && typeof v === "object") return toOnOff(v.state ?? v.status ?? v.value);
    const s = String(v ?? "").toUpperCase();
    return s === "ON" || s === "1" || s === "TRUE" || s === "HIGH" ? "ON" : "OFF";
}

export function sensorNames(config: any): string[] {
    const s = config?.sensors;
    if (Array.isArray(s)) return s.map((x) => (typeof x === "string" ? x : x?.name || x?.key || JSON.stringify(x)));
    if (s && typeof s === "object") return Object.keys(s);
    return [];
}

const ACRONYMS = new Set(["rssi", "ph", "uv", "led", "tds", "ec", "ppm", "voc", "id", "ac", "dc", "pir", "ldr", "npk", "ip", "mqtt", "cpu"]);

/** "soil_moisture" / "soilMoisture" -> "Soil moisture"; codes stay upper case ("CO2", "RSSI"). */
export function humanizeKey(key: string): string {
    const words = String(key)
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_\-.]+/g, " ")
        .trim()
        .split(/\s+/);
    const s = words.map((w) => (ACRONYMS.has(w.toLowerCase()) || /\d/.test(w) ? w.toUpperCase() : w.toLowerCase())).join(" ");
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "USER_ROLE_UPDATE" -> "User role update" */
export function humanizeAction(a: string): string {
    return humanizeKey(String(a || "").toLowerCase());
}

/* -------- CSV export (client side) -------- */
export function downloadCsv(filename: string, rows: Record<string, unknown>[], columns?: string[]) {
    const cols = columns || Array.from(rows.reduce((s, r) => (Object.keys(r).forEach((k) => s.add(k)), s), new Set<string>()));
    const esc = (v: unknown) => {
        const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function matches(query: string, ...fields: unknown[]): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return fields.some((f) => f !== null && f !== undefined && String(f).toLowerCase().includes(q));
}

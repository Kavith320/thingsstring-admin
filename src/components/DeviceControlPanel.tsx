"use client";

import { useState } from "react";
import { Braces, Power, Sliders } from "lucide-react";
import { Badge, Button, EmptyState, Switch, Textarea, useToast } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import type { Actuator, ControlDoc, DeviceConfig } from "@/lib/types";
import { cn, humanizeKey, isActuatorAuto, toOnOff } from "@/lib/utils";

const META_FIELDS = new Set(["default", "type", "auto", "state", "status", "label", "name", "pin", "unit", "min", "max"]);

/** How this actuator reports on/off: `state: "ON"|"OFF"` (current firmware) or `status: boolean` (older). */
function onOffField(a: Actuator): "state" | "status" | null {
    if (typeof a.state === "string" || typeof a.default?.state === "string") return "state";
    if (typeof a.status === "boolean" || typeof a.default?.status === "boolean") return "status";
    return null;
}

/**
 * Admin override control. Works on locked devices (the admin route skips the lockout check).
 * Each change is validated by the backend against config.actuators and published over MQTT.
 */
export function DeviceControlPanel({ deviceId, config, control, onChange }: { deviceId: string; config: DeviceConfig; control: ControlDoc | null; onChange: (c: ControlDoc) => void }) {
    const toast = useToast();
    const [busy, setBusy] = useState<string | null>(null);
    const [rawFor, setRawFor] = useState<string | null>(null);

    // Every actuator in the config, with its live control state on top
    const names = Object.keys(config.actuators || {});
    const merged: Record<string, Actuator> = Object.fromEntries(names.map((n) => [n, { ...(config.actuators?.[n] || {}), ...(control?.actuators?.[n] || {}) }]));

    async function send(name: string, patch: Record<string, unknown>) {
        setBusy(name);
        try {
            const r = await api<{ control: ControlDoc }>(`/api/admin/devices/${encodeURIComponent(deviceId)}/control`, { method: "POST", body: { actuators: { [name]: patch } } });
            onChange(r.control);
            toast(`${humanizeKey(name)} updated`);
            return true;
        } catch (e) {
            toast(errorMessage(e), "error");
            return false;
        } finally {
            setBusy(null);
        }
    }

    if (!names.length) return <EmptyState icon={Power} title="No actuators" description="This device's config doesn't declare any actuators." />;

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {names.map((name) => {
                const a = merged[name];
                const field = onOffField(a);
                const on = field === "state" ? toOnOff(a.state ?? a.default?.state) === "ON" : field === "status" ? Boolean(a.status ?? a.default?.status) : false;
                const auto = isActuatorAuto(a);
                const numeric = Object.entries(a).filter(([k, v]) => !META_FIELDS.has(k) && typeof v === "number");
                const loading = busy === name;
                return (
                    <div key={name} className={cn("rounded-2xl border p-4 transition", on ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-zinc-200 dark:border-zinc-800", loading && "opacity-70")}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={cn("h-2 w-2 rounded-full", on ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600")} aria-hidden />
                                    <span className="truncate font-semibold text-zinc-900 dark:text-white">{humanizeKey(name)}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {field ? <Badge tone={on ? "green" : "neutral"}>{on ? "ON" : "OFF"}</Badge> : <Badge>Custom</Badge>}
                                    {auto ? <Badge tone="indigo">AUTO</Badge> : <Badge>MANUAL</Badge>}
                                    {a.type && <span className="font-mono text-[11px] text-zinc-400">{a.type}</span>}
                                </div>
                            </div>
                            {field && <Switch checked={on} disabled={loading} label={`Turn ${name} ${on ? "off" : "on"}`} onChange={(v) => send(name, { [field]: field === "state" ? (v ? "ON" : "OFF") : v })} />}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-800">
                            <span className="text-zinc-600 dark:text-zinc-400" title="AUTO lets schedules and automations drive it; MANUAL leaves it alone">
                                Automatic mode
                            </span>
                            <Switch size="xs" checked={auto} disabled={loading} label={`${name} automatic mode`} onChange={(v) => send(name, { auto: v })} />
                        </div>

                        {numeric.map(([k, v]) => (
                            <NumericField key={k} label={humanizeKey(k)} value={v as number} min={typeof a.min === "number" ? a.min : 0} max={typeof a.max === "number" ? a.max : k === "speed" || k === "brightness" || k === "level" ? 100 : 255} disabled={loading} onCommit={(n) => send(name, { [k]: n })} />
                        ))}

                        {auto && field && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">In AUTO mode a schedule or automation may change this again.</p>}

                        <div className="mt-3">
                            {rawFor === name ? (
                                <RawPatch name={name} onCancel={() => setRawFor(null)} onSend={async (p) => (await send(name, p)) && setRawFor(null)} loading={loading} />
                            ) : (
                                <button type="button" onClick={() => setRawFor(name)} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
                                    <Braces className="h-3.5 w-3.5" /> Send custom fields
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function NumericField({ label, value, min, max, disabled, onCommit }: { label: string; value: number; min: number; max: number; disabled?: boolean; onCommit: (n: number) => void }) {
    const [v, setV] = useState(value);
    const [seen, setSeen] = useState(value);
    if (seen !== value) {
        setSeen(value);
        setV(value);
    }
    const commit = () => v !== value && Number.isFinite(v) && onCommit(v);
    return (
        <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-medium text-zinc-600 dark:text-zinc-400">
                    <Sliders className="h-3 w-3" /> {label}
                </span>
                <input
                    type="number"
                    value={Number.isFinite(v) ? v : ""}
                    onChange={(e) => setV(Number(e.target.value))}
                    onBlur={commit}
                    onKeyDown={(e) => e.key === "Enter" && commit()}
                    disabled={disabled}
                    aria-label={`${label} value`}
                    className="h-7 w-20 rounded-lg border border-zinc-200 bg-white px-2 text-right font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                />
            </div>
            <input type="range" min={Math.min(min, v)} max={Math.max(max, v)} value={v} disabled={disabled} onChange={(e) => setV(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} aria-label={label} className="w-full accent-indigo-600" />
        </div>
    );
}

function RawPatch({ name, onSend, onCancel, loading }: { name: string; onSend: (p: Record<string, unknown>) => void; onCancel: () => void; loading: boolean }) {
    const [text, setText] = useState('{\n  "state": "ON"\n}');
    const [error, setError] = useState("");
    function submit() {
        try {
            const p = JSON.parse(text);
            if (!p || typeof p !== "object" || Array.isArray(p) || !Object.keys(p).length) throw new Error("Enter a JSON object with at least one field");
            setError("");
            onSend(p);
        } catch (e) {
            setError(errorMessage(e));
        }
    }
    return (
        <div className="space-y-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-20 font-mono text-xs" aria-label={`Custom fields for ${name}`} spellCheck={false} />
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
                <Button size="sm" onClick={onCancel}>
                    Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={submit} loading={loading}>
                    Send
                </Button>
            </div>
        </div>
    );
}


"use client";

import { useMemo, useState } from "react";
import { History, Send, Target } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, PageHeader, SearchInput, Segmented, Select, Switch, Textarea, useConfirm, useToast } from "@/components/ui";
import { DeviceLink, useDirectory } from "@/components/Directory";
import { AuditRows } from "@/components/AuditList";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { AuditLog, DeviceConfig } from "@/lib/types";
import { cn, deviceOwnerId, matches } from "@/lib/utils";

type TargetMode = "all" | "model" | "owner" | "devices" | "custom";
type Command = "on" | "off" | "auto" | "manual" | "custom";

const COMMANDS: { value: Command; label: string; patch?: Record<string, unknown> }[] = [
    { value: "on", label: "Turn ON", patch: { state: "ON" } },
    { value: "off", label: "Turn OFF", patch: { state: "OFF" } },
    { value: "auto", label: "Set AUTO", patch: { auto: true } },
    { value: "manual", label: "Set MANUAL", patch: { auto: false } },
    { value: "custom", label: "Custom" },
];

export default function BroadcastPage() {
    const dir = useDirectory();
    const toast = useToast();
    const confirm = useConfirm();
    const history = useApi<{ logs: AuditLog[] }>("/api/admin/audit-logs?action=BROADCAST_CONTROL&limit=20");

    const [mode, setMode] = useState<TargetMode>("all");
    const [model, setModel] = useState("");
    const [owner, setOwner] = useState("");
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [deviceQuery, setDeviceQuery] = useState("");
    const [customFilter, setCustomFilter] = useState('{\n  "device.model": "ESP32"\n}');
    const [skipLocked, setSkipLocked] = useState(true);
    const [actuator, setActuator] = useState("");
    const [command, setCommand] = useState<Command>("off");
    const [customPatch, setCustomPatch] = useState('{\n  "state": "OFF",\n  "auto": false\n}');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const models = useMemo(() => [...new Set(dir.devices.map((d) => d.device?.model).filter(Boolean) as string[])].sort(), [dir.devices]);
    const owners = useMemo(() => dir.users.filter((u) => dir.devicesByOwner.get(String(u._id))?.length), [dir.users, dir.devicesByOwner]);

    /** The Mongo filter sent to the backend (over device_config). */
    const filter = useMemo<{ value: Record<string, unknown> | null; error?: string }>(() => {
        let base: Record<string, unknown> = {};
        if (mode === "model") base = model ? { "device.model": model } : {};
        if (mode === "owner") {
            const u = owner ? dir.userById.get(owner) : undefined;
            // Device configs store the owner as the Mongo _id (or userId8 on older firmware)
            base = u ? { "device.user_id": { $in: [String(u._id), u.userId8].filter(Boolean) } } : {};
        }
        if (mode === "devices") base = { _id: { $in: [...picked] } };
        if (mode === "custom") {
            try {
                const parsed = JSON.parse(customFilter || "{}");
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { value: null, error: "Filter must be a JSON object" };
                base = parsed;
            } catch (e) {
                return { value: null, error: errorMessage(e) };
            }
        }
        if (!skipLocked) return { value: base };
        return { value: Object.keys(base).length ? { $and: [base, { isDisabled: { $ne: true } }] } : { isDisabled: { $ne: true } } };
    }, [mode, model, owner, picked, customFilter, skipLocked, dir.userById]);

    /** Client-side preview of matched devices (exact for the built-in modes). */
    const matched = useMemo<DeviceConfig[] | null>(() => {
        if (mode === "custom") return null;
        return dir.devices.filter((d) => {
            if (skipLocked && d.isDisabled) return false;
            if (mode === "model") return !model || d.device?.model === model;
            if (mode === "owner") {
                const u = owner ? dir.userById.get(owner) : undefined;
                const o = deviceOwnerId(d);
                return !u || o === String(u._id) || o === u.userId8;
            }
            if (mode === "devices") return picked.has(d._id);
            return true;
        });
    }, [mode, model, owner, picked, skipLocked, dir.devices, dir.userById]);

    const actuatorOptions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const d of matched || dir.devices) for (const a of Object.keys(d.actuators || {})) counts.set(a, (counts.get(a) || 0) + 1);
        return [...counts].sort((a, b) => b[1] - a[1]);
    }, [matched, dir.devices]);

    const affected = matched && actuator ? matched.filter((d) => d.actuators && Object.prototype.hasOwnProperty.call(d.actuators, actuator)) : null;

    const patch = useMemo<{ value: Record<string, unknown> | null; error?: string }>(() => {
        const preset = COMMANDS.find((c) => c.value === command)?.patch;
        if (preset) return { value: preset };
        try {
            const p = JSON.parse(customPatch);
            if (!p || typeof p !== "object" || Array.isArray(p) || !Object.keys(p).length) return { value: null, error: "Enter a JSON object with at least one field" };
            return { value: p };
        } catch (e) {
            return { value: null, error: errorMessage(e) };
        }
    }, [command, customPatch]);

    const ready = !!actuator.trim() && !!patch.value && !!filter.value && !(mode === "devices" && picked.size === 0) && !(mode === "model" && !model) && !(mode === "owner" && !owner);

    async function send() {
        if (!ready) return;
        const body = { actuators: { [actuator.trim()]: patch.value }, filter: filter.value };
        const ok = await confirm({
            title: "Send broadcast command?",
            message: (
                <div className="space-y-3">
                    <p>
                        Sets <b className="font-mono">{actuator}</b> to <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">{JSON.stringify(patch.value)}</code> on{" "}
                        {affected ? <b>{affected.length} device{affected.length === 1 ? "" : "s"}</b> : "every device matching the custom filter that has this actuator"}. It&apos;s published over MQTT right away.
                    </p>
                    <pre className="max-h-40 overflow-auto rounded-lg bg-zinc-50 p-2 font-mono text-xs dark:bg-zinc-900">{JSON.stringify(body, null, 2)}</pre>
                </div>
            ),
            confirmLabel: "Send command",
            danger: true,
            typeToConfirm: (affected?.length ?? 0) > 10 || mode === "all" || mode === "custom" ? "BROADCAST" : undefined,
        });
        if (!ok) return;
        setSending(true);
        setError("");
        try {
            const r = await api<{ message: string; affectedCount: number }>("/api/admin/broadcast/control", { method: "POST", body });
            toast(r.message || `Sent to ${r.affectedCount} devices`);
            history.reload(true);
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setSending(false);
        }
    }

    const pickable = dir.devices.filter((d) => matches(deviceQuery, d._id, d.device?.model, dir.userById.get(deviceOwnerId(d) || "")?.email)).slice(0, 50);

    return (
        <div>
            <PageHeader title="Broadcast control" description="Send one actuator command to many devices at once. Devices without that actuator are skipped." />

            <div className="grid gap-5 lg:grid-cols-5">
                <div className="space-y-5 lg:col-span-3">
                    <Card>
                        <CardHeader title="1. Choose devices" icon={Target} />
                        <div className="space-y-4 p-4 sm:p-5">
                            <Segmented
                                label="Target"
                                value={mode}
                                onChange={setMode}
                                className="flex w-full flex-wrap sm:inline-flex sm:w-auto"
                                options={[
                                    { value: "all", label: "All devices" },
                                    { value: "model", label: "By model" },
                                    { value: "owner", label: "By owner" },
                                    { value: "devices", label: "Pick devices" },
                                    { value: "custom", label: "Custom filter" },
                                ]}
                            />
                            {mode === "model" && (
                                <Field label="Model">
                                    {(id) => (
                                        <Select id={id} value={model} onChange={(e) => setModel(e.target.value)}>
                                            <option value="">Choose a model…</option>
                                            {models.map((m) => (
                                                <option key={m} value={m}>
                                                    {m} ({dir.devices.filter((d) => d.device?.model === m).length})
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                </Field>
                            )}
                            {mode === "owner" && (
                                <Field label="Owner">
                                    {(id) => (
                                        <Select id={id} value={owner} onChange={(e) => setOwner(e.target.value)}>
                                            <option value="">Choose a user…</option>
                                            {owners.map((u) => (
                                                <option key={u._id} value={u._id}>
                                                    {u.name} · {u.email} ({dir.devicesByOwner.get(String(u._id))?.length})
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                </Field>
                            )}
                            {mode === "devices" && (
                                <div className="space-y-2">
                                    <SearchInput value={deviceQuery} onChange={setDeviceQuery} placeholder="Search devices…" />
                                    <ul className="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                                        {pickable.map((d) => (
                                            <li key={d._id}>
                                                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                                                    <input
                                                        type="checkbox"
                                                        checked={picked.has(d._id)}
                                                        onChange={(e) =>
                                                            setPicked((s) => {
                                                                const n = new Set(s);
                                                                if (e.target.checked) n.add(d._id);
                                                                else n.delete(d._id);
                                                                return n;
                                                            })
                                                        }
                                                        className="h-4 w-4 accent-indigo-600"
                                                    />
                                                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{d._id}</span>
                                                    <span className="truncate text-xs text-zinc-500">{d.device?.model}</span>
                                                    {d.isDisabled && <Badge tone="red">Locked</Badge>}
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-zinc-500">{picked.size} selected</p>
                                </div>
                            )}
                            {mode === "custom" && (
                                <Field label="MongoDB filter over device_config" hint="$where, $function, $accumulator and $expr are rejected by the server." error={filter.error}>
                                    {(id) => <Textarea id={id} value={customFilter} onChange={(e) => setCustomFilter(e.target.value)} className="min-h-28 font-mono text-xs" spellCheck={false} />}
                                </Field>
                            )}
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-white/5">
                                <div>
                                    <div className="text-sm font-medium">Skip locked-out devices</div>
                                    <div className="text-xs text-zinc-500">Admin commands otherwise reach locked devices too.</div>
                                </div>
                                <Switch checked={skipLocked} onChange={setSkipLocked} label="Skip locked-out devices" />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="2. Command" icon={Send} />
                        <div className="space-y-4 p-4 sm:p-5">
                            <Field label="Actuator" hint="Must match the actuator name in each device's config.">
                                {(id) => (
                                    <>
                                        <Input id={id} list="actuator-names" value={actuator} onChange={(e) => setActuator(e.target.value)} placeholder="e.g. fan, pump, relay1" className="font-mono" />
                                        <datalist id="actuator-names">
                                            {actuatorOptions.map(([a, n]) => (
                                                <option key={a} value={a}>{`${n} device${n === 1 ? "" : "s"}`}</option>
                                            ))}
                                        </datalist>
                                    </>
                                )}
                            </Field>
                            {actuatorOptions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {actuatorOptions.slice(0, 10).map(([a, n]) => (
                                        <button key={a} type="button" onClick={() => setActuator(a)} className={cn("rounded-full border px-3 py-1 font-mono text-xs", actuator === a ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800")}>
                                            {a} <span className="opacity-60">{n}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <Segmented label="Command" value={command} onChange={setCommand} className="flex w-full flex-wrap sm:inline-flex sm:w-auto" options={COMMANDS.map((c) => ({ value: c.value, label: c.label }))} />
                            {command === "custom" && (
                                <Field label="Fields to set" error={patch.error}>
                                    {(id) => <Textarea id={id} value={customPatch} onChange={(e) => setCustomPatch(e.target.value)} className="min-h-24 font-mono text-xs" spellCheck={false} />}
                                </Field>
                            )}
                            {command === "on" || command === "off" ? <p className="text-xs text-zinc-500">Sends <code className="font-mono">state</code>. Actuators in AUTO mode may be changed back by schedules or automations; set MANUAL first to hold the state.</p> : null}
                        </div>
                    </Card>
                </div>

                <div className="space-y-5 lg:col-span-2">
                    <Card className="lg:sticky lg:top-20">
                        <CardHeader title="Preview" />
                        <div className="space-y-4 p-4 sm:p-5">
                            {affected ? (
                                <div>
                                    <div className="text-3xl font-bold tabular-nums">{affected.length}</div>
                                    <div className="text-sm text-zinc-500">
                                        device{affected.length === 1 ? "" : "s"} will receive the command
                                        {matched && matched.length !== affected.length && ` (${matched.length - affected.length} matched but have no “${actuator}”)`}
                                    </div>
                                    {affected.length > 0 && (
                                        <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                                            {affected.slice(0, 30).map((d) => (
                                                <li key={d._id}>
                                                    <DeviceLink id={d._id} />
                                                </li>
                                            ))}
                                            {affected.length > 30 && <li className="text-xs text-zinc-500">+{affected.length - 30} more</li>}
                                        </ul>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500">{mode === "custom" ? "The server evaluates custom filters; the affected count is shown after sending." : "Choose an actuator to see which devices are affected."}</p>
                            )}
                            {error && <Notice tone="error">{error}</Notice>}
                            <Button variant="primary" className="w-full" onClick={send} loading={sending} disabled={!ready || affected?.length === 0}>
                                <Send className="h-4 w-4" /> Send command
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            <Card className="mt-5 overflow-hidden">
                <CardHeader title="Recent broadcasts" icon={History} />
                {history.data?.logs.length ? <AuditRows logs={history.data.logs} /> : <p className="p-6 text-center text-sm text-zinc-500">{history.loading ? "Loading…" : "No broadcasts sent yet."}</p>}
            </Card>
        </div>
    );
}

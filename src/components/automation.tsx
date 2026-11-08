"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleSlash, Mail, ScrollText, Trash2, Zap } from "lucide-react";
import { Badge, EmptyState, IconButton, Pager, Switch, Table, Td, Th, useConfirm, usePaged, useToast } from "@/components/ui";
import { DeviceLink, UserLink } from "@/components/Directory";
import { api, errorMessage } from "@/lib/api";
import type { Flow, FlowLog, Schedule, ScheduleAction } from "@/lib/types";
import { formatDateTime, formatValue, timeAgo } from "@/lib/utils";

const OPS: Record<string, string> = { ">": ">", ">=": "≥", "<": "<", "<=": "≤", "==": "=", "=": "=", "!=": "≠" };

export function flowSummary(f: Flow): string {
    const when = f.condition ? `${f.metricPath} ${OPS[f.condition.operator] || f.condition.operator} ${formatValue(f.condition.value)}` : `${f.metricPath} changes by ${f.deltaThreshold ?? "any amount"}`;
    const then = f.action ? `set ${f.action.actuatorKey}${f.action.deviceId && f.action.deviceId !== f.deviceId ? ` on ${f.action.deviceId}` : ""} → ${formatValue(f.action.setValue)}` : "alert only";
    return `When ${when}, ${then}`;
}

export function FlowsTable({ flows, onChanged, showOwner = true }: { flows: Flow[]; onChanged: () => void; showOwner?: boolean }) {
    const toast = useToast();
    const confirm = useConfirm();
    const [busy, setBusy] = useState<string | null>(null);
    const paged = usePaged(flows, 25);

    async function toggle(f: Flow, enabled: boolean) {
        setBusy(f._id);
        try {
            const r = await api(`/api/admin/automation/flows/${f._id}/toggle`, { method: "PUT", body: { enabled } });
            toast(r.message || `Flow ${enabled ? "enabled" : "disabled"}`);
            onChanged();
        } catch (e) {
            toast(errorMessage(e), "error");
        } finally {
            setBusy(null);
        }
    }

    async function remove(f: Flow) {
        const ok = await confirm({ title: `Delete flow “${f.name}”?`, message: <p>The owner&apos;s automation stops and its run state is cleared. This can&apos;t be undone.</p>, confirmLabel: "Delete flow", danger: true });
        if (!ok) return;
        setBusy(f._id);
        try {
            const r = await api(`/api/admin/automation/flows/${f._id}`, { method: "DELETE" });
            toast(r.message || "Flow deleted");
            onChanged();
        } catch (e) {
            toast(errorMessage(e), "error");
        } finally {
            setBusy(null);
        }
    }

    if (!flows.length) return <EmptyState icon={Zap} title="No automation flows" />;
    return (
        <>
            <Table>
                <thead>
                    <tr>
                        <Th>Flow</Th>
                        {showOwner && <Th>Owner</Th>}
                        <Th>Sensor device</Th>
                        <Th>Rule</Th>
                        <Th>Cooldown</Th>
                        <Th>Enabled</Th>
                        <Th className="w-12" />
                    </tr>
                </thead>
                <tbody>
                    {paged.slice.map((f) => (
                        <tr key={f._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60">
                            <Td>
                                <div className="font-medium text-zinc-900 dark:text-white">{f.name}</div>
                                <div className="font-mono text-[11px] text-zinc-400">{f._id}</div>
                            </Td>
                            {showOwner && (
                                <Td>
                                    <UserLink id={f.user_id} fallback={f.owner?.email} />
                                </Td>
                            )}
                            <Td>
                                <DeviceLink id={f.deviceId} />
                            </Td>
                            <Td className="max-w-[320px]">
                                <span className="block truncate text-xs" title={flowSummary(f)}>
                                    {flowSummary(f)}
                                </span>
                                {f.notify?.email && (
                                    <Badge tone="blue" icon={Mail} className="mt-1">
                                        Emails owner
                                    </Badge>
                                )}
                            </Td>
                            <Td className="whitespace-nowrap text-xs tabular-nums">{f.cooldownSec !== undefined ? `${f.cooldownSec}s` : "—"}</Td>
                            <Td>
                                <Switch checked={!!f.enabled} disabled={busy === f._id} label={`${f.enabled ? "Disable" : "Enable"} ${f.name}`} onChange={(v) => toggle(f, v)} />
                            </Td>
                            <Td className="text-right">
                                <IconButton label={`Delete ${f.name}`} tone="danger" disabled={busy === f._id} onClick={() => remove(f)}>
                                    <Trash2 className="h-4 w-4" />
                                </IconButton>
                            </Td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <Pager {...paged} />
        </>
    );
}

export function RunStatus({ status }: { status: FlowLog["status"] }) {
    if (status === "ran") return <Badge tone="green" icon={CheckCircle2}>Ran</Badge>;
    if (status === "error") return <Badge tone="red" icon={AlertTriangle}>Error</Badge>;
    return <Badge icon={CircleSlash}>Skipped</Badge>;
}

export function FlowLogsTable({ logs, flowNames }: { logs: FlowLog[]; flowNames?: Map<string, string> }) {
    const paged = usePaged(logs, 50);
    if (!logs.length) return <EmptyState icon={ScrollText} title="No runs logged" description="Runs appear here each time a flow is evaluated." />;
    return (
        <>
            <Table>
                <thead>
                    <tr>
                        <Th>When</Th>
                        <Th>Status</Th>
                        <Th>Flow</Th>
                        <Th>Device</Th>
                        <Th>Value</Th>
                        <Th>Detail</Th>
                    </tr>
                </thead>
                <tbody>
                    {paged.slice.map((l) => (
                        <tr key={l._id}>
                            <Td className="whitespace-nowrap text-xs" title={formatDateTime(l.ts)}>
                                {timeAgo(new Date(l.ts).getTime())}
                            </Td>
                            <Td>
                                <RunStatus status={l.status} />
                            </Td>
                            <Td className="max-w-[200px] truncate text-xs">{flowNames?.get(String(l.flowId)) || <span className="font-mono text-zinc-500">{String(l.flowId)}</span>}</Td>
                            <Td>
                                <DeviceLink id={l.deviceId} />
                                {l.actuatorDeviceId && l.actuatorDeviceId !== l.deviceId && (
                                    <div className="text-[11px] text-zinc-500">
                                        → <DeviceLink id={l.actuatorDeviceId} className="font-mono text-[11px] hover:underline" />
                                    </div>
                                )}
                            </Td>
                            <Td className="whitespace-nowrap font-mono text-xs">
                                {l.currentValue !== undefined ? formatValue(l.currentValue) : "—"}
                                {typeof l.delta === "number" && <span className="text-zinc-400"> (Δ {formatValue(l.delta)})</span>}
                            </Td>
                            <Td className="max-w-[280px] text-xs">
                                <span className="block truncate" title={l.reason || (l.action ? JSON.stringify(l.action) : "")}>
                                    {l.reason || (l.action ? `${l.action.actuatorKey} → ${formatValue(l.action.setValue)}` : l.emailed ? "Email alert queued" : "—")}
                                </span>
                            </Td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <Pager {...paged} />
        </>
    );
}

/* ---------------- Schedules ---------------- */
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Plain-language summary for the common cron shapes; falls back to the expression. */
export function cronText(cron: string): string {
    const p = cron.trim().split(/\s+/);
    if (p.length !== 5) return cron;
    const [m, h, dom, mon, dow] = p;
    const time = /^\d+$/.test(m) && /^\d+$/.test(h) ? `${h.padStart(2, "0")}:${m.padStart(2, "0")}` : null;
    if (/^\*\/\d+$/.test(m) && h === "*" && dom === "*" && mon === "*" && dow === "*") return `Every ${m.slice(2)} min`;
    if (/^\d+$/.test(m) && h === "*" && dom === "*" && mon === "*" && dow === "*") return `Hourly at :${m.padStart(2, "0")}`;
    if (time && dom === "*" && mon === "*") {
        if (dow === "*") return `Daily at ${time}`;
        if (dow === "1-5") return `Weekdays at ${time}`;
        if (dow === "0,6" || dow === "6,0") return `Weekends at ${time}`;
        if (/^[0-6](,[0-6])*$/.test(dow)) return `${dow.split(",").map((d) => DOW[+d]).join(", ")} at ${time}`;
    }
    return cron;
}

function actionText(a: ScheduleAction[]): string {
    return (a || []).map((x) => `${x.actuator}: ${Object.entries(x.set || {}).map(([k, v]) => `${k}=${formatValue(v)}`).join(", ")}`).join(" · ");
}

export function SchedulesTable({ schedules, onChanged, showOwner = true, showDevice = true }: { schedules: Schedule[]; onChanged: () => void; showOwner?: boolean; showDevice?: boolean }) {
    const toast = useToast();
    const confirm = useConfirm();
    const [busy, setBusy] = useState<string | null>(null);
    const paged = usePaged(schedules, 25);

    async function remove(s: Schedule) {
        const ok = await confirm({ title: `Delete schedule “${s.name}”?`, message: <p>It stops running for the owner. This can&apos;t be undone.</p>, confirmLabel: "Delete schedule", danger: true });
        if (!ok) return;
        setBusy(s._id);
        try {
            const r = await api(`/api/admin/schedules/${s._id}`, { method: "DELETE" });
            toast(r.message || "Schedule deleted");
            onChanged();
        } catch (e) {
            toast(errorMessage(e), "error");
        } finally {
            setBusy(null);
        }
    }

    if (!schedules.length) return <EmptyState title="No schedules" />;
    return (
        <>
            <Table>
                <thead>
                    <tr>
                        <Th>Schedule</Th>
                        {showDevice && <Th>Device</Th>}
                        {showOwner && <Th>Owner</Th>}
                        <Th>When</Th>
                        <Th>Actions</Th>
                        <Th>State</Th>
                        <Th className="w-12" />
                    </tr>
                </thead>
                <tbody>
                    {paged.slice.map((s) => (
                        <tr key={s._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60">
                            <Td>
                                <div className="font-medium text-zinc-900 dark:text-white">{s.name}</div>
                                <div className="text-[11px] text-zinc-400">Created {s.createdAt ? timeAgo(new Date(s.createdAt).getTime()) : "—"}</div>
                            </Td>
                            {showDevice && (
                                <Td>
                                    <DeviceLink id={s.deviceId} />
                                </Td>
                            )}
                            {showOwner && (
                                <Td>
                                    <UserLink id={s.user_id} />
                                </Td>
                            )}
                            <Td className="whitespace-nowrap">
                                <div className="text-sm">{cronText(s.cron)}</div>
                                <div className="font-mono text-[11px] text-zinc-500">
                                    {s.cron} · {s.timezone}
                                </div>
                            </Td>
                            <Td className="max-w-[280px] text-xs">
                                <span className="block truncate" title={actionText(s.actions)}>
                                    {actionText(s.actions) || "—"}
                                </span>
                                {s.duration_sec ? (
                                    <span className="block truncate text-zinc-500" title={actionText(s.end_actions)}>
                                        after {Math.round(s.duration_sec / 60)} min: {actionText(s.end_actions)}
                                    </span>
                                ) : null}
                            </Td>
                            <Td>{s.enabled ? <Badge tone="green" dot>Enabled</Badge> : <Badge dot>Paused</Badge>}</Td>
                            <Td className="text-right">
                                <IconButton label={`Delete ${s.name}`} tone="danger" disabled={busy === s._id} onClick={() => remove(s)}>
                                    <Trash2 className="h-4 w-4" />
                                </IconButton>
                            </Td>
                        </tr>
                    ))}
                </tbody>
            </Table>
            <Pager {...paged} />
        </>
    );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, Copy, Gauge, Lock, Power, Radio, Trash2, Unlock } from "lucide-react";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, KeyValue, Notice, RefreshButton, Segmented, Skeleton, useToast } from "@/components/ui";
import { UserLink } from "@/components/Directory";
import { useDeviceActions } from "@/components/deviceActions";
import { DeviceControlPanel } from "@/components/DeviceControlPanel";
import { TelemetryChart } from "@/components/TelemetryChart";
import { FlowLogsTable, FlowsTable, SchedulesTable } from "@/components/automation";
import { AuditList } from "@/components/AuditList";
import { useApi, useNow } from "@/lib/hooks";
import type { ControlDoc, DeviceConfig, Flow, FlowLog, Schedule, Telemetry } from "@/lib/types";
import { DEVICE_OFFLINE_MS, deviceOwnerId, docMs, formatDateTime, formatValue, humanizeKey, sensorNames, timeAgo } from "@/lib/utils";

interface DeviceDetails {
    device: { config: DeviceConfig; control: ControlDoc | null; telemetry_history: Telemetry[] };
}

type Tab = "schedules" | "flows" | "runs" | "config" | "audit";

export default function DeviceDetailPage() {
    const params = useParams<{ id: string }>();
    const id = decodeURIComponent(params.id);
    const enc = encodeURIComponent(id);
    const router = useRouter();
    const toast = useToast();
    const details = useApi<DeviceDetails>(`/api/admin/devices/${enc}`, { pollMs: 15_000 });
    const schedules = useApi<{ schedules: Schedule[] }>("/api/admin/schedules");
    const flows = useApi<{ flows: Flow[] }>("/api/admin/automation/flows");
    const runs = useApi<{ logs: FlowLog[] }>(`/api/admin/automation/logs?deviceId=${enc}&limit=200`);
    const actions = useDeviceActions(() => details.reload(true));
    const [tab, setTab] = useState<Tab>("schedules");

    const config = details.data?.device.config;
    const control = details.data?.device.control ?? null;
    const latest = details.data?.device.telemetry_history?.[0];
    const lastMs = docMs(latest);
    const now = useNow(15_000);
    const online = !!lastMs && now - lastMs <= DEVICE_OFFLINE_MS;

    const deviceSchedules = useMemo(() => (schedules.data?.schedules || []).filter((s) => s.deviceId === id), [schedules.data, id]);
    const deviceFlows = useMemo(() => (flows.data?.flows || []).filter((f) => f.deviceId === id || f.action?.deviceId === id), [flows.data, id]);
    const flowNames = useMemo(() => new Map((flows.data?.flows || []).map((f) => [String(f._id), f.name])), [flows.data]);

    if (details.loading && !details.data) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
            </div>
        );
    }
    if (details.error && !details.data) {
        return (
            <div className="space-y-4">
                <BackLink />
                {/not found/i.test(details.error) ? (
                    <Card>
                        <EmptyState icon={Radio} title="Device not found" description="It may have been deleted." />
                    </Card>
                ) : (
                    <ErrorState message={details.error} onRetry={() => details.reload()} />
                )}
            </div>
        );
    }
    if (!config) return null;

    const ownerId = deviceOwnerId(config);
    const readings = latest ? Object.entries(latest).filter(([k]) => !["_id", "deviceId", "createdAt", "updatedAt"].includes(k)) : [];

    return (
        <div className="space-y-5">
            <BackLink />

            <Card className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            <Radio className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="truncate font-mono text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">{id}</h1>
                                <button
                                    type="button"
                                    aria-label="Copy device ID"
                                    title="Copy device ID"
                                    onClick={() => navigator.clipboard?.writeText(id).then(() => toast("Device ID copied", "info"))}
                                    className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-sm text-zinc-500">{config.device?.model || "Unknown model"}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge tone={online ? "green" : "neutral"} dot>
                                    {online ? "Online" : "Offline"}
                                </Badge>
                                {config.isDisabled ? (
                                    <Badge tone="red" icon={Lock}>
                                        Locked out
                                    </Badge>
                                ) : (
                                    <Badge tone="green">Enabled</Badge>
                                )}
                                <span className="text-xs text-zinc-500">Last seen {lastMs ? timeAgo(lastMs) : "never"}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <RefreshButton onClick={() => details.reload(true)} updatedAt={details.updatedAt} />
                        {config.isDisabled ? (
                            <Button size="sm" onClick={() => actions.unlock(config)}>
                                <Unlock className="h-4 w-4" /> Unlock
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => actions.lock(config)}>
                                <Lock className="h-4 w-4" /> Lock out
                            </Button>
                        )}
                        <Button size="sm" onClick={() => actions.transfer(config)}>
                            <ArrowRightLeft className="h-4 w-4" /> Transfer
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => actions.remove(config, () => router.push("/devices"))}>
                            <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                    </div>
                </div>

                {config.isDisabled && (
                    <Notice tone="error" className="mt-4" title="Locked out by an admin">
                        {config.disabledReason || "Admin Lockout"}
                        {config.disabledAt && <span className="text-xs opacity-80"> · since {formatDateTime(config.disabledAt)}</span>}
                    </Notice>
                )}

                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-5 dark:border-zinc-800 sm:grid-cols-4">
                    <KeyValue label="Owner">
                        <UserLink id={ownerId} />
                    </KeyValue>
                    <KeyValue label="Owner since">{formatDateTime(config.ownerAssignedAt)}</KeyValue>
                    <KeyValue label="Sensors">{sensorNames(config).join(", ") || "—"}</KeyValue>
                    <KeyValue label="Actuators">{Object.keys(config.actuators || {}).join(", ") || "—"}</KeyValue>
                </dl>
            </Card>

            <div className="grid gap-5 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                    <CardHeader title="Control" subtitle="Admin override: works even when the device is locked" icon={Power} />
                    <div className="p-4 sm:p-5">
                        <DeviceControlPanel deviceId={id} config={config} control={control} onChange={(c) => details.setData((d) => (d ? { device: { ...d.device, control: c } } : d))} />
                    </div>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader title="Latest reading" subtitle={latest ? formatDateTime(latest.createdAt) : undefined} icon={Gauge} />
                    <div className="p-4 sm:p-5">
                        {readings.length ? (
                            <div className="grid grid-cols-2 gap-2">
                                {readings.map(([k, v]) => (
                                    <div key={k} className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-white/5">
                                        <div className="truncate text-sm font-semibold tabular-nums text-zinc-900 dark:text-white" title={formatValue(v)}>
                                            {formatValue(v)}
                                        </div>
                                        <div className="truncate text-xs text-zinc-500">{humanizeKey(k)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-xl bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-500 dark:bg-white/5">No telemetry yet</p>
                        )}
                    </div>
                </Card>
            </div>

            <TelemetryChart deviceId={id} />

            <div className="space-y-3">
                <Segmented
                    label="Device sections"
                    value={tab}
                    onChange={setTab}
                    className="flex w-full overflow-x-auto sm:inline-flex sm:w-auto"
                    options={[
                        { value: "schedules", label: `Schedules (${deviceSchedules.length})` },
                        { value: "flows", label: `Automations (${deviceFlows.length})` },
                        { value: "runs", label: "Automation runs" },
                        { value: "config", label: "Raw config" },
                        { value: "audit", label: "Admin history" },
                    ]}
                />
                {tab === "schedules" && <Card className="overflow-hidden">{schedules.loading ? <Skeleton className="m-4 h-24" /> : <SchedulesTable schedules={deviceSchedules} onChanged={() => schedules.reload(true)} showDevice={false} />}</Card>}
                {tab === "flows" && <Card className="overflow-hidden">{flows.loading ? <Skeleton className="m-4 h-24" /> : <FlowsTable flows={deviceFlows} onChanged={() => flows.reload(true)} />}</Card>}
                {tab === "runs" && <Card className="overflow-hidden">{runs.loading ? <Skeleton className="m-4 h-24" /> : runs.error ? <div className="p-4"><ErrorState message={runs.error} /></div> : <FlowLogsTable logs={runs.data?.logs || []} flowNames={flowNames} />}</Card>}
                {tab === "config" && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <JsonCard title="device_config" value={config} />
                        <JsonCard title="device_control" value={control} />
                    </div>
                )}
                {tab === "audit" && <AuditList targetId={id} title="Admin actions on this device" />}
            </div>

            {actions.modals}
        </div>
    );
}

function BackLink() {
    return (
        <Link href="/devices" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Devices
        </Link>
    );
}

function JsonCard({ title, value }: { title: string; value: unknown }) {
    const toast = useToast();
    const text = JSON.stringify(value, null, 2);
    return (
        <Card className="overflow-hidden">
            <CardHeader
                title={<span className="font-mono">{title}</span>}
                actions={
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(text).then(() => toast("Copied", "info"))}>
                        <Copy className="h-4 w-4" /> Copy
                    </Button>
                }
            />
            <pre className="max-h-[480px] overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">{value ? text : "null"}</pre>
        </Card>
    );
}

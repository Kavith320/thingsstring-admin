"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Activity, ArrowRight, CalendarClock, Database, HeartPulse, Lock, Mail, Radio, ShieldCheck, Users, Zap } from "lucide-react";
import { Badge, Card, CardHeader, ErrorState, PageHeader, RefreshButton, Skeleton, StatTile } from "@/components/ui";
import { BarList, bucketize, Legend, Meter, TimeBars } from "@/components/charts";
import { useDirectory, UserLink } from "@/components/Directory";
import { useApi } from "@/lib/hooks";
import { useChartTheme } from "@/lib/theme";
import type { AuditLog, EmailStats, FlowLog, Health, Stats } from "@/lib/types";
import { formatDuration, formatNumber, humanizeAction, timeAgo } from "@/lib/utils";

const DAY = 86_400_000;
const HOUR = 3_600_000;

export default function OverviewPage() {
    const stats = useApi<{ stats: Stats }>("/api/admin/stats", { pollMs: 30_000 });
    const health = useApi<{ health: Health }>("/api/admin/health", { pollMs: 15_000 });
    const email = useApi<EmailStats>("/api/admin/email/stats", { pollMs: 60_000 });
    const flowLogs = useApi<{ logs: FlowLog[] }>("/api/admin/automation/logs?limit=1000", { pollMs: 60_000 });
    const audit = useApi<{ logs: AuditLog[] }>("/api/admin/audit-logs?limit=200", { pollMs: 60_000 });
    const dir = useDirectory();
    const t = useChartTheme();

    const s = stats.data?.stats;
    const h = health.data?.health;
    const locked = dir.devices.filter((d) => d.isDisabled).length;
    const suspended = dir.users.filter((u) => u.status === "disabled" || u.isActive === false).length;
    const admins = dir.users.filter((u) => u.role === "admin").length;

    const signups = useMemo(() => bucketize(dir.users, (u) => (u.createdAt ? new Date(u.createdAt).getTime() : null), { bucketMs: DAY, buckets: 30 }), [dir.users]);
    const signups30 = signups.reduce((n, r) => n + r.count, 0);

    const runs = useMemo(
        () =>
            bucketize(flowLogs.data?.logs || [], (l) => new Date(l.ts).getTime(), {
                bucketMs: HOUR,
                buckets: 24,
                keys: ["ran", "skipped", "error"],
                series: (l) => l.status,
            }),
        [flowLogs.data]
    );
    const runTotals = runs.reduce((a, r) => ({ ran: a.ran + r.ran, skipped: a.skipped + r.skipped, error: a.error + r.error }), { ran: 0, skipped: 0, error: 0 });

    const models = useMemo(() => {
        const m = new Map<string, number>();
        for (const d of dir.devices) {
            const k = d.device?.model || "Unknown model";
            m.set(k, (m.get(k) || 0) + 1);
        }
        return [...m].map(([label, value]) => ({ label, value }));
    }, [dir.devices]);

    const topOwners = useMemo(
        () =>
            [...dir.devicesByOwner]
                .filter(([id]) => id)
                .map(([id, list]) => {
                    const u = dir.userById.get(id);
                    return { label: u ? u.name || u.email : `${id.slice(0, 10)}…`, value: list.length, href: u ? `/users/${u._id}` : undefined };
                }),
        [dir.devicesByOwner, dir.userById]
    );

    const reloadAll = () => {
        stats.reload();
        health.reload();
        email.reload();
        flowLogs.reload();
        audit.reload();
        dir.refresh();
    };

    const statusSeries = [
        { key: "ran", label: "Ran", color: t.status.good },
        { key: "skipped", label: "Skipped", color: t.status.neutral },
        { key: "error", label: "Error", color: t.status.critical },
    ];

    return (
        <div className="space-y-5 sm:space-y-6">
            <PageHeader title="Platform overview" description="Live state of users, devices, automations and infrastructure." actions={<RefreshButton onClick={reloadAll} loading={stats.loading} updatedAt={stats.updatedAt} />} />

            {stats.error && <ErrorState message={stats.error} onRetry={() => stats.reload()} />}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                {s ? (
                    <>
                        <StatTile label="Users" value={formatNumber(s.users)} icon={Users} tone="indigo" hint={`${admins} admin · ${suspended} suspended`} href="/users" />
                        <StatTile label="Devices" value={formatNumber(s.devices)} icon={Radio} tone="green" hint={locked ? `${locked} locked out` : "None locked"} href="/devices" />
                        <StatTile label="Telemetry records" value={formatNumber(s.telemetry_records)} icon={Database} hint="Estimated count" />
                        <StatTile label="Schedules" value={formatNumber(s.schedules)} icon={CalendarClock} tone="amber" href="/schedules" />
                        <StatTile label="Automation flows" value={formatNumber(s.automation_flows)} icon={Zap} tone="indigo" href="/automations" />
                    </>
                ) : (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-2xl" />)
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                {/* Health */}
                <Card>
                    <CardHeader
                        title="System health"
                        icon={HeartPulse}
                        actions={
                            <Link href="/health" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                                Details <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        }
                    />
                    <div className="space-y-3 p-4 sm:p-5">
                        {health.error ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{health.error}</p>
                        ) : !h ? (
                            <Skeleton className="h-24" />
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-500">Overall</span>
                                    <Badge tone={h.status === "healthy" ? "green" : "amber"} dot>
                                        {h.status === "healthy" ? "Healthy" : "Degraded"}
                                    </Badge>
                                </div>
                                <HealthRow label="MongoDB" ok={h.mongo.connected} />
                                <HealthRow label="MQTT broker" ok={h.mqtt.connected} />
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500">Uptime</span>
                                    <span className="font-medium tabular-nums">{formatDuration(h.uptimeSeconds)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-500">Memory (RSS)</span>
                                    <span className="font-medium tabular-nums">{h.memory.rssMB} MB</span>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                {/* Email quota */}
                <Card>
                    <CardHeader title="Email quota" subtitle="Rolling 24 hours" icon={Mail} />
                    <div className="space-y-3 p-4 sm:p-5">
                        {email.error ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{email.error}</p>
                        ) : !email.data ? (
                            <Skeleton className="h-24" />
                        ) : (
                            <>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-2xl font-bold tabular-nums">
                                        {email.data.sent24h + email.data.queued}
                                        <span className="text-sm font-normal text-zinc-500"> / {email.data.limit}</span>
                                    </span>
                                    <span className="text-xs text-zinc-500">{email.data.remaining} left</span>
                                </div>
                                <Meter value={email.data.sent24h + email.data.queued} max={email.data.limit} reservedFrom={email.data.limit - email.data.reserved} label="Emails used in the last 24 hours" />
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge tone={email.data.sendingAllowed ? "green" : "red"}>{email.data.sendingAllowed ? "Sending" : "Sending paused"}</Badge>
                                    <Badge tone={email.data.alertsAllowed ? "green" : "amber"}>{email.data.alertsAllowed ? "Alerts allowed" : "Alerts held back"}</Badge>
                                    {email.data.failed24h > 0 && <Badge tone="red">{email.data.failed24h} failed</Badge>}
                                    {email.data.queued > 0 && <Badge tone="blue">{email.data.queued} queued</Badge>}
                                </div>
                                <p className="text-xs text-zinc-500">The dashed line marks the {email.data.reserved} emails reserved for sign-up, password and admin notices.</p>
                            </>
                        )}
                    </div>
                </Card>

                {/* Recent admin activity */}
                <Card>
                    <CardHeader
                        title="Recent admin actions"
                        icon={ShieldCheck}
                        actions={
                            <Link href="/audit-logs" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                                All <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        }
                    />
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {!audit.data && !audit.error && (
                            <li className="p-4">
                                <Skeleton className="h-24" />
                            </li>
                        )}
                        {audit.error && <li className="p-4 text-sm text-red-600 dark:text-red-400">{audit.error}</li>}
                        {audit.data?.logs.length === 0 && <li className="p-6 text-center text-sm text-zinc-500">No admin actions recorded yet.</li>}
                        {audit.data?.logs.slice(0, 6).map((l) => (
                            <li key={l._id} className="flex items-start justify-between gap-3 px-4 py-2.5 sm:px-5">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{humanizeAction(l.action)}</div>
                                    <div className="truncate text-xs text-zinc-500">{l.adminEmail}</div>
                                </div>
                                <span className="shrink-0 text-xs text-zinc-400">{timeAgo(new Date(l.timestamp).getTime())}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Automation runs" subtitle={`Last 24 hours, per hour${(flowLogs.data?.logs.length || 0) >= 1000 ? " (newest 1,000 runs)" : ""}`} icon={Zap} />
                    <div className="space-y-3 p-4 sm:p-5">
                        <Legend items={statusSeries.map((s) => ({ label: s.label, color: s.color, value: runTotals[s.key as keyof typeof runTotals] }))} />
                        {flowLogs.error ? (
                            <p className="text-sm text-red-600 dark:text-red-400">{flowLogs.error}</p>
                        ) : (
                            <TimeBars data={runs} series={statusSeries} tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} labelFormatter={(v) => new Date(v).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })} />
                        )}
                    </div>
                </Card>

                <Card>
                    <CardHeader title="New users" subtitle={`${signups30} in the last 30 days`} icon={Users} />
                    <div className="p-4 sm:p-5">
                        <TimeBars data={signups} series={[{ key: "count", label: "Sign-ups", color: t.series[0] }]} tickFormatter={(v) => new Date(v).toLocaleDateString([], { month: "short", day: "numeric" })} />
                    </div>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader title="Devices by model" icon={Radio} />
                    <div className="p-4 sm:p-5">
                        <BarList items={models} color={t.series[1]} empty="No devices yet" />
                    </div>
                </Card>
                <Card>
                    <CardHeader title="Top device owners" icon={Users} />
                    <div className="p-4 sm:p-5">
                        <BarList items={topOwners} color={t.series[0]} empty="No owned devices yet" max={6} />
                    </div>
                </Card>
                <Card>
                    <CardHeader title="Needs attention" icon={Activity} />
                    <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                        {dir.devices
                            .filter((d) => d.isDisabled)
                            .slice(0, 4)
                            .map((d) => (
                                <li key={d._id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                                    <Link href={`/devices/${encodeURIComponent(d._id)}`} className="flex min-w-0 items-center gap-2 font-mono text-xs font-medium hover:underline">
                                        <Lock className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                        <span className="truncate">{d._id}</span>
                                    </Link>
                                    <span className="truncate text-xs text-zinc-500">{d.disabledReason || "Locked"}</span>
                                </li>
                            ))}
                        {dir.users
                            .filter((u) => u.status === "disabled" || u.isActive === false)
                            .slice(0, 4)
                            .map((u) => (
                                <li key={u._id} className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                                    <UserLink id={u._id} className="truncate text-sm font-medium hover:underline" />
                                    <Badge tone="red">Suspended</Badge>
                                </li>
                            ))}
                        {runTotals.error > 0 && (
                            <li className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                                <Link href="/automations?tab=logs&status=error" className="font-medium hover:underline">
                                    Automation errors (24h)
                                </Link>
                                <Badge tone="red">{runTotals.error}</Badge>
                            </li>
                        )}
                        {dir.loaded && !locked && !suspended && !runTotals.error && <li className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-5">Nothing needs attention right now.</li>}
                    </ul>
                </Card>
            </div>
        </div>
    );
}

function HealthRow({ label, ok }: { label: string; ok: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">{label}</span>
            <Badge tone={ok ? "green" : "red"} dot>
                {ok ? "Connected" : "Disconnected"}
            </Badge>
        </div>
    );
}

"use client";

import { useState } from "react";
import { Archive, Database, Eraser, History, Mail } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, PageHeader, RefreshButton, Skeleton, useConfirm, useToast } from "@/components/ui";
import { BarList, Meter } from "@/components/charts";
import { AuditRows } from "@/components/AuditList";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { useChartTheme } from "@/lib/theme";
import type { AuditLog, EmailStats, Stats } from "@/lib/types";
import { formatNumber, humanizeKey } from "@/lib/utils";

export default function MaintenancePage() {
    const toast = useToast();
    const confirm = useConfirm();
    const t = useChartTheme();
    const stats = useApi<{ stats: Stats }>("/api/admin/stats");
    const email = useApi<EmailStats>("/api/admin/email/stats", { pollMs: 60_000 });
    const backups = useApi<{ logs: AuditLog[] }>("/api/admin/audit-logs?action=MAINTENANCE_BACKUP&limit=10");
    const cleanups = useApi<{ logs: AuditLog[] }>("/api/admin/audit-logs?action=MAINTENANCE_TELEMETRY_CLEANUP&limit=10");

    const [backingUp, setBackingUp] = useState(false);
    const [backupResult, setBackupResult] = useState<string | null>(null);
    const [days, setDays] = useState("7");
    const [cleaning, setCleaning] = useState(false);
    const [cleanResult, setCleanResult] = useState<string | null>(null);
    const [error, setError] = useState("");

    async function backup() {
        const ok = await confirm({ title: "Run a full database backup?", message: <p>Every collection is exported to JSONL files on the server. Large databases can take a while; the server keeps the newest backups (BACKUP_KEEP, default 8).</p>, confirmLabel: "Start backup" });
        if (!ok) return;
        setBackingUp(true);
        setError("");
        setBackupResult(null);
        try {
            const r = await api<{ message: string; backupDir: string }>("/api/admin/maintenance/backup", { method: "POST" });
            setBackupResult(r.backupDir);
            toast(r.message || "Backup completed");
            backups.reload(true);
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setBackingUp(false);
        }
    }

    const n = Number(days);
    const daysValid = Number.isInteger(n) && n >= 1 && n <= 365;

    async function cleanup() {
        if (!daysValid) return;
        const ok = await confirm({
            title: `Delete telemetry older than ${n} day${n === 1 ? "" : "s"}?`,
            message: (
                <div className="space-y-2">
                    <p>The server first takes a full backup, then permanently deletes older telemetry for every device.</p>
                    <p>
                        It also sets <b>ongoing retention to {n} days</b>: from now on, telemetry older than that expires automatically.
                    </p>
                </div>
            ),
            confirmLabel: "Back up and clean",
            danger: true,
            typeToConfirm: `${n} days`,
        });
        if (!ok) return;
        setCleaning(true);
        setError("");
        setCleanResult(null);
        try {
            const r = await api<{ message: string; deletedCount: number }>("/api/admin/maintenance/clean-telemetry", { method: "POST", body: { daysToKeep: n } });
            setCleanResult(`${r.message}. Deleted ${formatNumber(r.deletedCount)} records.`);
            toast(r.message || "Cleanup done");
            cleanups.reload(true);
            stats.reload(true);
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setCleaning(false);
        }
    }

    const e = email.data;
    const lastRetention = cleanups.data?.logs[0]?.details?.daysToKeep;

    return (
        <div className="space-y-5">
            <PageHeader title="Maintenance" description="Backups, telemetry retention and the email sending budget." />

            {error && <Notice tone="error">{error}</Notice>}

            <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Database backup" subtitle="Full export of every collection" icon={Archive} />
                    <div className="space-y-4 p-4 sm:p-5">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">Writes one JSONL file per collection into a timestamped folder on the server. Use it before risky changes.</p>
                        {backupResult && (
                            <Notice tone="success" title="Backup completed">
                                <code className="break-all font-mono text-xs">{backupResult}</code>
                            </Notice>
                        )}
                        <Button variant="primary" onClick={backup} loading={backingUp}>
                            <Archive className="h-4 w-4" /> {backingUp ? "Backing up…" : "Run backup now"}
                        </Button>
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Telemetry retention" subtitle={stats.data ? `${formatNumber(stats.data.stats.telemetry_records)} records stored` : undefined} icon={Database} />
                    <div className="space-y-4 p-4 sm:p-5">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Delete old readings and set how long telemetry is kept.
                            {lastRetention ? (
                                <>
                                    {" "}
                                    Last set to <b>{lastRetention} days</b>.
                                </>
                            ) : null}
                        </p>
                        <div className="flex flex-wrap items-end gap-2">
                            <Field label="Days to keep" hint="1–365" error={days && !daysValid ? "Enter a whole number from 1 to 365" : undefined} className="w-40">
                                {(id) => <Input id={id} type="number" min={1} max={365} value={days} onChange={(ev) => setDays(ev.target.value)} />}
                            </Field>
                            <div className="flex gap-1.5 pb-[22px]">
                                {[7, 30, 90].map((d) => (
                                    <Button key={d} size="sm" variant="ghost" onClick={() => setDays(String(d))}>
                                        {d}d
                                    </Button>
                                ))}
                            </div>
                        </div>
                        {cleanResult && <Notice tone="success">{cleanResult}</Notice>}
                        <Button variant="danger" onClick={cleanup} loading={cleaning} disabled={!daysValid}>
                            <Eraser className="h-4 w-4" /> {cleaning ? "Backing up and cleaning…" : "Back up and clean"}
                        </Button>
                    </div>
                </Card>
            </div>

            <Card>
                <CardHeader title="Email budget" subtitle={e?.window ? `Window: ${e.window}` : undefined} icon={Mail} actions={<RefreshButton onClick={() => email.reload()} loading={email.loading} updatedAt={email.updatedAt} />} />
                <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2">
                    {email.error ? (
                        <p className="text-sm text-red-600 dark:text-red-400">{email.error}</p>
                    ) : !e ? (
                        <Skeleton className="h-40 lg:col-span-2" />
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <Mini label="Sent" value={e.sent24h} />
                                    <Mini label="Queued" value={e.queued} />
                                    <Mini label="Remaining" value={e.remaining} />
                                    <Mini label="Failed" value={e.failed24h} warn={e.failed24h > 0} />
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>
                                            {e.sent24h + e.queued} of {e.limit} used
                                        </span>
                                        <span>{e.reserved} reserved for important mail</span>
                                    </div>
                                    <Meter value={e.sent24h + e.queued} max={e.limit} reservedFrom={e.limit - e.reserved} label="Email quota used" />
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <Badge tone={e.sendingAllowed ? "green" : "red"}>{e.sendingAllowed ? "Sending normally" : "Daily cap reached, mail is queued"}</Badge>
                                    <Badge tone={e.alertsAllowed ? "green" : "amber"}>{e.alertsAllowed ? "Optional alerts allowed" : "Optional alerts paused"}</Badge>
                                </div>
                                <p className="text-xs text-zinc-500">Set with MAIL_DAILY_LIMIT and MAIL_RESERVED on the server. Optional alerts (device offline, automation) stop once only the reserved part is left.</p>
                            </div>
                            <div>
                                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Sent by category</div>
                                <BarList items={Object.entries(e.sentByCategory || {}).map(([k, v]) => ({ label: humanizeKey(k), value: v }))} color={t.series[0]} empty="No emails sent in this window" />
                            </div>
                        </>
                    )}
                </div>
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card className="overflow-hidden">
                    <CardHeader title="Backup history" icon={History} />
                    {backups.data?.logs.length ? <AuditRows logs={backups.data.logs} /> : <p className="p-6 text-center text-sm text-zinc-500">{backups.loading ? "Loading…" : "No on-demand backups yet."}</p>}
                </Card>
                <Card className="overflow-hidden">
                    <CardHeader title="Cleanup history" icon={History} />
                    {cleanups.data?.logs.length ? <AuditRows logs={cleanups.data.logs} /> : <p className="p-6 text-center text-sm text-zinc-500">{cleanups.loading ? "Loading…" : "No cleanups yet."}</p>}
                </Card>
            </div>
        </div>
    );
}

function Mini({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
    return (
        <div className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-white/5">
            <div className={`text-lg font-bold tabular-nums ${warn ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-white"}`}>{formatNumber(value)}</div>
            <div className="text-xs text-zinc-500">{label}</div>
        </div>
    );
}

"use client";

import { useMemo, useState } from "react";
import { Download, ShieldCheck, X } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, ErrorState, Input, PageHeader, Pager, RefreshButton, Select, TableSkeleton, usePaged } from "@/components/ui";
import { BarList, bucketize, TimeBars } from "@/components/charts";
import { AuditRows } from "@/components/AuditList";
import { useDirectory } from "@/components/Directory";
import { useApi, useDebounced, useQueryParam } from "@/lib/hooks";
import { useChartTheme } from "@/lib/theme";
import { AUDIT_ACTIONS, type AuditLog } from "@/lib/types";
import { downloadCsv, humanizeAction } from "@/lib/utils";

export default function AuditLogsPage() {
    const t = useChartTheme();
    const dir = useDirectory();
    // Deep links (?targetId=, ?action=) seed the filters until the admin changes them
    const urlTarget = useQueryParam("targetId");
    const urlAction = useQueryParam("action");
    const [actionSel, setAction] = useState<string | null>(null);
    const [admin, setAdmin] = useState("");
    const [targetSel, setTargetInput] = useState<string | null>(null);
    const [limit, setLimit] = useState("200");
    const action = actionSel ?? urlAction;
    const targetInput = targetSel ?? urlTarget;
    const targetId = useDebounced(targetInput.trim(), 400);

    const params = new URLSearchParams({ limit });
    if (action) params.set("action", action);
    if (admin) params.set("adminEmail", admin);
    if (targetId) params.set("targetId", targetId);
    const q = useApi<{ logs: AuditLog[] }>(`/api/admin/audit-logs?${params}`);
    const logs = useMemo(() => q.data?.logs || [], [q.data]);
    const paged = usePaged(logs, 50);

    const admins = useMemo(() => dir.users.filter((u) => u.role === "admin").map((u) => u.email), [dir.users]);
    const daily = useMemo(() => bucketize(logs, (l) => new Date(l.timestamp).getTime(), { bucketMs: 86_400_000, buckets: 30 }), [logs]);
    const byAction = useMemo(() => {
        const m = new Map<string, number>();
        for (const l of logs) m.set(l.action, (m.get(l.action) || 0) + 1);
        return [...m].map(([k, v]) => ({ label: humanizeAction(k), value: v }));
    }, [logs]);
    const byAdmin = useMemo(() => {
        const m = new Map<string, number>();
        for (const l of logs) m.set(l.adminEmail, (m.get(l.adminEmail) || 0) + 1);
        return [...m].map(([k, v]) => ({ label: k, value: v }));
    }, [logs]);

    const filtered = !!(action || admin || targetId);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Audit logs"
                description="Every change made through the admin API, with who made it, from where, and what it touched."
                actions={
                    <>
                        <RefreshButton onClick={() => q.reload()} loading={q.loading} updatedAt={q.updatedAt} />
                        <Button size="sm" disabled={!logs.length} onClick={() => downloadCsv(`audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, logs.map((l) => ({ timestamp: l.timestamp, action: l.action, adminEmail: l.adminEmail, adminId: l.adminId, targetId: l.targetId, ip: l.ip, userAgent: l.userAgent, details: l.details })))}>
                            <Download className="h-4 w-4" /> CSV
                        </Button>
                    </>
                }
            />

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <Select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)} className="h-10 lg:max-w-[240px]">
                    <option value="">All actions</option>
                    {AUDIT_ACTIONS.map((a) => (
                        <option key={a} value={a}>
                            {humanizeAction(a)}
                        </option>
                    ))}
                </Select>
                <Select aria-label="Admin" value={admin} onChange={(e) => setAdmin(e.target.value)} className="h-10 lg:max-w-[260px]">
                    <option value="">All admins</option>
                    {admins.map((a) => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                    ))}
                </Select>
                <Input aria-label="Target ID" placeholder="Target ID (user, device, flow…)" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} className="h-10 font-mono lg:max-w-[280px]" />
                <Select aria-label="Limit" value={limit} onChange={(e) => setLimit(e.target.value)} className="h-10 w-auto">
                    {["100", "200", "500", "1000"].map((n) => (
                        <option key={n} value={n}>
                            Newest {n}
                        </option>
                    ))}
                </Select>
                {filtered && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            setAction("");
                            setAdmin("");
                            setTargetInput("");
                        }}
                    >
                        <X className="h-4 w-4" /> Clear
                    </Button>
                )}
            </div>

            {q.error && <ErrorState message={q.error} onRetry={() => q.reload()} />}

            {logs.length > 0 && (
                <div className="grid gap-5 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader title="Actions per day" subtitle={`Last 30 days, within these ${logs.length} entries`} />
                        <div className="p-4 sm:p-5">
                            <TimeBars data={daily} series={[{ key: "count", label: "Actions", color: t.series[0] }]} height={170} tickFormatter={(v) => new Date(v).toLocaleDateString([], { month: "short", day: "numeric" })} />
                        </div>
                    </Card>
                    <Card>
                        <CardHeader title="By action" />
                        <div className="p-4 sm:p-5">
                            <BarList items={byAction} color={t.series[0]} max={6} />
                        </div>
                    </Card>
                    <Card>
                        <CardHeader title="By admin" />
                        <div className="p-4 sm:p-5">
                            <BarList items={byAdmin} color={t.series[4]} max={6} />
                        </div>
                    </Card>
                </div>
            )}

            <Card className="overflow-hidden">
                <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-zinc-100 bg-zinc-50/60 py-2.5 pl-12 pr-5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 sm:grid">
                    <span>Action</span>
                    <span>Admin</span>
                    <span>Target</span>
                    <span>When</span>
                </div>
                {q.loading && !q.data ? <TableSkeleton /> : logs.length === 0 ? <EmptyState icon={ShieldCheck} title={filtered ? "No entries match these filters" : "No admin actions recorded yet"} /> : <AuditRows logs={paged.slice} />}
                <Pager {...paged} />
            </Card>
        </div>
    );
}

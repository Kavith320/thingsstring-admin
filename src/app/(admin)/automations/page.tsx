"use client";

import { useMemo, useState } from "react";
import { Download, ScrollText, Zap } from "lucide-react";
import { Button, Card, CardHeader, ErrorState, Input, PageHeader, RefreshButton, SearchInput, Segmented, Select, TableSkeleton } from "@/components/ui";
import { bucketize, Legend, TimeBars } from "@/components/charts";
import { useDirectory } from "@/components/Directory";
import { FlowLogsTable, FlowsTable, flowSummary } from "@/components/automation";
import { useApi, useDebounced, useNow, useQueryParam } from "@/lib/hooks";
import { useChartTheme } from "@/lib/theme";
import type { Flow, FlowLog } from "@/lib/types";
import { downloadCsv, matches } from "@/lib/utils";

type Tab = "flows" | "logs";
type Status = "" | "ran" | "skipped" | "error";

export default function AutomationsPage() {
    // Deep links: ?tab=logs, ?owner=<userId>, ?status=error
    const urlTab = useQueryParam("tab");
    const initialOwner = useQueryParam("owner");
    const urlStatus = useQueryParam("status");
    const initialStatus: Status = urlStatus === "ran" || urlStatus === "skipped" || urlStatus === "error" ? urlStatus : "";
    const [tabSel, setTab] = useState<Tab | null>(null);
    const tab: Tab = tabSel ?? (urlTab === "logs" ? "logs" : "flows");

    const flows = useApi<{ flows: Flow[] }>("/api/admin/automation/flows");

    return (
        <div>
            <PageHeader
                title="Automations"
                description="Every user's automation rules, and the engine's run log."
                actions={<Segmented label="Section" value={tab} onChange={setTab} options={[{ value: "flows", label: <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Flows</span> }, { value: "logs", label: <span className="inline-flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" />Run log</span> }]} />}
            />
            {tab === "flows" ? <FlowsSection q={flows} initialOwner={initialOwner} /> : <LogsSection flows={flows.data?.flows || []} initialStatus={initialStatus} />}
        </div>
    );
}

function FlowsSection({ q, initialOwner }: { q: ReturnType<typeof useApi<{ flows: Flow[] }>>; initialOwner: string }) {
    const dir = useDirectory();
    const [query, setQuery] = useState("");
    const [state, setState] = useState<"all" | "on" | "off">("all");
    const [ownerSel, setOwner] = useState<string | null>(null);
    const owner = ownerSel ?? initialOwner;

    const all = useMemo(() => q.data?.flows || [], [q.data]);
    const owners = useMemo(() => [...new Set(all.map((f) => String(f.user_id)))], [all]);
    const rows = useMemo(
        () =>
            all
                .filter((f) => (state === "on" ? f.enabled : state === "off" ? !f.enabled : true))
                .filter((f) => !owner || String(f.user_id) === owner)
                .filter((f) => matches(query, f.name, f.deviceId, f.metricPath, f.action?.deviceId, f.action?.actuatorKey, f.owner?.email, f.owner?.name, f._id)),
        [all, state, owner, query]
    );

    return (
        <>
            <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                <SearchInput value={query} onChange={setQuery} placeholder="Search flow, device, metric, owner…" className="flex-1" />
                <div className="flex flex-wrap gap-2">
                    <Segmented label="State" value={state} onChange={setState} options={[{ value: "all", label: `All (${all.length})` }, { value: "on", label: "Enabled" }, { value: "off", label: "Disabled" }]} />
                    <Select aria-label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} className="h-10 w-auto max-w-[220px]">
                        <option value="">All owners</option>
                        {owners.map((o) => (
                            <option key={o} value={o}>
                                {dir.userById.get(o)?.email || all.find((f) => String(f.user_id) === o)?.owner?.email || o}
                            </option>
                        ))}
                    </Select>
                    <RefreshButton onClick={() => q.reload()} loading={q.loading} updatedAt={q.updatedAt} />
                    <Button size="sm" disabled={!rows.length} onClick={() => downloadCsv("automation-flows.csv", rows.map((f) => ({ id: f._id, name: f.name, enabled: f.enabled, ownerEmail: f.owner?.email, deviceId: f.deviceId, rule: flowSummary(f), cooldownSec: f.cooldownSec, emailAlert: !!f.notify?.email })))}>
                        <Download className="h-4 w-4" /> CSV
                    </Button>
                </div>
            </div>
            {q.error && (
                <div className="mb-4">
                    <ErrorState message={q.error} onRetry={() => q.reload()} />
                </div>
            )}
            <Card className="overflow-hidden">{q.loading && !q.data ? <TableSkeleton /> : <FlowsTable flows={rows} onChanged={() => q.reload(true)} />}</Card>
        </>
    );
}

function LogsSection({ flows, initialStatus }: { flows: Flow[]; initialStatus: Status }) {
    const t = useChartTheme();
    const [statusSel, setStatus] = useState<Status | null>(null);
    const status = statusSel ?? initialStatus;
    const [flowId, setFlowId] = useState("");
    const [deviceInput, setDeviceInput] = useState("");
    const [limit, setLimit] = useState("200");
    const deviceId = useDebounced(deviceInput.trim(), 400);
    const now = useNow(60_000);

    const params = new URLSearchParams({ limit });
    if (status) params.set("status", status);
    if (flowId) params.set("flowId", flowId);
    if (deviceId) params.set("deviceId", deviceId);
    const q = useApi<{ logs: FlowLog[] }>(`/api/admin/automation/logs?${params}`, { pollMs: 20_000 });
    const logs = useMemo(() => q.data?.logs || [], [q.data]);
    const flowNames = useMemo(() => new Map(flows.map((f) => [String(f._id), f.name])), [flows]);

    // Chart over the span the fetched logs cover, so a filtered or limited query still reads honestly
    const chart = useMemo(() => {
        if (!logs.length) return null;
        const times = logs.map((l) => new Date(l.ts).getTime());
        const span = Math.max(1, now - Math.min(...times));
        const bucketMs = span <= 2 * 3600e3 ? 300e3 : span <= 48 * 3600e3 ? 3600e3 : 86400e3;
        const buckets = Math.min(60, Math.max(6, Math.ceil(span / bucketMs)));
        return { bucketMs, rows: bucketize(logs, (l) => new Date(l.ts).getTime(), { bucketMs, buckets, keys: ["ran", "skipped", "error"], series: (l) => l.status }) };
    }, [logs, now]);
    const totals = { ran: logs.filter((l) => l.status === "ran").length, skipped: logs.filter((l) => l.status === "skipped").length, error: logs.filter((l) => l.status === "error").length };
    const series = [
        { key: "ran", label: "Ran", color: t.status.good },
        { key: "skipped", label: "Skipped", color: t.status.neutral },
        { key: "error", label: "Error", color: t.status.critical },
    ];
    const tick = (v: number) => (chart && chart.bucketMs >= 86400e3 ? new Date(v).toLocaleDateString([], { month: "short", day: "numeric" }) : new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <Segmented label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All" }, { value: "ran", label: "Ran" }, { value: "skipped", label: "Skipped" }, { value: "error", label: "Errors" }]} />
                <Select aria-label="Flow" value={flowId} onChange={(e) => setFlowId(e.target.value)} className="h-10 lg:max-w-[240px]">
                    <option value="">All flows</option>
                    {flows.map((f) => (
                        <option key={f._id} value={String(f._id)}>
                            {f.name}
                        </option>
                    ))}
                </Select>
                <Input aria-label="Device ID" placeholder="Device ID (sensor or target)" value={deviceInput} onChange={(e) => setDeviceInput(e.target.value)} className="h-10 font-mono lg:max-w-[240px]" />
                <Select aria-label="Limit" value={limit} onChange={(e) => setLimit(e.target.value)} className="h-10 w-auto">
                    {["100", "200", "500", "1000"].map((n) => (
                        <option key={n} value={n}>
                            Newest {n}
                        </option>
                    ))}
                </Select>
                <div className="flex gap-2 lg:ml-auto">
                    <RefreshButton onClick={() => q.reload()} loading={q.loading} updatedAt={q.updatedAt} />
                    <Button size="sm" disabled={!logs.length} onClick={() => downloadCsv("automation-runs.csv", logs.map((l) => ({ ts: l.ts, status: l.status, flowId: l.flowId, flowName: flowNames.get(String(l.flowId)), deviceId: l.deviceId, actuatorDeviceId: l.actuatorDeviceId, currentValue: l.currentValue, previousValue: l.previousValue, delta: l.delta, reason: l.reason, action: l.action, emailed: l.emailed })))}>
                        <Download className="h-4 w-4" /> CSV
                    </Button>
                </div>
            </div>

            {q.error && <ErrorState message={q.error} onRetry={() => q.reload()} />}

            {chart && (
                <Card>
                    <CardHeader title="Runs over time" subtitle={`${logs.length.toLocaleString()} runs in this view`} />
                    <div className="space-y-3 p-4 sm:p-5">
                        <Legend items={series.map((s) => ({ label: s.label, color: s.color, value: totals[s.key as keyof typeof totals] }))} />
                        <TimeBars data={chart.rows} series={series} height={180} tickFormatter={tick} labelFormatter={(v) => new Date(v).toLocaleString()} />
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden">{q.loading && !q.data ? <TableSkeleton /> : <FlowLogsTable logs={logs} flowNames={flowNames} />}</Card>
        </div>
    );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Download, LineChart as LineIcon, Table2 } from "lucide-react";
import { Button, Card, CardHeader, EmptyState, ErrorState, Segmented, Skeleton } from "@/components/ui";
import { ChartTooltip } from "@/components/charts";
import { api, errorMessage } from "@/lib/api";
import { MAX_SERIES, useChartTheme } from "@/lib/theme";
import type { Telemetry } from "@/lib/types";
import { cn, docMs, downloadCsv, formatDateTime, formatValue, humanizeKey } from "@/lib/utils";

type Range = "1h" | "6h" | "24h" | "7d" | "30d";
const RANGES: { value: Range; label: string; ms: number }[] = [
    { value: "1h", label: "1h", ms: 3_600_000 },
    { value: "6h", label: "6h", ms: 6 * 3_600_000 },
    { value: "24h", label: "24h", ms: 86_400_000 },
    { value: "7d", label: "7d", ms: 7 * 86_400_000 },
    { value: "30d", label: "30d", ms: 30 * 86_400_000 },
];
const LIMIT = 5000; // backend maximum
const MAX_RENDER_POINTS = 600;
const IGNORE = new Set(["_id", "deviceId", "createdAt", "updatedAt", "ts", "timestamp", "__ms"]);

interface Point {
    __ms: number;
    [k: string]: number;
}

/** Average numeric fields per bucket so long ranges stay fast to draw. */
function downsample(points: Point[], keys: string[], maxPoints: number): Point[] {
    if (points.length <= maxPoints) return points;
    const first = points[0].__ms;
    const span = points[points.length - 1].__ms - first || 1;
    const size = span / maxPoints;
    const out: Point[] = [];
    let bucket = -1;
    let acc: { ms: number; n: number; sums: Record<string, number>; counts: Record<string, number> } | null = null;
    const flush = () => {
        if (!acc) return;
        const p: Point = { __ms: acc.ms / acc.n };
        for (const k of keys) if (acc.counts[k]) p[k] = acc.sums[k] / acc.counts[k];
        out.push(p);
    };
    for (const p of points) {
        const b = Math.min(maxPoints - 1, Math.floor((p.__ms - first) / size));
        if (b !== bucket) {
            flush();
            bucket = b;
            acc = { ms: 0, n: 0, sums: {}, counts: {} };
        }
        acc!.ms += p.__ms;
        acc!.n += 1;
        for (const k of keys) {
            const v = p[k];
            if (typeof v === "number" && Number.isFinite(v)) {
                acc!.sums[k] = (acc!.sums[k] || 0) + v;
                acc!.counts[k] = (acc!.counts[k] || 0) + 1;
            }
        }
    }
    flush();
    return out;
}

function tickFmt(range: Range) {
    return (v: number) => {
        const d = new Date(v);
        return range === "7d" || range === "30d" ? d.toLocaleDateString([], { month: "short", day: "numeric" }) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
}

export function TelemetryChart({ deviceId }: { deviceId: string }) {
    const t = useChartTheme();
    const [range, setRange] = useState<Range>("24h");
    const [view, setView] = useState<"split" | "overlay" | "table">("split");
    const [rows, setRows] = useState<Telemetry[] | null>(null);
    const [error, setError] = useState("");
    // Selected metric -> colour slot. A metric keeps its colour while selected (colour follows the entity).
    const [picked, setPicked] = useState<Record<string, number> | null>(null);
    const seq = useRef(0);

    useEffect(() => {
        const my = ++seq.current;
        const load = async (silent: boolean) => {
            if (!silent) setRows(null);
            try {
                const ms = RANGES.find((r) => r.value === range)!.ms;
                const start = new Date(Date.now() - ms).toISOString();
                const r = await api<{ telemetry: Telemetry[] }>(`/api/admin/devices/${encodeURIComponent(deviceId)}/telemetry?start=${encodeURIComponent(start)}&limit=${LIMIT}`);
                if (my !== seq.current) return;
                setRows(r.telemetry || []);
                setError("");
            } catch (e) {
                if (my === seq.current) setError(errorMessage(e));
            }
        };
        load(false);
        const poll = range === "1h" || range === "6h" ? 10_000 : range === "24h" ? 30_000 : 0;
        if (!poll) return;
        const id = setInterval(() => document.visibilityState === "visible" && load(true), poll);
        return () => clearInterval(id);
    }, [deviceId, range]);

    const { points, keys } = useMemo(() => {
        const pts: Point[] = [];
        const ks = new Set<string>();
        for (const r of rows || []) {
            const ms = docMs(r);
            if (!ms) continue;
            const p: Point = { __ms: ms };
            for (const [k, v] of Object.entries(r)) {
                if (IGNORE.has(k)) continue;
                if (typeof v === "number" && Number.isFinite(v)) {
                    p[k] = v;
                    ks.add(k);
                }
            }
            pts.push(p);
        }
        pts.sort((a, b) => a.__ms - b.__ms);
        return { points: pts, keys: [...ks].sort() };
    }, [rows]);

    // Until the admin picks metrics, chart the first few the device reports
    const slots = useMemo(() => picked ?? Object.fromEntries(keys.slice(0, 4).map((k, i) => [k, i])), [picked, keys]);

    const selected = useMemo(() => keys.filter((k) => k in slots), [keys, slots]);
    const data = useMemo(() => downsample(points, selected, MAX_RENDER_POINTS), [points, selected]);
    const latest = points[points.length - 1];

    function toggle(k: string) {
        setPicked(() => {
            const prev = slots;
            if (k in prev) {
                const rest = { ...prev };
                delete rest[k];
                return rest;
            }
            const used = new Set(Object.values(prev));
            const free = Array.from({ length: MAX_SERIES }, (_, i) => i).find((i) => !used.has(i));
            if (free === undefined) return prev;
            return { ...prev, [k]: free };
        });
    }

    const color = (k: string) => t.series[slots[k] ?? 0];
    const fmt = tickFmt(range);
    const full = selected.length >= MAX_SERIES;
    const truncated = (rows?.length || 0) >= LIMIT;

    return (
        <Card>
            <CardHeader
                title="Telemetry"
                subtitle={rows ? `${rows.length.toLocaleString()} readings${truncated ? ` (newest ${LIMIT.toLocaleString()} in range)` : ""}${points.length > MAX_RENDER_POINTS && view !== "table" ? " · averaged for display" : ""}` : "Loading…"}
                icon={Activity}
                actions={
                    <>
                        <Segmented label="Time range" value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />
                        <Segmented
                            label="View"
                            value={view}
                            onChange={setView}
                            options={[
                                { value: "split", label: <span title="One chart per metric">Split</span> },
                                { value: "overlay", label: <span title="All metrics on one axis">Overlay</span> },
                                { value: "table", label: <Table2 className="h-3.5 w-3.5" aria-label="Table" /> },
                            ]}
                        />
                        <Button size="sm" variant="ghost" disabled={!rows?.length} onClick={() => downloadCsv(`${deviceId}-telemetry-${range}.csv`, (rows || []) as any)} title="Download CSV">
                            <Download className="h-4 w-4" />
                        </Button>
                    </>
                }
            />
            <div className="p-4 sm:p-5">
                {error ? (
                    <ErrorState message={error} />
                ) : !rows ? (
                    <Skeleton className="h-72" />
                ) : !points.length ? (
                    <EmptyState icon={LineIcon} title="No telemetry in this range" description="Try a longer range, or check that the device is online." />
                ) : (
                    <div className="space-y-4">
                        {/* Metric picker doubles as the legend (and shows latest values) */}
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Metrics">
                            {keys.map((k) => {
                                const on = k in slots;
                                return (
                                    <button
                                        key={k}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => toggle(k)}
                                        disabled={!on && full}
                                        title={!on && full ? `Up to ${MAX_SERIES} metrics at once` : undefined}
                                        className={cn(
                                            "inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition disabled:opacity-40",
                                            on ? "border-zinc-300 bg-white text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" : "border-dashed border-zinc-200 text-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:hover:text-white"
                                        )}
                                    >
                                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: on ? color(k) : "transparent", border: on ? "none" : "1px solid currentColor" }} aria-hidden />
                                        {humanizeKey(k)}
                                        {latest && typeof latest[k] === "number" && <span className="font-mono font-semibold tabular-nums">{formatValue(latest[k])}</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {view === "table" ? (
                            <RawTable rows={rows} keys={keys} />
                        ) : !selected.length ? (
                            <p className="py-10 text-center text-sm text-zinc-500">Pick a metric to chart.</p>
                        ) : view === "overlay" ? (
                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                                        <CartesianGrid stroke={t.grid} vertical={false} />
                                        <XAxis dataKey="__ms" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={fmt} tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={40} />
                                        <YAxis tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={52} domain={["auto", "auto"]} />
                                        <Tooltip content={<ChartTooltip labelFormatter={(v: number) => new Date(v).toLocaleString()} />} />
                                        {selected.map((k) => (
                                            <Line key={k} type="monotone" dataKey={k} name={humanizeKey(k)} stroke={color(k)} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} connectNulls isAnimationActive={false} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className={cn("grid gap-4", selected.length > 1 && "lg:grid-cols-2")}>
                                {selected.map((k) => (
                                    <div key={k} className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
                                        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                                            <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                                                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(k) }} aria-hidden />
                                                {humanizeKey(k)}
                                            </span>
                                            {latest && typeof latest[k] === "number" && <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">{formatValue(latest[k])}</span>}
                                        </div>
                                        <div className="h-[170px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={data} margin={{ top: 6, right: 4, left: -14, bottom: 0 }} syncId={`tele-${deviceId}`}>
                                                    <defs>
                                                        <linearGradient id={`tg-${k}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor={color(k)} stopOpacity={0.22} />
                                                            <stop offset="100%" stopColor={color(k)} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid stroke={t.grid} vertical={false} />
                                                    <XAxis dataKey="__ms" type="number" domain={["dataMin", "dataMax"]} scale="time" tickFormatter={fmt} tick={{ fill: t.axis, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
                                                    <YAxis tick={{ fill: t.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={48} domain={["auto", "auto"]} />
                                                    <Tooltip content={<ChartTooltip labelFormatter={(v: number) => new Date(v).toLocaleString()} />} />
                                                    <Area type="monotone" dataKey={k} name={humanizeKey(k)} stroke={color(k)} strokeWidth={2} fill={`url(#tg-${k})`} dot={false} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} connectNulls isAnimationActive={false} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
}

function RawTable({ rows, keys }: { rows: Telemetry[]; keys: string[] }) {
    const shown = rows.slice(0, 200); // backend returns newest first
    const extra = Array.from(new Set(shown.flatMap((r) => Object.keys(r)))).filter((k) => !IGNORE.has(k) && !keys.includes(k));
    const cols = [...keys, ...extra];
    return (
        <div className="max-h-[420px] overflow-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                        <th className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-500">Time</th>
                        {cols.map((c) => (
                            <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-500">
                                {humanizeKey(c)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono dark:divide-zinc-800">
                    {shown.map((r) => (
                        <tr key={r._id}>
                            <td className="whitespace-nowrap px-3 py-1.5 text-zinc-500">{formatDateTime(r.createdAt)}</td>
                            {cols.map((c) => (
                                <td key={c} className="whitespace-nowrap px-3 py-1.5 tabular-nums text-zinc-800 dark:text-zinc-200">
                                    {formatValue(r[c])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length > shown.length && <p className="px-3 py-2 text-xs text-zinc-500">Showing the newest 200 of {rows.length.toLocaleString()}. Download CSV for all.</p>}
        </div>
    );
}

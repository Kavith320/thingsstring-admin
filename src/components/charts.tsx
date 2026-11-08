"use client";

/**
 * Chart building blocks. Thin marks, recessive grid, one y-axis, crosshair tooltips,
 * a legend whenever there are 2+ series, categorical colours in fixed order (useChartTheme).
 */
import React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartTheme } from "@/lib/theme";
import { cn, formatValue } from "@/lib/utils";

export function ChartTooltip({ active, payload, label, labelFormatter }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="min-w-[150px] rounded-xl border border-zinc-200 bg-white/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95">
            <div className="mb-1.5 border-b border-zinc-100 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
                {labelFormatter ? labelFormatter(label) : String(label)}
            </div>
            <div className="space-y-1">
                {payload.map((p: any) => (
                    <div key={p.dataKey} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} aria-hidden />
                            {p.name}
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">{formatValue(p.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Legend({ items, className }: { items: { label: string; color: string; value?: React.ReactNode }[]; className?: string }) {
    return (
        <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-600 dark:text-zinc-400", className)}>
            {items.map((i) => (
                <li key={i.label} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
                    {i.label}
                    {i.value !== undefined && <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{i.value}</span>}
                </li>
            ))}
        </ul>
    );
}

/** Counts per time bucket; one or more stacked series. */
export function TimeBars({
    data,
    series,
    height = 200,
    tickFormatter,
    labelFormatter,
}: {
    data: Record<string, any>[];
    series: { key: string; label: string; color: string }[];
    height?: number;
    tickFormatter: (v: any) => string;
    labelFormatter?: (v: any) => string;
}) {
    const t = useChartTheme();
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap={2}>
                    <CartesianGrid stroke={t.grid} vertical={false} />
                    <XAxis dataKey="bucket" tickFormatter={tickFormatter} tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fill: t.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip cursor={{ fill: t.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }} content={<ChartTooltip labelFormatter={labelFormatter || tickFormatter} />} />
                    {series.map((s, i) => (
                        <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.label}
                            stackId="a"
                            fill={s.color}
                            stroke={t.surface}
                            strokeWidth={series.length > 1 ? 1 : 0}
                            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
                            maxBarSize={28}
                            isAnimationActive={false}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Small area chart for live metrics (health page). */
export function LiveArea({ data, dataKey, color, height = 120, unit, domain }: { data: Record<string, any>[]; dataKey: string; color: string; height?: number; unit?: string; domain?: [number | "auto", number | "auto"] }) {
    const t = useChartTheme();
    const gid = `g-${dataKey}`;
    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke={t.grid} vertical={false} />
                    <XAxis dataKey="t" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} tick={{ fill: t.axis, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
                    <YAxis domain={domain || ["auto", "auto"]} tick={{ fill: t.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={44} unit={unit} />
                    <Tooltip content={<ChartTooltip labelFormatter={(v: number) => new Date(v).toLocaleTimeString()} />} />
                    <Area type="monotone" dataKey={dataKey} name={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gid})`} isAnimationActive={false} dot={false} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Ranked horizontal bars in plain HTML (categories with counts). */
export function BarList({ items, color, empty = "No data yet", max: maxItems = 8, format = (n: number) => n.toLocaleString() }: { items: { label: string; value: number; href?: string }[]; color?: string; empty?: string; max?: number; format?: (n: number) => string }) {
    const t = useChartTheme();
    const fill = color || t.series[0];
    const sorted = [...items].sort((a, b) => b.value - a.value);
    const shown = sorted.slice(0, maxItems);
    const rest = sorted.slice(maxItems).reduce((s, i) => s + i.value, 0);
    if (rest > 0) shown.push({ label: `Other (${sorted.length - maxItems})`, value: rest });
    const max = Math.max(1, ...shown.map((i) => i.value));
    if (!shown.length) return <p className="py-6 text-center text-sm text-zinc-500">{empty}</p>;
    return (
        <ul className="space-y-2.5">
            {shown.map((i) => (
                <li key={i.label} className="group" title={`${i.label}: ${format(i.value)}`}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                        {i.href ? (
                            <a href={i.href} className="truncate font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300">
                                {i.label}
                            </a>
                        ) : (
                            <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">{i.label}</span>
                        )}
                        <span className="shrink-0 font-semibold tabular-nums text-zinc-900 dark:text-white">{format(i.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className="h-2 rounded-full transition-[width]" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: fill }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Usage meter with an optional reserved marker (email quota, memory). */
export function Meter({ value, max, reservedFrom, label, tone }: { value: number; max: number; reservedFrom?: number; label: string; tone?: "good" | "warning" | "critical" }) {
    const t = useChartTheme();
    const pct = Math.min(100, (value / Math.max(1, max)) * 100);
    const auto = pct >= 90 ? "critical" : pct >= 70 ? "warning" : "good";
    const color = t.status[tone || auto];
    return (
        <div>
            <div className="relative h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
                <div className="h-3 rounded-full transition-[width]" style={{ width: `${pct}%`, background: color }} />
                {reservedFrom !== undefined && reservedFrom < max && (
                    <div className="absolute inset-y-0 border-l-2 border-dashed border-zinc-500/70" style={{ left: `${(reservedFrom / max) * 100}%` }} title="Reserved for important emails from here" aria-hidden />
                )}
            </div>
        </div>
    );
}

/** Bucket timestamps into fixed-width bins ending now. */
export function bucketize<T>(items: T[], getMs: (i: T) => number | null, opts: { bucketMs: number; buckets: number; series?: (i: T) => string; keys?: string[] }) {
    const now = Date.now();
    const end = Math.ceil(now / opts.bucketMs) * opts.bucketMs;
    const start = end - opts.bucketMs * opts.buckets;
    const keys = opts.keys || ["count"];
    const rows = Array.from({ length: opts.buckets }, (_, i) => {
        const row: Record<string, number> = { bucket: start + i * opts.bucketMs };
        for (const k of keys) row[k] = 0;
        return row;
    });
    for (const it of items) {
        const ms = getMs(it);
        if (!ms || ms < start || ms >= end) continue;
        const idx = Math.floor((ms - start) / opts.bucketMs);
        const k = opts.series ? opts.series(it) : "count";
        if (rows[idx] && k in rows[idx]) rows[idx][k] += 1;
    }
    return rows;
}

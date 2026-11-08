"use client";

/** Shared primitives. Classes mirror the ThingsString user app (components/common/ui.tsx) so both apps look the same. */
import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Info, Inbox, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNow } from "@/lib/hooks";

/* ---------------- Button ---------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";
export function Button({
    variant = "secondary",
    size = "md",
    className,
    loading,
    children,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
    return (
        <button
            type="button"
            {...props}
            disabled={props.disabled || loading}
            className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950",
                size === "md" ? "h-11 px-4 text-sm" : "h-9 px-3 text-sm",
                variant === "primary" && "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
                variant === "secondary" && "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
                variant === "ghost" && "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                variant === "danger" && "border border-red-500/30 bg-red-500/5 text-red-600 hover:bg-red-500/10 dark:text-red-400",
                className
            )}
        >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
            {children}
        </button>
    );
}

export function IconButton({ label, className, tone, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "danger" }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            {...props}
            className={cn(
                "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
                tone === "danger" && "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400",
                className
            )}
        >
            {children}
        </button>
    );
}

/* ---------------- Fields ---------------- */
export function Field({ label, hint, error, children, className }: { label: string; hint?: React.ReactNode; error?: string; children: (id: string) => React.ReactNode; className?: string }) {
    const id = useId();
    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {label}
            </label>
            {children(id)}
            {error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
        </div>
    );
}

export const inputCls =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
    return <input ref={ref} {...props} className={cn(inputCls, "h-11", className)} />;
});

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={cn(inputCls, "min-h-24 py-2.5", className)} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className={cn(inputCls, "h-11 pr-8", className)} />;
}

export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
    return (
        <label className={cn("relative block min-w-0", className)}>
            <span className="sr-only">{placeholder}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(inputCls, "h-11 pl-9 pr-9")} />
            {value && (
                <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <X className="h-4 w-4" />
                </button>
            )}
        </label>
    );
}

/** Pill-style radio group (time ranges, tabs, filters). */
export function Segmented<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; label: string; className?: string }) {
    return (
        <div role="radiogroup" aria-label={label} className={cn("inline-flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80", className)}>
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        "h-8 flex-1 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition sm:flex-none",
                        value === o.value ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/* ---------------- Switch ---------------- */
export function Switch({ checked, onChange, disabled, label, size = "sm" }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; size?: "xs" | "sm" }) {
    const track = size === "xs" ? "h-5 w-9" : "h-6 w-11";
    const dot = size === "xs" ? "h-4 w-4" : "h-5 w-5";
    const move = size === "xs" ? "translate-x-4" : "translate-x-5";
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950",
                track,
                checked ? "bg-indigo-600 dark:bg-indigo-500" : "bg-zinc-200 dark:bg-zinc-700"
            )}
        >
            <span className={cn("rounded-full bg-white shadow transition-transform", dot, checked && move)} />
        </button>
    );
}

/* ---------------- Notice ---------------- */
export function Notice({ tone = "info", children, className, title }: { tone?: "info" | "success" | "error" | "warning"; children: React.ReactNode; className?: string; title?: string }) {
    const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? CircleAlert : tone === "warning" ? AlertTriangle : Info;
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={cn(
                "flex gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
                tone === "info" && "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
                tone === "success" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                tone === "error" && "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
                tone === "warning" && "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
                className
            )}
        >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="min-w-0">
                {title && <div className="font-semibold">{title}</div>}
                {children}
            </div>
        </div>
    );
}

/* ---------------- Badge / Pills ---------------- */
type Tone = "neutral" | "green" | "amber" | "red" | "indigo" | "blue";
const toneCls: Record<Tone, string> = {
    neutral: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    red: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400",
    indigo: "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    blue: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};
export function Badge({ tone = "neutral", children, className, dot, icon: Icon }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
    return (
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold", toneCls[tone], className)}>
            {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
            {Icon && <Icon className="h-3 w-3" aria-hidden />}
            {children}
        </span>
    );
}

/* ---------------- Cards / layout ---------------- */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...props} className={cn("rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40", className)}>
            {children}
        </div>
    );
}

export function CardHeader({ title, subtitle, icon: Icon, actions, className }: { title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; actions?: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-5", className)}>
            <div className="flex min-w-0 items-center gap-2.5">
                {Icon && <Icon className="h-4 w-4 shrink-0 text-zinc-400" />}
                <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{title}</h2>
                    {subtitle && <p className="truncate text-xs text-zinc-500">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
    return (
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">{title}</h1>
                {description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function StatTile({ label, value, icon: Icon, tone = "neutral", hint, href }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; tone?: "neutral" | "green" | "amber" | "red" | "indigo"; hint?: React.ReactNode; href?: string }) {
    const body = (
        <>
            <div
                className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                    tone === "green" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                    tone === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    tone === "red" && "bg-red-500/10 text-red-600 dark:text-red-400",
                    tone === "indigo" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
                    tone === "neutral" && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                )}
            >
                <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <div className="text-xl font-bold leading-tight tabular-nums text-zinc-900 dark:text-white">{value}</div>
                <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
                {hint && <div className="mt-0.5 truncate text-[11px] text-zinc-400">{hint}</div>}
            </div>
        </>
    );
    const cls = "flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-4";
    if (href) {
        return (
            <a href={href} className={cn(cls, "transition hover:border-zinc-300 hover:shadow-md dark:hover:border-zinc-700")}>
                {body}
            </a>
        );
    }
    return <div className={cls}>{body}</div>;
}

export function KeyValue({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className={cn("mt-0.5 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100", mono && "font-mono text-[13px]")}>{children}</dd>
        </div>
    );
}

/* ---------------- States ---------------- */
export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: React.ComponentType<{ className?: string }>; title: string; description?: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Icon className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="font-semibold text-zinc-900 dark:text-white">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <Notice tone="error" title="Couldn't load this data">
            <p>{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="mt-1 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                    <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
            )}
        </Notice>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800", className)} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-2 p-4">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
            ))}
        </div>
    );
}

/* ---------------- Table ---------------- */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("overflow-x-auto", className)}>
            <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
        </div>
    );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <th className={cn("whitespace-nowrap border-b border-zinc-100 bg-zinc-50/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400", className)}>{children}</th>;
}
export function Td({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td {...props} className={cn("border-b border-zinc-100 px-4 py-3 align-middle text-zinc-700 dark:border-zinc-800/80 dark:text-zinc-300", className)}>
            {children}
        </td>
    );
}

/** Client-side pagination for long lists. */
export function usePaged<T>(items: T[], pageSize = 25) {
    const [page, setPage] = useState(0);
    // Back to the first page when the list changes size (new filter); adjusted during render, not in an effect
    const [seenLength, setSeenLength] = useState(items.length);
    if (seenLength !== items.length) {
        setSeenLength(items.length);
        setPage(0);
    }
    const pages = Math.max(1, Math.ceil(items.length / pageSize));
    const safe = Math.min(page, pages - 1);
    return { page: safe, pages, setPage, slice: items.slice(safe * pageSize, safe * pageSize + pageSize), total: items.length, pageSize };
}

export function Pager({ page, pages, setPage, total, pageSize }: { page: number; pages: number; setPage: (p: number) => void; total: number; pageSize: number }) {
    if (total <= pageSize) return null;
    return (
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800">
            <span>
                {page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
                <IconButton label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                </IconButton>
                <span className="px-1 tabular-nums">
                    {page + 1} / {pages}
                </span>
                <IconButton label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                </IconButton>
            </div>
        </div>
    );
}

/* ---------------- Avatar ---------------- */
const AVATAR_BG = ["bg-indigo-500", "bg-emerald-600", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-cyan-600"];
export function Avatar({ name, email, size = 32 }: { name?: string; email?: string; size?: number }) {
    const label = (name || email || "?").trim();
    const initials = label.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
    const idx = [...label].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_BG.length;
    return (
        <span className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", AVATAR_BG[idx])} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
            {initials}
        </span>
    );
}

/* ---------------- Modal (bottom sheet on phones) ---------------- */
export function Modal({ open, onClose, title, description, children, footer, wide }: { open: boolean; onClose: () => void; title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
    const panelRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
        document.addEventListener("keydown", onKey);
        panelRef.current?.focus();
        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    if (!open || typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={cn(
                    "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none dark:bg-zinc-950 sm:rounded-2xl sm:border sm:border-zinc-200 dark:sm:border-zinc-800",
                    wide ? "sm:max-w-3xl" : "sm:max-w-lg"
                )}
            >
                <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-6">
                    <div className="min-w-0 py-1.5">
                        <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
                        {description && <p className="mt-0.5 text-sm text-zinc-500">{description}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t border-zinc-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800 sm:px-6">{footer}</div>}
            </div>
        </div>,
        document.body
    );
}

/* ---------------- Toasts ---------------- */
type ToastTone = "success" | "error" | "info";
interface ToastItem {
    id: number;
    tone: ToastTone;
    message: string;
}
const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ---------------- Confirm dialog ---------------- */
interface ConfirmOptions {
    title: string;
    message?: React.ReactNode;
    confirmLabel?: string;
    danger?: boolean;
    /** Make the admin type this text to enable the button (destructive actions). */
    typeToConfirm?: string;
}
const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirm, setConfirm] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
    const [typed, setTyped] = useState("");

    const toast = useCallback((message: string, tone: ToastTone = "success") => {
        const id = Date.now() + Math.random();
        setToasts((t) => [...t.slice(-3), { id, tone, message }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
    }, []);

    const ask = useCallback((o: ConfirmOptions) => {
        setTyped("");
        return new Promise<boolean>((resolve) => setConfirm({ ...o, resolve }));
    }, []);

    const close = (v: boolean) => {
        confirm?.resolve(v);
        setConfirm(null);
    };
    const blocked = !!confirm?.typeToConfirm && typed.trim() !== confirm.typeToConfirm;

    return (
        <ToastCtx.Provider value={toast}>
            <ConfirmCtx.Provider value={ask}>
                {children}
                <Modal
                    open={!!confirm}
                    onClose={() => close(false)}
                    title={confirm?.title || ""}
                    footer={
                        <>
                            <Button onClick={() => close(false)}>Cancel</Button>
                            <Button variant={confirm?.danger ? "danger" : "primary"} disabled={blocked} onClick={() => close(true)}>
                                {confirm?.confirmLabel || "Confirm"}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                        {confirm?.message}
                        {confirm?.typeToConfirm && (
                            <Field label={`Type “${confirm.typeToConfirm}” to confirm`}>
                                {(id) => (
                                    <Input
                                        id={id}
                                        value={typed}
                                        autoComplete="off"
                                        onChange={(e) => setTyped(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !blocked && close(true)}
                                    />
                                )}
                            </Field>
                        )}
                    </div>
                </Modal>
                {typeof document !== "undefined" &&
                    createPortal(
                        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6" aria-live="polite">
                            {toasts.map((t) => (
                                <div
                                    key={t.id}
                                    role={t.tone === "error" ? "alert" : "status"}
                                    className={cn(
                                        "ts-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border bg-white px-4 py-3 text-sm shadow-xl dark:bg-zinc-900",
                                        t.tone === "success" && "border-emerald-500/30",
                                        t.tone === "error" && "border-red-500/30",
                                        t.tone === "info" && "border-zinc-200 dark:border-zinc-700"
                                    )}
                                >
                                    {t.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : t.tone === "error" ? <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />}
                                    <span className="min-w-0 flex-1 break-words text-zinc-800 dark:text-zinc-100">{t.message}</span>
                                    <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="-mr-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>,
                        document.body
                    )}
            </ConfirmCtx.Provider>
        </ToastCtx.Provider>
    );
}

/** Small "updated 5s ago · refresh" control for page headers. */
export function RefreshButton({ onClick, loading, updatedAt }: { onClick: () => void; loading?: boolean; updatedAt?: number | null }) {
    const now = useNow(10_000);
    const ago = updatedAt ? Math.max(0, Math.floor((now - updatedAt) / 1000)) : null;
    return (
        <Button variant="secondary" size="sm" onClick={onClick} disabled={loading} title="Refresh">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">{ago === null ? "Refresh" : ago < 10 ? "Updated just now" : `Updated ${ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`} ago`}</span>
        </Button>
    );
}

"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuItem {
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
    hidden?: boolean;
    title?: string;
}

/** Row "⋯" menu, rendered in a portal so table overflow never clips it. */
export function RowMenu({ items, label = "Actions" }: { items: MenuItem[]; label?: string }) {
    const [open, setOpen] = useState(false);
    const btn = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useLayoutEffect(() => {
        if (!open || !btn.current) return;
        const r = btn.current.getBoundingClientRect();
        const w = 224;
        const h = panel.current?.offsetHeight || 0;
        const below = r.bottom + 4 + h < window.innerHeight;
        setPos({ top: below ? r.bottom + 4 : Math.max(8, r.top - 4 - h), left: Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const close = (e: Event) => {
            if (panel.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", key);
        window.addEventListener("scroll", () => setOpen(false), { once: true, capture: true });
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("keydown", key);
        };
    }, [open]);

    const visible = items.filter((i) => !i.hidden);
    return (
        <>
            <button
                ref={btn}
                type="button"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>
            {open &&
                createPortal(
                    <div ref={panel} role="menu" style={{ top: pos.top, left: pos.left }} className="fixed z-[55] w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                        {visible.map((i) => {
                            const Icon = i.icon;
                            return (
                                <button
                                    key={i.label}
                                    type="button"
                                    role="menuitem"
                                    disabled={i.disabled}
                                    title={i.title}
                                    onClick={() => {
                                        setOpen(false);
                                        i.onClick();
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40",
                                        i.danger ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                                    {i.label}
                                </button>
                            );
                        })}
                    </div>,
                    document.body
                )}
        </>
    );
}

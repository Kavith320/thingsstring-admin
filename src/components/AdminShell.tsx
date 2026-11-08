"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Activity,
    CalendarClock,
    HeartPulse,
    LayoutDashboard,
    LogOut,
    Menu,
    Monitor,
    Moon,
    Radio,
    Send,
    ShieldCheck,
    Sun,
    Users,
    Wrench,
    Zap,
} from "lucide-react";
import Logo from "@/components/Logo";
import { Avatar, FeedbackProvider } from "@/components/ui";
import { DirectoryProvider } from "@/components/Directory";
import { api } from "@/lib/api";
import { AdminUser, clearAuth, getStoredUser, getToken, logout, setAuth } from "@/lib/auth";
import { applyTheme, storedTheme, ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV: { section: string; items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] }[] = [
    { section: "Overview", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
    {
        section: "Manage",
        items: [
            { href: "/users", label: "Users", icon: Users },
            { href: "/devices", label: "Devices", icon: Radio },
            { href: "/schedules", label: "Schedules", icon: CalendarClock },
            { href: "/automations", label: "Automations", icon: Zap },
        ],
    },
    {
        section: "Operate",
        items: [
            { href: "/broadcast", label: "Broadcast control", icon: Send },
            { href: "/maintenance", label: "Maintenance", icon: Wrench },
            { href: "/health", label: "System health", icon: HeartPulse },
        ],
    },
    { section: "Security", items: [{ href: "/audit-logs", label: "Audit logs", icon: ShieldCheck }] },
];

const TITLES: [RegExp, string][] = [
    [/^\/users\/[^/]+/, "User"],
    [/^\/users/, "Users"],
    [/^\/devices\/[^/]+/, "Device"],
    [/^\/devices/, "Devices"],
    [/^\/schedules/, "Schedules"],
    [/^\/automations/, "Automations"],
    [/^\/broadcast/, "Broadcast control"],
    [/^\/maintenance/, "Maintenance"],
    [/^\/health/, "System health"],
    [/^\/audit-logs/, "Audit logs"],
    [/^\/$/, "Dashboard"],
];

function isActive(pathname: string, href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function Sidebar({ user, onNavigate }: { user: AdminUser | null; onNavigate?: () => void }) {
    const pathname = usePathname() || "/";
    return (
        <aside className="flex h-full w-72 flex-col border-r border-zinc-200 bg-zinc-50/50 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80 md:w-64">
            <div className="p-5 sm:p-6">
                <Link href="/" onClick={onNavigate} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-black p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <Logo strokeWidth={26} nodeRadius={28} />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate font-bold leading-tight text-zinc-900 dark:text-zinc-100">ThingsString</div>
                        <div className="flex items-center gap-1 truncate text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            <ShieldCheck className="h-3 w-3" /> Admin console
                        </div>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-4" aria-label="Admin">
                {NAV.map((group) => (
                    <div key={group.section} className="space-y-1">
                        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{group.section}</div>
                        {group.items.map((item) => {
                            const active = isActive(pathname, item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onNavigate}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                        active
                                            ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10 dark:bg-white dark:text-black"
                                            : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5", active ? "text-white dark:text-black" : "text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300")} />
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="mt-auto border-t border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <Avatar name={user?.name} email={user?.email} size={36} />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{user?.name || "Admin"}</div>
                        <div className="truncate text-xs text-zinc-500">{user?.email || ""}</div>
                    </div>
                    <button
                        type="button"
                        onClick={logout}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                        title="Log out"
                        aria-label="Log out"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}

function ThemeToggle() {
    // Rendered only after the session check (client side), so storage can be read on first render
    const [pref, setPref] = useState<ThemePref>(() => storedTheme());
    const next: Record<ThemePref, ThemePref> = { system: "light", light: "dark", dark: "system" };
    const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : Monitor;
    return (
        <button
            type="button"
            onClick={() => {
                const n = next[pref];
                setPref(n);
                applyTheme(n);
            }}
            className="grid h-10 w-10 place-items-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title={`Theme: ${pref} (click to change)`}
            aria-label={`Theme: ${pref}. Change theme`}
        >
            <Icon className="h-5 w-5" />
        </button>
    );
}

function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
    const pathname = usePathname() || "/";
    const title = TITLES.find(([re]) => re.test(pathname))?.[1] || "Admin";
    return (
        <header className="sticky top-0 z-30 h-14 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85 sm:h-16">
            <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-6">
                <div className="flex min-w-0 items-center gap-1.5">
                    <button type="button" onClick={onMenuClick} className="-ml-1 grid h-10 w-10 place-items-center rounded-xl text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden" aria-label="Open menu">
                        <Menu className="h-5 w-5" />
                    </button>
                    <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100 sm:text-lg">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="hidden items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 sm:inline-flex">
                        <Activity className="h-3.5 w-3.5" /> Admin mode
                    </span>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}

/** Protected admin layout: verifies the session is an active admin before rendering anything. */
export default function AdminShell({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname() || "/";
    // Nothing user-specific renders until `ready`, so reading storage here can't cause a hydration mismatch
    const [user, setUser] = useState<AdminUser | null>(() => getStoredUser());
    const [ready, setReady] = useState(false);
    const [drawer, setDrawer] = useState(false);

    useEffect(() => {
        const token = getToken();
        if (!token) {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
            return;
        }
        api<{ user: AdminUser }>("/api/auth/me")
            .then(({ user: me }) => {
                if (me.role !== "admin") {
                    clearAuth();
                    router.replace("/login?reason=forbidden");
                    return;
                }
                const merged = { ...getStoredUser(), ...me };
                setAuth(token, merged);
                setUser(merged);
                setReady(true);
            })
            .catch(() => {
                // api() already redirects on 401; a network error still lets the admin see what loads
                setReady(true);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!ready) {
        return (
            <div className="grid min-h-dvh place-items-center bg-zinc-50 dark:bg-zinc-950" role="status">
                <div className="flex flex-col items-center gap-3 text-sm text-zinc-500">
                    <div className="h-12 w-12 animate-pulse rounded-2xl border border-zinc-200 bg-black p-2 dark:border-zinc-800">
                        <Logo />
                    </div>
                    Checking admin session…
                </div>
            </div>
        );
    }

    return (
        <FeedbackProvider>
            <DirectoryProvider>
                <div className="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
                    <div className="relative flex min-h-dvh">
                        <div className="sticky top-0 hidden h-dvh md:block">
                            <Sidebar user={user} />
                        </div>
                        {drawer && (
                            <>
                                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setDrawer(false)} aria-hidden />
                                <div className="fixed inset-y-0 left-0 z-50 bg-white shadow-2xl dark:bg-zinc-950 md:hidden">
                                    <Sidebar user={user} onNavigate={() => setDrawer(false)} />
                                </div>
                            </>
                        )}
                        <div className="flex min-w-0 flex-1 flex-col">
                            <Topbar onMenuClick={() => setDrawer(true)} />
                            <main className="w-full min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                                <div className="mx-auto w-full max-w-7xl">{children}</div>
                            </main>
                        </div>
                    </div>
                </div>
            </DirectoryProvider>
        </FeedbackProvider>
    );
}

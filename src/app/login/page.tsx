"use client";

import { useEffect, useId, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { CircleAlert, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { api, errorMessage } from "@/lib/api";
import { AdminUser, clearAuth, getToken, setAuth } from "@/lib/auth";

const SimpleDotsBackground = dynamic(() => import("@/components/SimpleDotsBackground"), { ssr: false });

const REASONS: Record<string, string> = {
    forbidden: "That account doesn't have admin access.",
    expired: "Your session ended. Please sign in again.",
};

export default function LoginPage() {
    const router = useRouter();
    const emailId = useId();
    const pwId = useId();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [next, setNext] = useState("/");

    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const n = p.get("next");
        if (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login")) setNext(n);
        const r = p.get("reason");
        if (r && REASONS[r]) setError(REASONS[r]);
        else if (getToken()) router.replace(n || "/");
    }, [router]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim() || !password) {
            setError("Enter your email and password.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const data = await api<{ token: string; user: AdminUser & { id: string } }>("/api/auth/login", {
                method: "POST",
                body: { email: email.trim(), password },
                anonymous: true,
            });
            if (data.user?.role !== "admin") {
                clearAuth();
                setError(REASONS.forbidden);
                return;
            }
            setAuth(data.token, { ...data.user, id: String(data.user.id) });
            router.replace(next);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    const fieldCls =
        "h-11 w-full rounded-2xl border border-white/10 bg-black/35 pl-11 pr-4 text-sm text-white outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-white/15 disabled:opacity-60";

    return (
        <div className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-[#050508] via-[#07070a] to-[#0b0b12] text-white">
            <div className="absolute inset-0">
                <SimpleDotsBackground forceTheme="dark" />
                <div className="absolute inset-0 bg-black/40" />
            </div>
            <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
                <div className="ts-fade-up w-full max-w-md">
                    <div className="mb-6 text-center">
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[#17181a] p-2 shadow-lg shadow-white/5">
                            <Logo strokeWidth={24} nodeRadius={26} />
                        </div>
                        <h1 className="mt-3 text-xl font-semibold sm:text-2xl">ThingsString Admin</h1>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-gray-400">
                            <ShieldCheck className="h-4 w-4" /> Restricted to platform administrators
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/15 bg-white/[0.06] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-7" noValidate>
                        {error && (
                            <div role="alert" className="flex gap-2.5 rounded-2xl border border-red-400/25 bg-red-400/10 px-3 py-3 text-sm text-red-100">
                                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                {error}
                            </div>
                        )}
                        <div>
                            <label htmlFor={emailId} className="block text-sm font-medium text-gray-200">
                                Email
                            </label>
                            <div className="relative mt-2">
                                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
                                <input id={emailId} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className={fieldCls} placeholder="admin@example.com" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor={pwId} className="block text-sm font-medium text-gray-200">
                                Password
                            </label>
                            <div className="relative mt-2">
                                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
                                <input
                                    id={pwId}
                                    type={showPw ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className={`${fieldCls} pr-12`}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((s) => !s)}
                                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white"
                                    aria-label={showPw ? "Hide password" : "Show password"}
                                >
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
                        >
                            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/40 border-t-black" aria-hidden />}
                            Sign in
                        </button>
                        <p className="text-center text-xs text-gray-500">Every admin action is recorded in the audit log.</p>
                    </form>
                </div>
            </main>
        </div>
    );
}

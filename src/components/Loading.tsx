"use client";

import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-8 w-48 rounded-md bg-gray-200 animate-pulse" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 rounded-lg bg-gray-200 animate-pulse shadow-sm" />
                ))}
            </div>

            <div className="h-96 rounded-lg bg-gray-200 animate-pulse shadow-sm" />
        </div>
    );
}

export function TableSkeleton() {
    return (
        <div className="space-y-4">
            <div className="h-8 w-32 rounded-md bg-gray-200 animate-pulse" />
            <div className="overflow-hidden rounded-lg bg-white shadow">
                <div className="space-y-4 p-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-6 w-full rounded bg-gray-100 animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function DeviceDetailsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="h-8 w-64 rounded-md bg-gray-200 animate-pulse" />
                <div className="h-10 w-32 rounded-md bg-gray-200 animate-pulse" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="h-48 rounded-lg bg-gray-200 animate-pulse shadow-sm" />
                <div className="h-48 rounded-lg bg-gray-200 animate-pulse shadow-sm" />
            </div>

            <div className="h-64 rounded-lg bg-gray-200 animate-pulse shadow-sm" />
            <div className="h-96 rounded-lg bg-gray-200 animate-pulse shadow-sm" />
        </div>
    );
}

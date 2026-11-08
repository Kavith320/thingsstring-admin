import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
    title: { default: "ThingsString Admin", template: "%s · ThingsString Admin" },
    description: "Administration console for the ThingsString IoT platform",
    robots: { index: false, follow: false },
    icons: {
        icon: [
            { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: "/web-app-manifest-512x512.png",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <Script id="theme-init" strategy="beforeInteractive">
                    {THEME_INIT_SCRIPT}
                </Script>
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}

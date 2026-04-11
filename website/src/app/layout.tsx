import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "KillNode",
    template: "%s · KillNode",
  },
  description:
    "KillNode — Tor orchestration, proxy mesh, and neural killswitch. Privacy tooling for authorized operators.",
  metadataBase: new URL("https://github.com/Alaustrup/killnode"),
  openGraph: {
    siteName: "KillNode",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} flex min-h-screen flex-col font-sans`}
      >
        {children}
      </body>
    </html>
  );
}

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BlogNotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-mono text-7xl font-black text-neon-red/20">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Post not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That signal log entry does not exist or was removed.
        </p>
        <Link href="/blog" className="mt-8 font-mono text-xs text-neon-cyan hover:underline">
          ← Back to signal log
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

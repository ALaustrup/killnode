import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-mono text-8xl font-black text-neon-red/15">404</p>
        <h1 className="mt-4 font-display text-3xl font-bold text-white">Signal lost</h1>
        <p className="mt-4 max-w-sm text-muted-foreground">
          That page does not exist or was severed. Check the route and try again.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4 font-mono text-sm">
          <Link href="/" className="text-neon-cyan hover:underline">← Home</Link>
          <Link href="/blog" className="text-neon-cyan hover:underline">Signal log</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { NeuralLogo } from "@/components/neural-logo";
import { DownloadReleases } from "@/components/download-releases";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center px-4 py-16 text-center md:px-6">
        <NeuralLogo className="mb-10 h-36 w-36 md:h-44 md:w-44" />
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.35em] text-neon-cyan/80">
          neural privacy surface
        </p>
        <h1 className="font-display text-4xl font-black tracking-tight text-white md:text-6xl lg:text-7xl">
          <span className="text-glow-red">KILL</span>
          <span className="text-glow-cyan text-neon-cyan">NODE</span>
        </h1>
        <p className="mt-6 max-w-xl text-muted-foreground md:text-lg">
          Tor orchestration, razor-sharp UI, and an emergency neural killswitch — built for operators who
          demand control.
        </p>
        <div id="download" className="mt-12 flex flex-col items-center gap-4 scroll-mt-24">
          <DownloadReleases />
          <p className="max-w-md text-xs text-muted-foreground">
            Builds are produced by CI on tags and{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[#00FFFF]/90">
              npm run package --workspace=desktop
            </code>
            . Configure <code className="font-mono">GITHUB_REPO_*</code> in{" "}
            <code className="font-mono">website/.env</code>.
          </p>
        </div>
        <div className="mt-16 grid w-full max-w-lg gap-4 border border-neon-red/20 bg-card/40 p-6 font-mono text-xs text-muted-foreground md:grid-cols-2">
          <Link href="/blog" className="block rounded border border-neon-cyan/20 p-4 transition-colors hover:border-neon-cyan/50 hover:text-neon-cyan">
            → Signal log (blog)
          </Link>
          <Link href="/admin/login" className="block rounded border border-neon-red/20 p-4 transition-colors hover:border-neon-red/50 hover:text-neon-red">
            → Operator console
          </Link>
        </div>
      </main>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-muted-foreground">
        KillNode · Read <Link href="https://github.com/Alaustrup/killnode" className="text-neon-cyan hover:underline">LEGAL_AND_ETHICS.md</Link> before use.
      </footer>
    </>
  );
}

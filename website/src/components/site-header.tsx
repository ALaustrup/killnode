import Link from "next/link";
import { NeuralLogo } from "@/components/neural-logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-neon-red/20 bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 font-display text-lg tracking-widest text-white transition-opacity hover:opacity-90"
        >
          <NeuralLogo className="h-9 w-9 shrink-0" />
          <span className="hidden sm:inline">
            KILL<span className="text-neon-cyan">NODE</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-6">
          <Link
            href="/blog"
            className="rounded px-3 py-1.5 transition-colors hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan"
          >
            Blog
          </Link>
          <Link
            href="/#download"
            className="rounded px-3 py-1.5 transition-colors hover:text-neon-red focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-red"
          >
            Download
          </Link>
          <a
            href="https://github.com/Alaustrup/killnode"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded px-3 py-1.5 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white sm:inline-block"
            aria-label="GitHub repository"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

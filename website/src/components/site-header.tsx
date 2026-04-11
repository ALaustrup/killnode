import Link from "next/link";
import { NeuralLogo } from "@/components/neural-logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-neon-red/20 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3 font-display text-lg tracking-widest text-white">
          <NeuralLogo className="h-10 w-10" />
          <span>
            KILL<span className="text-neon-cyan">NODE</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/blog" className="transition-colors hover:text-neon-cyan">
            Blog
          </Link>
          <a
            href="#download"
            className="transition-colors hover:text-neon-red"
          >
            Download
          </a>
        </nav>
      </div>
    </header>
  );
}

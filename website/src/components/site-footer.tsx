import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-black/60 py-10 text-center text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 md:flex-row md:justify-between md:text-left">
        <p>
          <span className="font-display text-sm tracking-widest text-white">
            KILL<span className="text-neon-cyan">NODE</span>
          </span>
          {" "}· Privacy tooling for authorized operators.
        </p>
        <nav className="flex flex-wrap justify-center gap-4 md:justify-end">
          <Link href="/blog" className="transition-colors hover:text-neon-cyan">Signal log</Link>
          <Link href="/#download" className="transition-colors hover:text-neon-cyan">Download</Link>
          <a
            href="https://github.com/Alaustrup/killnode"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-neon-cyan"
          >
            GitHub
          </a>
          <Link href="/admin/login" className="transition-colors hover:text-neon-red">Operator</Link>
        </nav>
      </div>
      <p className="mt-4 px-4 text-[10px] text-muted-foreground/60">
        Read{" "}
        <a
          href="https://github.com/Alaustrup/killnode/blob/main/LEGAL_AND_ETHICS.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neon-cyan/70 underline hover:text-neon-cyan"
        >
          LEGAL_AND_ETHICS.md
        </a>{" "}
        before deployment. Lawful, authorized use only.
      </p>
    </footer>
  );
}

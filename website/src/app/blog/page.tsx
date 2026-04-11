import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { readPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Signal log",
  description: "Field notes and release context from the KillNode project.",
};

function formatDate(raw: string) {
  try {
    return new Date(raw).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return raw.slice(0, 10);
  }
}

export default async function BlogIndexPage() {
  const posts = await readPosts();
  const sorted = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-6">
        {/* Page heading */}
        <header className="mb-10 border-b border-white/8 pb-8">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.35em] text-neon-cyan/60">
            killnode · signal log
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Blog <span className="text-neon-cyan">/</span>{" "}
            <span className="text-neon-red">signal</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Field notes and release context. No RSS feed, no comments — minimal attack surface.
          </p>
        </header>

        {sorted.length === 0 ? (
          <div className="rounded border border-white/10 bg-card/30 px-6 py-12 text-center">
            <p className="text-muted-foreground">No posts yet.</p>
            <Link
              href="/admin/login"
              className="mt-4 inline-block font-mono text-xs text-neon-cyan hover:underline"
            >
              → Publish from /admin
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {sorted.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <article className="rounded border border-white/8 bg-card/20 p-5 transition-all duration-150 hover:border-neon-cyan/35 hover:bg-card/40">
                    <time className="block font-mono text-[10px] uppercase tracking-[0.25em] text-neon-cyan/60">
                      {formatDate(post.date)}
                    </time>
                    <h2 className="mt-1.5 text-lg font-semibold text-white transition-colors group-hover:text-neon-cyan">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] text-neon-cyan/50 transition-colors group-hover:text-neon-cyan">
                      Read →
                    </span>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

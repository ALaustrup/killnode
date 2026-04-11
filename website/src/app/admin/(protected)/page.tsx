import Link from "next/link";
import { readPosts } from "@/lib/posts";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

function formatDate(raw: string) {
  try {
    return new Date(raw).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return raw.slice(0, 10);
  }
}

export default async function AdminDashboardPage() {
  const posts = await readPosts();
  const sorted = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-neon-red/60">
            Operator console
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sorted.length} post{sorted.length !== 1 ? "s" : ""} · create, edit, and delete.
          </p>
        </div>
        <Button asChild variant="cta" size="default">
          <Link href="/admin/posts/new">+ New post</Link>
        </Button>
      </div>

      {/* Post list */}
      {sorted.length === 0 ? (
        <div className="mt-10 rounded border border-white/10 bg-card/20 px-6 py-12 text-center">
          <p className="text-muted-foreground">No posts yet.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/admin/posts/new">Create your first post</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {sorted.map((p) => (
            <li key={p.slug}>
              <div className="flex flex-col gap-3 rounded border border-white/8 bg-card/20 px-5 py-4 transition-colors hover:border-white/15 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{p.title}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    /blog/{p.slug}
                    <span className="ml-3 text-neon-cyan/50">{formatDate(p.date)}</span>
                  </p>
                  {p.excerpt && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/70">{p.excerpt}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer">
                      View
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/posts/${p.slug}/edit`}>Edit</Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

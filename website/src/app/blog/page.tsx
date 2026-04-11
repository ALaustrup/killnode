import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function BlogIndexPage() {
  const posts = await readPosts();
  const sorted = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Blog <span className="text-neon-cyan">/</span> <span className="text-neon-red">signal</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Field notes and release context. RSS and comments are left intentionally absent — minimal surface.
        </p>
        <ul className="mt-10 space-y-6">
          {sorted.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`}>
                <Card className="transition-colors hover:border-neon-cyan/40">
                  <CardHeader>
                    <CardTitle className="text-xl text-white">{post.title}</CardTitle>
                    <CardDescription className="font-mono text-xs text-neon-cyan/70">
                      {new Date(post.date).toISOString().slice(0, 10)}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
        {sorted.length === 0 && (
          <p className="mt-10 text-muted-foreground">No posts yet. Publish from /admin.</p>
        )}
      </main>
    </>
  );
}

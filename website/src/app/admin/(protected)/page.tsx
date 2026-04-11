import Link from "next/link";
import { readPosts } from "@/lib/posts";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const posts = await readPosts();
  const sorted = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Create, edit, and delete blog posts.</p>
        </div>
        <Button asChild variant="cta" size="default">
          <Link href="/admin/posts/new">New post</Link>
        </Button>
      </div>
      <ul className="mt-10 space-y-4">
        {sorted.map((p) => (
          <li key={p.slug}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    /blog/{p.slug} · {p.date.slice(0, 10)}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/posts/${p.slug}/edit`}>Edit</Link>
                </Button>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
      {sorted.length === 0 && (
        <p className="mt-8 text-muted-foreground">No posts. Create one to populate the blog.</p>
      )}
    </div>
  );
}

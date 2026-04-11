import { NextResponse } from "next/server";
import { requireAdminCookie } from "@/lib/api-auth";
import { readPosts, writePosts, type BlogPost } from "@/lib/posts";

type Ctx = { params: Promise<{ slug: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  if (!(await requireAdminCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug: paramSlug } = await ctx.params;
  let body: Partial<BlogPost>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const posts = await readPosts();
  const idx = posts.findIndex((p) => p.slug === paramSlug);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const cur = posts[idx];
  const nextSlug = (body.slug?.trim() || cur.slug).toLowerCase();
  if (nextSlug !== paramSlug && posts.some((p) => p.slug === nextSlug)) {
    return NextResponse.json({ error: "Slug conflict" }, { status: 409 });
  }
  const title = body.title?.trim() || cur.title;
  const updated: BlogPost = {
    slug: nextSlug,
    title,
    excerpt: body.excerpt !== undefined ? String(body.excerpt) : cur.excerpt,
    content: body.content !== undefined ? String(body.content) : cur.content,
    date: cur.date,
  };
  posts[idx] = updated;
  await writePosts(posts);
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await requireAdminCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await ctx.params;
  const posts = await readPosts();
  const next = posts.filter((p) => p.slug !== slug);
  if (next.length === posts.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writePosts(next);
  return NextResponse.json({ ok: true });
}

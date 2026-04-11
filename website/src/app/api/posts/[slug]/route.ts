import { NextResponse } from "next/server";
import { requireAdminCookie } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { type BlogPost } from "@/lib/posts";

type Ctx = { params: Promise<{ slug: string }> };

function serialize(row: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  createdAt: Date;
}): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    date: row.createdAt.toISOString(),
  };
}

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
  const cur = await prisma.post.findUnique({ where: { slug: paramSlug } });
  if (!cur) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const nextSlug = (body.slug?.trim() || cur.slug).toLowerCase();
  if (nextSlug !== paramSlug) {
    const clash = await prisma.post.findUnique({ where: { slug: nextSlug } });
    if (clash) {
      return NextResponse.json({ error: "Slug conflict" }, { status: 409 });
    }
  }
  const row = await prisma.post.update({
    where: { slug: paramSlug },
    data: {
      slug: nextSlug,
      title: body.title?.trim() || cur.title,
      excerpt: body.excerpt !== undefined ? String(body.excerpt) : cur.excerpt,
      content: body.content !== undefined ? String(body.content) : cur.content,
    },
  });
  return NextResponse.json(serialize(row));
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await requireAdminCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await ctx.params;
  try {
    await prisma.post.delete({ where: { slug } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdminCookie } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { slugify, type BlogPost } from "@/lib/posts";

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

export async function GET() {
  const rows = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows.map(serialize));
}

export async function POST(request: Request) {
  if (!(await requireAdminCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: Partial<BlogPost>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title = body.title?.trim();
  const excerpt = body.excerpt?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  const slug = (body.slug?.trim() || slugify(title)).toLowerCase();
  const exists = await prisma.post.findUnique({ where: { slug } });
  if (exists) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }
  const row = await prisma.post.create({
    data: { slug, title, excerpt, content },
  });
  return NextResponse.json(serialize(row), { status: 201 });
}

import { NextResponse } from "next/server";
import { requireAdminCookie } from "@/lib/api-auth";
import { readPosts, writePosts, slugify, type BlogPost } from "@/lib/posts";

export async function GET() {
  const posts = await readPosts();
  return NextResponse.json(posts);
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
  const posts = await readPosts();
  if (posts.some((p) => p.slug === slug)) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }
  const post: BlogPost = {
    slug,
    title,
    excerpt,
    content,
    date: new Date().toISOString(),
  };
  posts.push(post);
  await writePosts(posts);
  return NextResponse.json(post, { status: 201 });
}

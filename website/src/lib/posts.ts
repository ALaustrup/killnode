import { prisma } from "@/lib/db";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
};

function toBlogPost(row: {
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

export async function readPosts(): Promise<BlogPost[]> {
  const rows = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toBlogPost);
}

export async function getPostBySlug(slug: string) {
  const row = await prisma.post.findUnique({ where: { slug } });
  return row ? toBlogPost(row) : null;
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

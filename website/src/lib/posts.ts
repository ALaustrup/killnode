import path from "path";
import fs from "fs";
import { prisma } from "@/lib/db";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
};

type RawJsonPost = {
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

/**
 * Reads the posts.json seed file synchronously.
 * Returns an empty array if the file is missing or invalid.
 */
function readJsonPosts(): BlogPost[] {
  try {
    const jsonPath = path.join(process.cwd(), "data", "posts.json");
    if (!fs.existsSync(jsonPath)) return [];
    const raw = fs.readFileSync(jsonPath, "utf8");
    const posts = JSON.parse(raw) as RawJsonPost[];
    return posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || "",
      content: p.content || "",
      date: p.date,
    }));
  } catch {
    return [];
  }
}

/**
 * Returns all posts, merging the database with the seed JSON file.
 * Database records take precedence (admin-created/edited posts override JSON).
 * JSON posts that have not been imported into the DB yet are included as-is.
 */
export async function readPosts(): Promise<BlogPost[]> {
  const [dbRows, jsonPosts] = await Promise.all([
    prisma.post.findMany({ orderBy: { createdAt: "desc" } }),
    Promise.resolve(readJsonPosts()),
  ]);

  const merged = new Map<string, BlogPost>();

  // JSON posts are the base (lowest priority)
  for (const p of jsonPosts) {
    merged.set(p.slug, p);
  }

  // DB posts override JSON (admin edits always win)
  for (const row of dbRows) {
    merged.set(row.slug, toBlogPost(row));
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Returns a single post by slug.
 * Falls back to the JSON seed file if the slug is not in the database.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const row = await prisma.post.findUnique({ where: { slug } });
  if (row) return toBlogPost(row);

  // Fallback to JSON
  const jsonPosts = readJsonPosts();
  return jsonPosts.find((p) => p.slug === slug) ?? null;
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

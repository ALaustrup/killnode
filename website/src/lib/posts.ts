import fs from "fs/promises";
import path from "path";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
};

const dataPath = path.join(process.cwd(), "data", "posts.json");

async function ensureDataFile() {
  const dir = path.dirname(dataPath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(dataPath);
  } catch {
    await fs.writeFile(dataPath, "[]", "utf8");
  }
}

export async function readPosts(): Promise<BlogPost[]> {
  await ensureDataFile();
  const raw = await fs.readFile(dataPath, "utf8");
  try {
    const parsed = JSON.parse(raw) as BlogPost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writePosts(posts: BlogPost[]) {
  await ensureDataFile();
  await fs.writeFile(dataPath, JSON.stringify(posts, null, 2), "utf8");
}

export async function getPostBySlug(slug: string) {
  const posts = await readPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

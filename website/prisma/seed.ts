import { PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.post.count();
  if (count > 0) {
    console.log("Database already seeded.");
    return;
  }
  const jsonPath = path.join(process.cwd(), "data", "posts.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("No data/posts.json to seed from.");
    return;
  }
  const raw = fs.readFileSync(jsonPath, "utf8");
  const posts = JSON.parse(raw) as {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    date: string;
  }[];
  for (const p of posts) {
    const d = new Date(p.date);
    await prisma.post.create({
      data: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        createdAt: d,
        updatedAt: d,
      },
    });
  }
  console.log(`Seeded ${posts.length} posts.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

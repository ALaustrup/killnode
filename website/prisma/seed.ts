import { PrismaClient } from "../src/generated/prisma";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(process.cwd(), "data", "posts.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("No data/posts.json found — skipping seed.");
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

  let created = 0;
  let updated = 0;

  for (const p of posts) {
    const d = new Date(p.date);
    const result = await prisma.post.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        createdAt: d,
        updatedAt: d,
      },
      update: {
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        updatedAt: d,
      },
    });
    // Check if it was a create or update by comparing createdAt
    if (result.createdAt.getTime() === d.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`Seed complete: ${created} created, ${updated} updated out of ${posts.length} entries.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

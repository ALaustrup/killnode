import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getPostBySlug } from "@/lib/posts";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return { title: post.title, description: post.excerpt };
}

function renderMarkdownLite(text: string) {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, i) => {
    if (block.startsWith("> ")) {
      return (
        <blockquote
          key={i}
          className="my-4 border-l-2 border-neon-red pl-4 text-sm italic text-muted-foreground"
        >
          {block.replace(/^>\s?/gm, "")}
        </blockquote>
      );
    }
    const parts = block.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="my-4 text-muted-foreground leading-relaxed">
        {parts.map((part, j) => {
          const m = part.match(/^\*\*(.+)\*\*$/);
          if (m) {
            return (
              <strong key={j} className="text-foreground">
                {m[1]}
              </strong>
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </p>
    );
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <>
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <Link href="/blog" className="font-mono text-xs text-neon-cyan hover:underline">
          ← /blog
        </Link>
        <header className="mt-6 border-b border-white/10 pb-8">
          <h1 className="font-display text-3xl font-bold text-white md:text-4xl">{post.title}</h1>
          <time className="mt-2 block font-mono text-xs text-neon-red/80">{post.date}</time>
          <p className="mt-4 text-sm text-muted-foreground">{post.excerpt}</p>
        </header>
        <div className="prose prose-invert mt-8 max-w-none">{renderMarkdownLite(post.content)}</div>
      </article>
    </>
  );
}

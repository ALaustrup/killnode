import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPostBySlug } from "@/lib/posts";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt },
  };
}

function formatDate(raw: string) {
  try {
    return new Date(raw).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return raw.slice(0, 10);
  }
}

/** Lightweight markdown renderer: headings, bold, inline code, blockquotes, bullets, links, paragraphs. */
function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/\n\n+/);

  return blocks.map((block, i) => {
    // Heading
    const headingMatch = block.match(/^(#{1,3})\s+(.+)$/m);
    if (headingMatch && block.trim().startsWith("#")) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const Tag = (`h${level + 1}`) as "h2" | "h3" | "h4";
      const cls =
        level === 1
          ? "mt-8 mb-3 font-display text-2xl font-bold text-white"
          : level === 2
          ? "mt-6 mb-2 font-display text-xl font-semibold text-neon-cyan"
          : "mt-4 mb-1 font-semibold text-white";
      return <Tag key={i} className={cls}>{inlineMarkdown(content)}</Tag>;
    }

    // Blockquote
    if (block.startsWith("> ")) {
      return (
        <blockquote
          key={i}
          className="my-5 border-l-2 border-neon-red/60 pl-4 text-sm italic text-muted-foreground"
        >
          {inlineMarkdown(block.replace(/^>\s?/gm, ""))}
        </blockquote>
      );
    }

    // Bullet list
    const lines = block.split("\n");
    if (lines.every((l) => /^[-*]\s/.test(l.trim()))) {
      return (
        <ul key={i} className="my-4 ml-4 list-disc space-y-1 text-sm text-muted-foreground">
          {lines.map((l, j) => (
            <li key={j} className="leading-relaxed pl-1">
              {inlineMarkdown(l.replace(/^[-*]\s/, ""))}
            </li>
          ))}
        </ul>
      );
    }

    // Code block (fenced)
    const fenceMatch = block.match(/^```[\w]*\n?([\s\S]*?)```$/);
    if (fenceMatch) {
      return (
        <pre
          key={i}
          className="my-5 overflow-x-auto rounded border border-neon-cyan/20 bg-card/60 p-4 font-mono text-xs text-neon-cyan/90"
        >
          <code>{fenceMatch[1].trim()}</code>
        </pre>
      );
    }

    // Default paragraph
    return (
      <p key={i} className="my-4 text-sm leading-7 text-muted-foreground">
        {inlineMarkdown(block)}
      </p>
    );
  });
}

/** Inline: **bold**, `code`, [text](url) */
function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold text-foreground">{bold[1]}</strong>;

    const code = part.match(/^`(.+)`$/);
    if (code)
      return (
        <code key={i} className="rounded bg-card/60 px-1.5 py-0.5 font-mono text-[0.8em] text-neon-cyan/90">
          {code[1]}
        </code>
      );

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link)
      return (
        <a key={i} href={link[2]} className="text-neon-cyan underline hover:opacity-80" rel="noopener noreferrer">
          {link[1]}
        </a>
      );

    return <span key={i}>{part}</span>;
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <article className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-6">
        <Link href="/blog" className="inline-flex items-center gap-1 font-mono text-xs text-neon-cyan/70 transition-colors hover:text-neon-cyan">
          ← Back to signal log
        </Link>

        <header className="mt-6 border-b border-white/10 pb-8">
          <time className="block font-mono text-[10px] uppercase tracking-[0.3em] text-neon-red/70">
            {formatDate(post.date)}
          </time>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white md:text-4xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-base text-muted-foreground">{post.excerpt}</p>
          )}
        </header>

        <div className="mt-8 max-w-none">{renderMarkdown(post.content)}</div>

        <div className="mt-12 border-t border-white/8 pt-8">
          <Link href="/blog" className="font-mono text-xs text-neon-cyan/70 hover:text-neon-cyan">
            ← All posts
          </Link>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}
